import Tesseract from "tesseract.js";
import { useState, useRef, useEffect } from "react";


export default function App() {
  const scanInputRef = useRef(null);
  const inputRefs = useRef([]);
  // ===== STATE ===== //
  const [pageCount, setPageCount] = useState(1);
const SPOON_KEY = "83d56aebeba044838de5cc0e187d0850";
  const [scanImage, setScanImage] = useState(null);
  const [fullRecipePaste, setFullRecipePaste] = useState("");
const [categoryFilter, setCategoryFilter] = useState("All");
  const [addedRecipes, setAddedRecipes] = useState({});
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [showImages, setShowImages] = useState({});
  const [ingredientPaste, setIngredientPaste] = useState("");
 const [instructionPaste, setInstructionPaste] = useState("");
  const [page, setPage] = useState("new");
  const [groceryList, setGroceryList] = useState(() => {
  const saved = localStorage.getItem("groceryList");
  return saved ? JSON.parse(saved) : [];
});
const [selectedItems, setSelectedItems] = useState({});
const [checkedItems, setCheckedItems] = useState({});
  const [recipes, setRecipes] = useState(() => {
    const saved = localStorage.getItem("recipes");
    return saved ? JSON.parse(saved) : [];
});

const filtered = [...recipes].sort((a, b) => {
  if (a.favorite === b.favorite) return 0;
  return a.favorite ? -1 : 1;
});

const [apiRecipes, setApiRecipes] = useState([]);
const [search, setSearch] = useState("");

const formatMeal = (meal) => {
  const ingredients = [];

  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (ingredient && ingredient.trim() !== "") {
      ingredients.push(
        `${measure ? measure : ""} ${ingredient}`.trim()
      );
    }
  }

  return {
    name: meal.strMeal || "Unknown",
    category: meal.strCategory || "",
    ingredients,
    instructions: meal.strInstructions || "",
    image: meal.strMealThumb || ""
  };
};

useEffect(() => {
  const fetchMealDB = () => {
    if (search && search.trim() !== "") {
      return fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${search}`
      )
        .then((res) => res.json())
        .then((data) =>
          (data.meals || []).map(formatMeal)
        );
    } else {
      return Promise.all(
        Array.from({ length: 5 * pageCount }).map(() =>
          fetch("https://www.themealdb.com/api/json/v1/1/random.php")
            .then((res) => res.json())
            .then((r) => r.meals && r.meals[0])
        )
      ).then((meals) =>
        meals.filter(Boolean).map(formatMeal)
      );
    }
  };

  const fetchSpoonacular = () => {
    const query = search || "";

    return fetch(
      `https://api.spoonacular.com/recipes/complexSearch?query=${query}&number=5 * pageCount &apiKey=${SPOON_KEY}`
    )
      .then((res) => res.json())
      .then((data) =>
        (data.results || []).map((meal) => ({
          name: meal.title,
          category: "",
          ingredients: [],
          instructions: "",
          image: meal.image
        }))
      )
      .catch(() => []);
  };

  Promise.all([fetchMealDB(), fetchSpoonacular()])
    .then(([mealDB, spoon]) => {
      const combined = [...mealDB, ...spoon];

      // 🔥 remove duplicates by name
      const unique = Array.from(
        new Map(combined.map((r) => [r.name, r])).values()
      );

      if (search && search.trim() !== "") {
  // 🔍 search = replace list
  setApiRecipes(unique);
} else {
  // 🎲 load more = append
  setApiRecipes((prev) => {
    const combined = [...prev, ...unique];

    // remove duplicates again
    return Array.from(
      new Map(combined.map((r) => [r.name, r])).values()
    );
  });
}
    })
    .catch(() => setApiRecipes([]));
}, [search, pageCount]);

const [plannerRecipe, setPlannerRecipe] = useState(null);

