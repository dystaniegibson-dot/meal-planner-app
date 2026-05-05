import Tesseract from "tesseract.js";
import { useState, useRef, useEffect } from "react";


export default function App() {
  const scanInputRef = useRef(null);
  const inputRefs = useRef([]);
  // ===== STATE ===== //

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

useEffect(() => {
  fetch("https://www.themealdb.com/api/json/v1/1/search.php?s=chicken")
    .then((res) => res.json())
    .then((data) => {
      if (data.meals) {
        const formatted = data.meals.map((meal) => {
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
    name: meal.strMeal,
    category: meal.strCategory,
    ingredients,
    instructions: meal.strInstructions,
    image: meal.strMealThumb
  };
});

        setApiRecipes(formatted);
      }
    });
}, []);

const [plannerRecipe, setPlannerRecipe] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(() => {
    const saved = localStorage.getItem("weeklyPlan");
    return saved
      ? JSON.parse(saved)
      : {
          Monday: null,
          Tuesday: null,
          Wednesday: null,
          Thursday: null,
          Friday: null,
          Saturday: null,
          Sunday: null
        };
  });

  const [showPlanner, setShowPlanner] = useState(null);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [search, setSearch] = useState("");
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
const instructions = instructionsText
  .split("\n")
  .map((line) =>
    line
      .replace(/^\d+[\.\)]\s*/, "")
      .trim()
  )
  .filter((line) => {
    const l = line.toLowerCase();

    return (
      line &&
      !l.includes("ingredient") &&
      !l.includes("method") &&
      !l.includes("instruction") &&
      !l.includes("direction") &&
      !l.includes("step") &&
      !l.includes("cooking") &&
      !l.includes("preparation") &&
      !l.includes("prepare")
    );
  })  
  .map((step, i) => `Step ${i + 1}: ${step}`)
  .join("\n");

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
 const saveRecipe = () => {
  const recipe = {
    ...newRecipe,
    ingredients: newRecipe.ingredients.join("\n")
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
    const updated = { ...weeklyPlan, [day]: recipe };
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

    {/* NEW RECIPE */}

{/* ====== UI ====== */}
<div style={{ marginBottom: 10 }}>
 

  <button
    onClick={runOCR}
    style={{
      marginLeft: 10,
      padding: "6px 10px",
      borderRadius: 6
    }}
  >
    📸 Scan Recipe
  </button>
</div>

<textarea
  placeholder="Paste full recipe here..."
  value={fullRecipePaste}
  onChange={(e) => setFullRecipePaste(e.target.value)}
  style={{
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    minHeight: 120
  }}
/>

<button
  onClick={autoParseRecipe}
  style={{
    marginBottom: 15,
    padding: "8px 12px",
    borderRadius: 8
  }}
>
  ⚡ Auto Fill Recipe
</button>

    {page === "new" && (
      <div style={{ background: "#fffdf5", padding: 20, borderRadius: 16 }}>
        <h3>Add Recipe</h3>

        <input
          placeholder="Recipe Name"
          value={newRecipe.name}
          onChange={(e) =>
            setNewRecipe({ ...newRecipe, name: e.target.value })
          }
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

<input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files[0];

    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file);

    const reader = new FileReader();

    reader.onload = (event) => {
      console.log("Image loaded:", event.target.result);

      setNewRecipe((prev) => ({
        ...prev,
        image: event.target.result
      }));
    };

    reader.onerror = (err) => {
      console.error("FileReader error:", err);
    };

    reader.readAsDataURL(file);
  }}
  style={{ marginBottom: 10 }}
/>

{newRecipe.image && (
  <div style={{ marginTop: 10 }}>
    <div style={{ position: "relative", width: 200 }}>
      <img
        src={newRecipe.image}
        alt="recipe"
        style={{
          width: "100%",
          borderRadius: 10
        }}
      />

      <button
        onClick={() =>
          setNewRecipe((prev) => ({
            ...prev,
            image: ""
          }))
        }
        style={{
          position: "absolute",
          top: -10,
          right: -10,
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
    </div>
  </div>
)}

      {/* INGREDIENT IMAGE UPLOAD */}
<strong>Scan Ingredient Images (max 4)</strong>

<input
  type="file"
  accept="image/*"
  multiple
  onChange={(e) => {
    const files = Array.from(e.target.files);

    if (newRecipe.imageIngredients.length + files.length > 4) {
      alert("Max 4 ingredient images");
      return;
    }

    files.forEach((file) => {
      scanIngredientImage(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRecipe((prev) => ({
          ...prev,
          imageIngredients: [...prev.imageIngredients, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  }}
/>

{/* INGREDIENT IMAGE PREVIEW + DELETE */}
<div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
  {newRecipe.imageIngredients.map((img, i) => (
    <div key={i} style={{ position: "relative" }}>
      <img
        src={img}
        style={{ width: 100, borderRadius: 8 }}
      />

      <button
        onClick={() => {
          const updated = newRecipe.imageIngredients.filter((_, idx) => idx !== i);
          setNewRecipe({ ...newRecipe, imageIngredients: updated });
        }}
        style={{
          position: "absolute",
          top: -5,
          right: -5,
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

<strong>Ingredients</strong>

<textarea
  placeholder="Paste ingredients here..."
  value={ingredientPaste}
  onChange={(e) => setIngredientPaste(e.target.value)}
  style={{
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8
  }}
  onBlur={(e) => {
    let text = e.target.value;

    let lines = text.split("\n");

    if (lines.length === 1) {
      lines = text.split(",");
    }

    lines = lines
      .map((l) => l.trim())
      .filter((l) => l !== "");

    if (lines.length > 0) {
      setNewRecipe((prev) => ({
        ...prev,
        ingredients: lines
      }));
    }
  }}
/>

{newRecipe.ingredients.map((item, index) => (
  <input
  key={index}
  value={item}
  placeholder="Enter ingredient"
  onChange={(e) => {
    const updated = [...newRecipe.ingredients];
    updated[index] = e.target.value;
    setNewRecipe({
      ...newRecipe,
      ingredients: updated
    });
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const updated = [...newRecipe.ingredients, ""];
      setNewRecipe({
        ...newRecipe,
        ingredients: updated
      });

      // optional: move focus to next input
      setTimeout(() => {
        const inputs = document.querySelectorAll("input");
        inputs[inputs.length - 1]?.focus();
      }, 0);
    }
  }}
  style={{
    display: "block",
    width: "100%",
    padding: 8,
    marginBottom: 5
  }}
/>
))}

{/* INSTRUCTIONS */}

{/* INSTRUCTION IMAGE UPLOAD */}
<strong>Scan Instruction Images (max 4)</strong>

<input
  type="file"
  accept="image/*"
  multiple
  onChange={(e) => {
    const files = Array.from(e.target.files);

    if (newRecipe.imageInstructions.length + files.length > 4) {
      alert("Max 4 instruction images");
      return;
    }

    files.forEach((file) => {
      scanInstructionImage(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRecipe((prev) => ({
          ...prev,
          imageInstructions: [...prev.imageInstructions, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  }}
/>

{/* INSTRUCTION IMAGE PREVIEW + DELETE */}
<div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
  {newRecipe.imageInstructions.map((img, i) => (
    <div key={i} style={{ position: "relative" }}>
      <img
        src={img}
        style={{ width: 100, borderRadius: 8 }}
      />

      <button
        onClick={() => {
          const updated = newRecipe.imageInstructions.filter((_, idx) => idx !== i);
          setNewRecipe({ ...newRecipe, imageInstructions: updated });
        }}
        style={{
          position: "absolute",
          top: -5,
          right: -5,
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

<strong style={{ marginTop: 15, display: "block" }}>
  Instructions
</strong>

<textarea
  placeholder="Paste instructions here..."
  value={instructionPaste}
  onChange={(e) => setInstructionPaste(e.target.value)}
  style={{
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8
  }}
  onBlur={(e) => {
    const lines = e.target.value
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "");

    if (lines.length > 0) {
      const formatted = lines
        .map((line, i) => `Step ${i + 1}: ${line}`)
        .join("\n");

      setNewRecipe((prev) => ({
        ...prev,
        instructions: formatted
      }));
    }
  }}
/>

<textarea
  value={newRecipe.instructions}
  onChange={(e) =>
    setNewRecipe({ ...newRecipe, instructions: e.target.value })
  }
  style={{
    width: "100%",
    padding: 10,
    minHeight: 120
  }}
/>

        <button onClick={saveRecipe}>Save Recipe</button>
        <button
  onClick={clearRecipeForm}
  style={{
    marginLeft: 10,
    padding: "8px 12px",
    borderRadius: 8,
    background: "#ef4444",
    color: "white"
  }}
>
  🧹 Clear
</button>
      </div>
    )}

    {/* RECIPE BOOK */}
    {page === "book" && (
      <div>
        <h2>📖 Recipe Book</h2>

        {filtered.map((r, i) => (
          <div key={i} style={{ background: "white", padding: 15 }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>

  {/* Expand toggle */}
  <span
    onClick={() =>
      setOpenRecipe(openRecipe === i ? null : i)
    }
    style={{ cursor: "pointer" }}
  >
    {openRecipe === i ? "▼" : "▶"}
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
  style={{
    cursor: "pointer",
    fontSize: 18
  }}
>
  {r.favorite ? "⭐" : "☆"}
</span>

  {/* Recipe name → popup */}
  <span
    onClick={() => setActiveRecipe(r)}
    style={{ cursor: "pointer" }}
  >
    {r.name}
  </span>

</h3>

{r.image && (
  <img
    src={r.image}
    alt={r.name}
    style={{
      width: "100%",
      maxWidth: 300,
      borderRadius: 12,
      marginTop: 10
    }}
  />
)}


            {openRecipe === i && (
              <div>
                <p>{r.category}</p>

                {(Array.isArray(r.ingredients)
  ? r.ingredients
  : r.ingredients?.split("\n") || []
).map((item, idx) => (
  <div key={idx}>
    <label>
      <input
        type="checkbox"
        checked={!!selectedItems[item]}
        onChange={() =>
          setSelectedItems((prev) => ({
            ...prev,
            [item]: !prev[item]
          }))
        }
      />
      {item}
    </label>
  </div>
))}

                <p>{r.instructions}</p>

                <button onClick={addSelectedToGrocery}>
                  Add to Grocery
                </button>

                <button onClick={() => setPlannerRecipe(r)}>
                  Add to Planner
                </button>

                <button onClick={() => deleteRecipe(i)}>
                  Delete
                </button>

                {plannerRecipe === r && (
                  <div>
                    {Object.keys(weeklyPlan).map((day) => (
                      <button
                        key={day}
                        onClick={() => {
                          assignToDay(day, r);
                          setPlannerRecipe(null);
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )}

    {/* PLANNER */}
    {page === "planner" && (
      <div>
        <h2>📅 Weekly Plan</h2>
        {Object.keys(weeklyPlan).map((day) => (
          <div key={day}>
  <strong>{day}:</strong>{" "}

  <span
    onClick={() => setActiveRecipe(weeklyPlan[day])}
    style={{ cursor: "pointer" }}
  >
    {weeklyPlan[day]?.name || "No meal planned"}
  </span>

  {weeklyPlan[day] && (
    <button
      onClick={() =>
        setWeeklyPlan((prev) => ({
          ...prev,
          [day]: null
        }))
      }
      style={{
        marginLeft: 10,
        background: "#ef4444",
        color: "white",
        borderRadius: 6,
        padding: "2px 6px"
      }}
    >
      ❌
    </button>
  )}
</div>
        ))}
      </div>
    )}

    {/* GROCERY */}
    {page === "grocery" && (
      <div>
        <h2>🛒 Grocery List</h2>
        {groceryList.map((item, i) => (
  <div
    key={i}
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 5
    }}
  >
    <span>{item}</span>

    <button
      onClick={() => {
        const updated = groceryList.filter((_, idx) => idx !== i);
        setGroceryList(updated);
        localStorage.setItem("groceryList", JSON.stringify(updated));
      }}
      style={{
        background: "#ef4444",
        color: "white",
        borderRadius: 6,
        padding: "2px 8px"
      }}
    >
      ❌
    </button>
  </div>
))}
      </div>
    )}

    {/* DISCOVER */}
    {page === "discover" && (
      <div>
        <h2>🔍 Discover Recipes</h2>

        {apiRecipes.map((r, i) => (
          <div key={i}>
           <h3
  onClick={() => setActiveRecipe(r)}
  style={{
    cursor: "pointer",
    color: "#2563eb",
    textDecoration: "underline"
  }}
>
  {r.name}
</h3>

<img
  src={r.image}
  alt={r.name}
  style={{
    width: "100%",
    maxWidth: 300,
    borderRadius: 12,
    marginTop: 10
  }}
/>

          </div>
        ))}
      </div>
    )}

{/* POPUPS */}
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
        background: "#fffdf5",
        padding: 25,
        borderRadius: 20,
        width: "90%",
        maxWidth: 650,
        maxHeight: "90%",
        overflowY: "auto",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
      }}
    >
      <button
        onClick={() => setActiveRecipe(null)}
        style={{
          float: "right",
          background: "#ef4444",
          color: "white",
          borderRadius: 6,
          padding: "4px 8px"
        }}
      >
        ✖
      </button>

      <h2>{activeRecipe.name}</h2>
      <p><strong>Category:</strong> {activeRecipe.category}</p>

<button
  onClick={() => {
    const exists = recipes.some(
      (rec) => rec.name === activeRecipe.name
    );

    if (!exists) {
      const updated = [...recipes, activeRecipe];
      setRecipes(updated);
      localStorage.setItem(
        "recipes",
        JSON.stringify(updated)
      );
    }

    setAddedRecipes((prev) => ({
      ...prev,
      [activeRecipe.name]: true
    }));
  }}
  style={{
    marginTop: 10,
    padding: "8px 12px",
    borderRadius: 8,
    background: addedRecipes[activeRecipe.name]
      ? "#10b981"
      : "#e5e7eb",
    color: addedRecipes[activeRecipe.name]
      ? "white"
      : "black"
  }}
>
  {addedRecipes[activeRecipe.name]
    ? "✅ Added"
    : "➕ Add to My Recipes"}
</button>

      <div>
        <strong>Ingredients:</strong>
        {(Array.isArray(activeRecipe.ingredients)
          ? activeRecipe.ingredients
          : activeRecipe.ingredients?.split("\n") || []
        ).map((item, idx) => (
          <div key={idx}>• {item}</div>
        ))}
      </div>

      <div style={{ marginTop: 15 }}>
        <strong>Instructions:</strong>
        {(activeRecipe.instructions || "")
          .split("\n")
          .map((step, idx) => (
            <div key={idx}>
              {idx + 1}. {step}
            </div>
          ))}
      </div>
    </div>
  </div>
)}
    </div>
);
}