const [weeklyPlan, setWeeklyPlan] = useState(() => {
  try {
    const saved = localStorage.getItem("weeklyPlan");
    const parsed = saved ? JSON.parse(saved) : {};

    const safePlan = {
      Monday: Array.isArray(parsed?.Monday) ? parsed.Monday : [],
      Tuesday: Array.isArray(parsed?.Tuesday) ? parsed.Tuesday : [],
      Wednesday: Array.isArray(parsed?.Wednesday) ? parsed.Wednesday : [],
      Thursday: Array.isArray(parsed?.Thursday) ? parsed.Thursday : [],
      Friday: Array.isArray(parsed?.Friday) ? parsed.Friday : [],
      Saturday: Array.isArray(parsed?.Saturday) ? parsed.Saturday : [],
      Sunday: Array.isArray(parsed?.Sunday) ? parsed.Sunday : []
    };

    return safePlan;
  } catch (e) {
    console.log("Resetting weeklyPlan");

    return {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };
  }
});

  const [showPlanner, setShowPlanner] = useState(null);
  const [openRecipe, setOpenRecipe] = useState(null);
  
const [zoomImage, setZoomImage] = useState(null);
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    ingredients: [""],
    instructions: "",
    imageIngredients: [],
    imageInstructions: [],
    favorite: false,
    category: "",
    image: ""
  });

const cleanOCRText = (text) => {
  return text
    // remove weird symbols
    .replace(/[|]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/[^a-zA-Z0-9.,:\n\-()/% ]/g, "")

    // fix spacing
    .replace(/\s+/g, " ")

    // fix line breaks
    .replace(/\n\s*\n/g, "\n")

    .trim();
};

const autoParseRecipe = () => {
  const text = fullRecipePaste;

  if (!text) return;

  const lower = text.toLowerCase();

  // detect sections
  const ingredientKeywords = [
  "ingredients",
  "what you need",
  "you will need",
  "supplies"
];

const instructionKeywords = [
  "instructions",
  "directions",
  "steps",
  "method",
  "how to make",
  "preparation",
  "alternative method",
  "alternate method",
  "cooking method",
  "oven method",
  "air fryer method"
];

  let ingredientIndex = -1;
  let instructionIndex = -1;

  ingredientKeywords.forEach((key) => {
  const idx = lower.indexOf(key);
  if (idx !== -1 && (ingredientIndex === -1 || idx < ingredientIndex)) {
    ingredientIndex = idx;
  }
});

instructionKeywords.forEach((key) => {
  const idx = lower.indexOf(key);
  if (idx !== -1 && (instructionIndex === -1 || idx < instructionIndex)) {
    instructionIndex = idx;
  }
});

  let ingredientsText = "";
  let instructionsText = "";

  // split sections
  if (ingredientIndex !== -1 && instructionIndex !== -1) {
    ingredientsText = text.slice(ingredientIndex, instructionIndex);
    instructionsText = text.slice(instructionIndex);
  } else {
    // fallback: split in half
    const midpoint = Math.floor(text.length / 2);
    ingredientsText = text.slice(0, midpoint);
    instructionsText = text.slice(midpoint);
  }

  // clean ingredients
  const ingredients = ingredientsText
    .split("\n")
    .map((line) =>
      line
        .replace(/^\d+[\.\)]\s*/, "") // remove "1." or "1)"
        .trim()
    )
    .filter((line) => {
  const l = line.toLowerCase();

  return (
    line &&
    !l.includes("preheat") &&
    !l.includes("oven") &&
    !l.includes("heat") &&
    !l.includes("ingredient") &&
    !l.includes("method") &&
    !l.includes("instruction") &&
    !l.includes("direction") &&
    !l.includes("step") &&
    !l.includes("cooking") &&
    !l.includes("preparation") &&
    !l.includes("prepare")
  );
});

  // clean instructions

  const instructions = (() => {
  let steps = [];

  if (instructionsText.includes(".")) {
    // ✅ split by sentences
    steps = instructionsText
      .replace(/\n/g, " ") // remove line breaks
      .split(".")
      .map((s) => s.trim())
      .filter((s) => s.length > 20); // remove junk
  } else {
    // fallback to lines
    steps = instructionsText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 10);
  }

  return steps
    .map((step, i) => `Step ${i + 1}: ${step}`)
    .join("\n");
})();

  // set values into your app
  setNewRecipe((prev) => ({
    ...prev,
    ingredients,
    instructions
  }));

  setIngredientPaste("");
  setInstructionPaste("");
  setFullRecipePaste("");
};

const extractRecipeName = (text) => {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 3);

  return lines[0] || "";
};

//===== OCR =====

// scan ingredient images
const scanIngredientImage = (file) => {
  Tesseract.recognize(file, "eng").then(({ data: { text } }) => {
    const lines = text.split("\n");

    const cleanLine = (line) => {
      return line
        .toLowerCase()

        // fix spacing like "2pounds"
        .replace(/(\d)([a-zA-Z])/g, "$1 $2")

        // normalize units
        .replace(/tablespoons?/g, "tbsp")
        .replace(/teaspoons?/g, "tsp")
        .replace(/pounds?/g, "lb")

        // remove weird symbols
        .replace(/[^a-z0-9\s().,/%-]/g, "")

        .trim();
    };

const fixNumbers = (line) => {
  return line

    // fix common OCR words → numbers
    .replace(/\beee\b/g, "1")
    .replace(/\beng\b/g, "1/2")

    // fix crazy large numbers before units
    .replace(/\b\d{2,}\s*(tbsp|tsp|cup|lb)\b/g, (match) => {
      if (match.includes("tbsp")) return "2 tbsp";
      if (match.includes("tsp")) return "1/2 tsp";
      if (match.includes("cup")) return "1 cup";
      if (match.includes("lb")) return "2 lb";
      return match;
    });
};

    setNewRecipe((prev) => {
      const existing = prev.ingredients.map((i) => i.toLowerCase());

      const newItems = lines
        .map(cleanLine)
        .map(fixNumbers)

        // remove junk words ONLY (safe)
        .filter((l) =>
          l &&
          l.length > 2 &&
          !l.includes("ingredient") &&
          !l.includes("method") &&
          !l.includes("direction") &&
          !l.includes("instruction")
        )

        // 🚫 REMOVE THIS LINE (it broke things)
        // .filter((l) => !l.match(/^\d{2,}\s/))

        // remove duplicates
        .filter((l) => !existing.includes(l));

      return {
        ...prev,
        ingredients: [...prev.ingredients, ...newItems]
      };
    });
  });
};

// scan instruction images
const scanInstructionImage = (file) => {
  Tesseract.recognize(file, "eng").then(({ data: { text } }) => {
    
    const cleanLine = (line) => {
      return line
        .toLowerCase()

        // remove weird symbols
        .replace(/[|;]/g, "")
        .replace(/[^a-z0-9\s.,()°/-]/g, "")

        // fix common OCR word mistakes
        .replace(/\bea\b/g, "clean")
        .replace(/\bpre-heat\b/g, "preheat")

        // remove leading numbers like "1." or "2 "
        .replace(/^\s*\d+[\.\)]?\s*/, "")

        // fix spacing
        .replace(/\s+/g, " ")

        .trim();
    };

    
      const lines = text
      .split("\n")
      .map(cleanLine)
      .filter(
      (l) =>
      l.length > 10 &&
      l !== "instructions" &&
      !l.includes("instructions")
  );

    setNewRecipe((prev) => {
      const existingSteps = prev.instructions
        ? prev.instructions.split("\n")
        : [];

      const newSteps = lines.map(
        (line, i) => `Step ${existingSteps.length + i + 1}: ${line}`
      );

      return {
        ...prev,
        instructions: [...existingSteps, ...newSteps].join("\n")
      };
    });
  });
};

const handleScanImage = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setScanImage(file);
};

const runOCR = () => {
  if (!scanImage) return;

  Tesseract.recognize(scanImage, "eng", {
    logger: (m) => console.log(m)
  }).then(({ data: { text } }) => {
    console.log("OCR RESULT:", text);

    // ONLY fill paste box (safe)
    setFullRecipePaste(text);
  });
};



  // ===== IMAGE =====
  const handleImage = (e, type) => {
  const files = Array.from(e.target.files);

  files.forEach((file) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      setNewRecipe((prev) => ({
        ...prev,
        [type]: [...(prev[type] || []), reader.result].slice(0, 4)
      }));
    };

    reader.readAsDataURL(file);
  });
};

  // ===== CATEGORY =====
  const detectCategory = (text) => {
    text = text.toLowerCase();

    if (text.includes("chicken")) return "chicken";
    if (text.includes("beef")) return "beef";
    if (text.includes("pork")) return "pork";
    if (text.includes("sausage")) return "sausage";
    if (text.includes("pasta")) return "pasta";
    if (text.includes("sugar") || text.includes("chocolate"))
      return "dessert";

    return "other";
  };

const clearRecipeForm = () => {
  setNewRecipe({
    name: "",
    ingredients: [""],
    instructions: "",
    imageIngredients: [],
    imageInstructions: [],
    favorite: false,
    category: "",
    image: ""
  });

  setIngredientPaste("");
  setInstructionPaste("");
  setFullRecipePaste("");
};

  // ===== SAVE =====
 // ===== SAVE =====
const saveRecipe = () => {
  const recipe = {
    name: newRecipe.name,
    image: newRecipe.image || "",
    ingredients: newRecipe.ingredients.join("\n"),
    instructions: newRecipe.instructions,
    category: newRecipe.category,
    favorite: false
  };

  const exists = recipes.some((rec) => rec.name === recipe.name);

  if (!exists) {
    const updated = [...recipes, recipe];
    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
  }

  setNewRecipe({
    name: "",
    image: "",
    ingredients: [""],
    instructions: "",
    imageIngredients: [],
    imageInstructions: [],
    favorite: false,
    category: ""
  });

  setIngredientPaste("");
  setInstructionPaste("");
  setFullRecipePaste("");
};
  const addSelectedToGrocery = () => {
  const items = Object.keys(selectedItems).filter(
    (item) => selectedItems[item]
  );

  const updated = [...new Set([...groceryList, ...items])];

  setGroceryList(updated);
  localStorage.setItem("groceryList", JSON.stringify(updated));

  setSelectedItems({});
};

  // ===== FAVORITE =====
  const toggleFavorite = (index) => {
    const updated = [...recipes];
    updated[index].favorite = !updated[index].favorite;

    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
  };
const deleteRecipe = (index) => {
  const updated = recipes.filter((_, i) => i !== index);
  setRecipes(updated);
  localStorage.setItem("recipes", JSON.stringify(updated));
};
  // ===== SEARCH =====
  
  // ===== PLANNER =====
  const assignToDay = (day, recipe) => {
  const updated = {
  ...(weeklyPlan || {}),
    [day]: [...(weeklyPlan[day] || []), recipe]
  };

  setWeeklyPlan(updated);
  localStorage.setItem("weeklyPlan", JSON.stringify(updated));
};

const sampleRecipes = [
  {
    name: "Spaghetti Bolognese",
    category: "Dinner",
    ingredients: [
      "Ground beef",
      "Tomato sauce",
      "Spaghetti",
      "Onion",
      "Garlic"
    ],
    instructions: "Cook beef\nAdd sauce\nBoil pasta\nCombine and serve"
  },
  {
    name: "Pancakes",
    category: "Breakfast",
    ingredients: [
      "Flour",
      "Milk",
      "Eggs",
      "Sugar",
      "Baking powder"
    ],
    instructions: "Mix ingredients\nPour batter\nFlip pancake\nServe"
  }
];

return (
  <div
    style={{
      padding: 20,
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #fff7ed, #fde68a)"
    }}
  >
    <h1>🍽 Recipe Scanner</h1>

    {/* NAV */}
    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
      <button onClick={() => setPage("discover")}>🔍Discover</button>
      <button onClick={() => setPage("new")}>➕ New Recipe</button>
      <button onClick={() => setPage("book")}>📖 Recipe Book</button>
      <button onClick={() => setPage("planner")}>📅 Planner</button>
      <button onClick={() => setPage("grocery")}>🛒 Grocery</button>
    </div>

    {/* TOP INPUT */}
    <div style={{ marginBottom: 10 }}>
      <button onClick={runOCR}>📸 Scan Recipe</button>
    </div>

    <textarea
      placeholder="Paste full recipe here..."
      value={fullRecipePaste}
      onChange={(e) => setFullRecipePaste(e.target.value)}
      style={{ width: "100%", padding: 10, marginBottom: 10 }}
    />

    <button onClick={autoParseRecipe}>⚡ Auto Fill Recipe</button>

    {/* PAGES WRAPPER */}
    <div>

      {/* NEW RECIPE */}
      {page === "new" && (
        <div style={{ background: "#fffdf5", padding: 20 }}>
          <h3>Add Recipe</h3>

          <input
            placeholder="Recipe Name"
            value={newRecipe.name}
            onChange={(e) =>
              setNewRecipe({ ...newRecipe, name: e.target.value })
            }
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;

              const reader = new FileReader();
              reader.onload = (event) => {
                setNewRecipe((prev) => ({
                  ...prev,
                  image: event.target.result
                }));
              };
              reader.readAsDataURL(file);
            }}
          />

          {newRecipe.image && (
            <img src={newRecipe.image} style={{ width: 200 }} />
          )}

{/* INGREDIENT IMAGES */}
<div style={{ marginTop: 15 }}>
  <h4>Ingredients Images</h4>

  <input
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => {
  const files = Array.from(e.target.files).slice(0, 4);

  files.forEach((file) => {
    scanIngredientImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewRecipe((prev) => ({
        ...prev,
        imageIngredients: [...prev.imageIngredients, reader.result].slice(0, 4)
      }));
    };

    reader.readAsDataURL(file);
  });
}}
  />

  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
    {newRecipe.imageIngredients.map((img, i) => (
      <div key={i} style={{ position: "relative" }}>
        <img src={img} style={{ width: 100, borderRadius: 8 }} />

        <button
          onClick={() => {
            setNewRecipe((prev) => ({
              ...prev,
              imageIngredients: prev.imageIngredients.filter((_, idx) => idx !== i)
            }));
          }}
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 20,
            height: 20,
            cursor: "pointer"
          }}
        >
          ✖
        </button>
      </div>
    ))}
  </div>
</div>

{/* INGREDIENT TEXT */}
{/* INGREDIENT INPUTS */}
<div style={{ marginTop: 10 }}>
  <h4>Ingredients</h4>

  {newRecipe.ingredients.map((ing, i) => (
    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
      <input
        type="text"
        value={ing}
        onChange={(e) => {
          const updated = [...newRecipe.ingredients];
          updated[i] = e.target.value;
          setNewRecipe({ ...newRecipe, ingredients: updated });
        }}
        style={{ flex: 1, padding: 6, borderRadius: 6 }}
      />

      {ing && (
  <button
    onClick={() => {
      const updated = newRecipe.ingredients.filter((_, idx) => idx !== i);

      setNewRecipe({
        ...newRecipe,
        ingredients: updated.length ? updated : [""]
      });
    }}
    style={{
      background: "#ef4444",
      color: "white",
      border: "none",
      borderRadius: "50%",
      width: 24,
      height: 24,
      cursor: "pointer"
    }}
  >
    ✖
  </button>
)}
    </div>
  ))}

  <button
    onClick={() =>
      setNewRecipe({
        ...newRecipe,
        ingredients: [...newRecipe.ingredients, ""]
      })
    }
    style={{
      marginTop: 5,
      padding: "6px 10px",
      borderRadius: 6,
      cursor: "pointer"
    }}
  >
    ➕ Add Ingredient
  </button>
</div>

{/* INSTRUCTION IMAGES */}
<div style={{ marginTop: 15 }}>
  <h4>Instruction Images</h4>

  <input
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => {
  const files = Array.from(e.target.files).slice(0, 4);

  files.forEach((file) => {
    scanInstructionImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewRecipe((prev) => ({
        ...prev,
        imageInstructions: [...prev.imageInstructions, reader.result].slice(0, 4)
      }));
    };

    reader.readAsDataURL(file);
  });
}}
  />

  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
    {newRecipe.imageInstructions.map((img, i) => (
      <div key={i} style={{ position: "relative" }}>
        <img src={img} style={{ width: 100, borderRadius: 8 }} />

        <button
          onClick={() => {
            setNewRecipe((prev) => ({
              ...prev,
              imageInstructions: prev.imageInstructions.filter((_, idx) => idx !== i)
            }));
          }}
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 20,
            height: 20,
            cursor: "pointer"
          }}
        >
          ✖
        </button>
      </div>
    ))}
  </div>
</div>

{/* INSTRUCTION TEXT */}
<textarea
  placeholder="Instructions..."
  value={newRecipe.instructions}
  onChange={(e) =>
    setNewRecipe({ ...newRecipe, instructions: e.target.value })
  }
  style={{
    width: "100%",
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    minHeight: 120
  }}
/>

          <button onClick={saveRecipe}>Save Recipe</button>
        </div>
      )}

      {/* RECIPE BOOK */}
      {page === "book" && (
        <div>
          <h2>📖 Recipe Book</h2>

          {filtered.map((r, i) => (
            <div key={i} style={{ background: "white", padding: 15 }}>
              <h3>
                {r.image && (
  <img
    src={r.image}
    alt={r.name}
    style={{
      width: "100%",
      maxWidth: 250,
      borderRadius: 10,
      marginTop: 10
    }}
  />
)}
                <span
  onClick={() => setActiveRecipe(r)}
  style={{ cursor: "pointer" }}
>
  ▶
</span>

                <span
                  onClick={() => {
                    const updated = recipes.map((recipe) =>
                      recipe.name === r.name
                        ? { ...recipe, favorite: !recipe.favorite }
                        : recipe
                    );
                    setRecipes(updated);
                    localStorage.setItem("recipes", JSON.stringify(updated));
                  }}
                >
                  {r.favorite ? "⭐" : "☆"}
                </span>

                <span onClick={() => setActiveRecipe(r)}>
                  {r.name}
                </span>
              </h3>

              
            </div>
          ))}
        </div>
      )}

     {/* PLANNER */}
{page === "planner" && (
  <div>
    <h2>📅 Planner</h2>

    {Object.keys(weeklyPlan || {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    }).map((day) => (
      <div key={day}>
        <strong>{day}</strong>

        {((weeklyPlan && weeklyPlan[day]) || []).map((r, i) => (
  <div
  key={i}
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 10
  }}
>
    <span>• {r.name}</span>

    <button
      onClick={() => {
        const updatedDay = weeklyPlan[day].filter((_, idx) => idx !== i);

        const updated = {
          ...weeklyPlan,
          [day]: updatedDay
        };

        setWeeklyPlan(updated);
        localStorage.setItem("weeklyPlan", JSON.stringify(updated));
      }}
      style={{
        background: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "50%",
        width: 24,
        height: 24,
        cursor: "pointer"
      }}
    >
      ✖
    </button>
  </div>
))}
      </div>
    ))}
  </div>
)}

      {/* GROCERY */}
      {page === "grocery" && (
        <div>
          <h2>🛒 Grocery</h2>

          {groceryList.map((item, i) => (
  <div
    key={i}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginBottom: 5
    }}
  >
    <input
      type="checkbox"
      checked={checkedItems[item] || false}
      onChange={() =>
        setCheckedItems((prev) => ({
          ...prev,
          [item]: !prev[item]
        }))
      }
    />

    <span
      style={{
        textDecoration: checkedItems[item] ? "line-through" : "none"
      }}
    >
      {item}
    </span>

    <button
      onClick={() => {
        const updated = groceryList.filter((_, idx) => idx !== i);
        setGroceryList(updated);
        localStorage.setItem("groceryList", JSON.stringify(updated));
      }}
      style={{
        background: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "50%",
        width: 24,
        height: 24,
        cursor: "pointer"
      }}
    >
      ✖
    </button>
  </div>
))}
        </div>
      )}

      {/* DISCOVER */}
      {page === "discover" && (
        <div>
          <h2>🔍 Discover</h2>

<input
  type="text"
  placeholder="Search recipes..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    width: "100%",
    padding: 8,
    marginBottom: 10,
    borderRadius: 8
  }}
/>

          {(apiRecipes || []).map((r, i) => {
  if (!r) return null;

  return (
    <div key={i}>
      <h3
        onClick={() => setActiveRecipe(r)}
        style={{ cursor: "pointer" }}
      >
        {r.name || "No Name"}
      </h3>

      {r.image && (
        <img
          src={r.image}
          alt={r.name}
          style={{ width: 200 }}
        />
      )}
    </div>
  );
})}

<button
  onClick={() => setPageCount((prev) => prev + 1)}
  style={{
    marginTop: 20,
    padding: "10px 15px",
    borderRadius: 8,
    cursor: "pointer"
  }}
>
  🔄 Load More
</button>

        </div>
      )}

{activeRecipe && (
  <div
    onClick={() => setActiveRecipe(null)}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "relative",
        background: "#fffdf5",
        padding: 20,
        borderRadius: 10,
        width: "90%",
        maxWidth: 600,
        maxHeight: "90%",
        overflowY: "auto"
      }}
    >
      <button
  onClick={() => setActiveRecipe(null)}
  style={{
    position: "absolute",
    top: 10,
    right: 10,
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: 28,
    height: 28,
    cursor: "pointer"
  }}
>
  ✖
</button>

<button
  onClick={() => {
    const updated = recipes.filter(
      (rec) => rec.name !== activeRecipe.name
    );

    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));

    setActiveRecipe(null);
  }}
  style={{
    marginTop: 10,
    padding: "6px 10px",
    borderRadius: 6,
    background: "#ef4444",
    color: "white",
    border: "none",
    cursor: "pointer"
  }}
>
  🗑 Delete Recipe
</button>

      <h2>{activeRecipe.name}</h2>

      <button
  onClick={() => setPlannerRecipe(activeRecipe)}
  style={{
    marginTop: 10,
    padding: "6px 10px",
    borderRadius: 6,
    background: "#8b5cf6",
    color: "white",
    border: "none",
    cursor: "pointer"
  }}
>
  📅 Add to Planner
</button>

      <button
        onClick={() => {
          const exists = recipes.some(
            (rec) => rec.name === activeRecipe.name
          );

          if (!exists) {
            const updated = [...recipes, activeRecipe];
            setRecipes(updated);
            localStorage.setItem("recipes", JSON.stringify(updated));
          }
        }}
      >
        ➕ Add to My Recipes
      </button>



<button
  onClick={() => {
    const selected = Object.keys(selectedItems).filter(
      (item) => selectedItems[item]
    );

    const updated = [...new Set([...groceryList, ...selected])];

    setGroceryList(updated);
    localStorage.setItem("groceryList", JSON.stringify(updated));

    setSelectedItems({});
  }}
  style={{
    marginBottom: 10,
    padding: "6px 10px",
    borderRadius: 6,
    background: "#3b82f6",
    color: "white",
    border: "none",
    cursor: "pointer"
  }}
>
  ➕ Add Selected Ingredients
</button>

      <div>
        <strong>Ingredients:</strong>
        {(Array.isArray(activeRecipe.ingredients)
  ? activeRecipe.ingredients
  : activeRecipe.ingredients?.split("\n") || []
).map((item, i) => (
  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <input
      type="checkbox"
      checked={selectedItems[item] || false}
      onChange={() =>
        setSelectedItems((prev) => ({
          ...prev,
          [item]: !prev[item]
        }))
      }
    />

    <span>• {item}</span>
  </div>
))}
      </div>

      <div>
        <strong>Instructions:</strong>
        {(activeRecipe.instructions || "")
          .split("\n")
          .map((step, i) => (
            <div key={i}>{step}</div>
          ))}
      </div>
    </div>
  </div>
)}

    </div>
  </div>
);
}