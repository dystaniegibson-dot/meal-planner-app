import Tesseract from "tesseract.js";
import { useState, useRef, useEffect } from "react";
import fruitBg from "./assets/fruitbg3.jpg";

export default function App() {
  const scanInputRef = useRef(null);
  const inputRefs = useRef([]);
  // ===== STATE ===== //
  const [plannerSearch, setPlannerSearch] =
  useState("");
  const [plannerFeedback, setPlannerFeedback] = useState("");
  const [openDay, setOpenDay] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const instructionRefs = useRef([]);
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
  const [page, setPage] = useState("home");
  const [manualGroceryItem, setManualGroceryItem] = useState("");
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

const filtered = [...recipes]
  .sort((a, b) => {
    // favorites first
    if (a.favorite !== b.favorite) {
      return a.favorite ? -1 : 1;
    }

    // then alphabetical
    return a.name.localeCompare(b.name);
  });

const [apiRecipes, setApiRecipes] = useState([]);
const [search, setSearch] = useState("");
const [recipeSearch, setRecipeSearch] = useState("");

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
    instructions: meal.strInstructions
  ? meal.strInstructions.split("\n")
  : [],
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
    instructions: [""],
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
  .map((line) => line.trim())
  .filter(
    (line) =>
      line &&
      !line.toLowerCase().includes("ingredients")
  );

const safeIngredients =
  ingredients.length > 0 ? ingredients : [""];

  // clean instructions

  const instructions = (() => {
  let steps = [];

  if (instructionsText.includes(".")) {
    // ✅ split by sentences
    steps = instructionsText
      .replace(/\n/g, " ")
      .replace(/instructions:?/gi, "") // remove line breaks
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

  return steps;
    
    
})();

  // set values into your app
  setNewRecipe((prev) => ({
  ...prev,
  name: extractRecipeName(text),
  ingredients: safeIngredients,
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
      const existingSteps = Array.isArray(prev.instructions)
  ? prev.instructions
  : prev.instructions?.split("\n") || [];

      const newSteps = lines.map(
        (line, i) => `Step ${existingSteps.length + i + 1}: ${line}`
      );

      return {
        ...prev,
        instructions: [...existingSteps, ...newSteps]
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
    instructions:[""],
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

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

  
 // ===== SAVE =====
const saveRecipe = () => {
  const recipe = {
    name: newRecipe.name,
    image: newRecipe.image || "",
   ingredients: newRecipe.ingredients,
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
    instructions: [""],
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

document.body.style.margin = "0";
document.body.style.backgroundColor = "#fff8f3";
document.body.style.backgroundImage = `url(${fruitBg})`;
document.body.style.backgroundRepeat = "no-repeat";
document.body.style.backgroundSize = "cover";
document.body.style.backgroundPosition = "center";

return (
  <div
    style={{
      color: "#222",
      padding: 20,
      boxSizing: "border-box",
      margin: 0,
      minHeight: "100vh",
      overflowX: "hidden",
      background: "#fff8f3",
      backgroundImage:
      "url('https://www.transparenttextures.com/patterns/flowers.png')",
      }}
  >
    <h1
  style={{
    color: "#7c4a45",
    marginBottom: 24,
    fontSize: 36
  }}
>
  🍓 Cozy Recipe Book
</h1>

    {/* NAV */}
    <div style={{
  display: "flex",
  flexDirection: "column",
  gap: 18,
  width: 230,
  background: "#f4d9d4",
  padding: 26,
  borderRadius: 32,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  height: "calc(100vh - 40px)",
  position: "fixed",
  left: 20,
  top: 20
}}>
  <div
  style={{
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#7c4a45",
    textAlign: "center"
  }}
>
  🍓 My Recipes
</div>
<button
  onClick={() => setPage("home")}
  style={{
    background:
      page === "home"
        ? "#e58b88"
        : "#ffffff",
    border: "none",
    borderRadius: 14,
    padding:
      page === "home"
        ? "14px 18px"
        : "12px 16px",
    textAlign: "left",
    cursor: "pointer",
    transition: "0.2s",
    fontSize: 16,
    fontWeight: "bold",
    color: "#2f2f2f",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
  }}
>
  🏠 Home
</button>
      <button
  onClick={() => setPage("discover")}
  style={{
    background:
  page === "discover"
    ? "#e58b88"
    : "#ffffff",
    fontWeight: "bold",
    color: "#2f2f2f",
boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    border: "none",
    borderRadius: 14,
   padding:
  page === "discover"
    ? "14px 18px"
    : "12px 16px",
    textAlign: "left",
    cursor: "pointer",
    transition: "0.2s",
    fontSize: 16
  }}
>
  🔍 Discover
</button>
      <button
  onClick={() => setPage("new")}
  style={{
   background:
  page === "new"
    ? "#e58b88"
    : "#ffffff",
    border: "none",
    borderRadius: 14,
    padding:
  page === "new"
    ? "14px 18px"
    : "12px 16px",
    textAlign: "left",
    cursor: "pointer",
    transition: "0.2s",
    fontSize: 16,
    fontWeight: "bold",
    color: "#2f2f2f",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
  }}
>
  ➕ New Recipe
</button>
      <button
  onClick={() => setPage("book")}
  style={{
    background:
  page === "book"
    ? "#e58b88"
    : "#ffffff",
    border: "none",
    borderRadius: 14,
    padding:
  page === "book"
    ? "14px 18px"
    : "12px 16px",
    textAlign: "left",
    cursor: "pointer",
    transition: "0.2s",
    fontSize: 16,
    fontWeight: "bold",
    color: "#2f2f2f",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
  }}
>
  📖 Recipe Book
</button>
      <button
  onClick={() => setPage("planner")}
  style={{
   background:
  page === "planner"
    ? "#e58b88"
    : "#ffffff",
    border: "none",
    borderRadius: 14,
   padding:
  page === "planner"
    ? "14px 18px"
    : "12px 16px",
    textAlign: "left",
    cursor: "pointer",
    transition: "0.2s",
    fontSize: 16,
    fontWeight: "bold",
    color: "#2f2f2f",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
  }}
>
  📅 Planner
</button>
      <button
  onClick={() => setPage("grocery")}
  style={{
   background:
  page === "grocery"
    ? "#e58b88"
    : "#ffffff",
    border: "none",
    borderRadius: 14,
   padding:
  page === "grocery"
    ? "14px 18px"
    : "12px 16px",
    textAlign: "left",
    cursor: "pointer",
    transition: "0.2s",
    fontSize: 16,
    fontWeight: "bold",
    color: "#2f2f2f",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
  }}
>
  🛒 Grocery
</button>
    </div>

    {/* TOP INPUT */}
    

    

    {/* PAGES WRAPPER */}
    <div
  style={{
  marginLeft: 260,
  padding: 40,
  maxWidth: 1400,
  margin: "0 auto",
  marginTop: 20,
  marginBottom: 20,
  background: "rgba(255,255,255,0.94)",
  borderRadius: 36,
  boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
  minHeight: "100vh",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,255,255,0.5)"
}}
>

{/* HOME */}
{page === "home" && (
  <div>
    <h1
      style={{
        color: "#7c4a45",
        fontSize: 42,
        marginBottom: 10
      }}
    >
      Welcome back! 🍓
    </h1>

    <p
      style={{
        fontSize: 18,
        color: "#5b4b4b",
        marginBottom: 30
      }}
    >
      Here's what's cooking today.
    </p>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 20
      }}
    >
      <div
  style={{
    background: "#fff8f6",
    padding: 18,
    borderRadius: 24,
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    display: "flex",
    alignItems: "center",
    gap: 18
  }}
>
  <div
    style={{
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "#ffe4ea",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 28
    }}
  >
    ⭐
  </div>

  <div>
    <h3
      style={{
        color: "#7c4a45",
        margin: 0
      }}
    >
      Favorites
    </h3>

    <h1
      style={{
        margin: 0,
        color: "#2f2f2f"
      }}
    >
      {
        recipes.filter((r) => r.favorite)
          .length
      }
    </h1>
  </div>
</div>

      <div
  style={{
    background: "#fff8f6",
    padding: 22,
    borderRadius: 24,
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    display: "flex",
    alignItems: "center",
    gap: 18
  }}
>
  <div
    style={{
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "#e8ecff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 28
    }}
  >
    📖
  </div>

  <div>
    <h3
      style={{
        color: "#7c4a45",
        margin: 0
      }}
    >
      Recipes
    </h3>

    <h1
      style={{
        margin: 0,
        color: "#2f2f2f"
      }}
    >
      {recipes.length}
    </h1>
  </div>
</div>

      <div
  style={{
    background: "#fff8f6",
    padding: 22,
    borderRadius: 24,
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    display: "flex",
    alignItems: "center",
    gap: 18
  }}
>
  <div
    style={{
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "#fff0d9",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 28
    }}
  >
    🛒
  </div>

  <div>
    <h3
      style={{
        color: "#7c4a45",
        margin: 0
      }}
    >
      Grocery Items
    </h3>

    <h1
      style={{
        margin: 0,
        color: "#2f2f2f"
      }}
    >
      {groceryList.length}
    </h1>
  </div>
</div>
    </div>
    <div
  style={{
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 24,
    marginTop: 40
  }}
>
    <div style={{ marginTop: 40 }}>
  <h2
    style={{
      color: "#7c4a45",
      marginBottom: 20
    }}
  >
    🍓 Featured Recipes
  </h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 20
    }}
  >
    {apiRecipes.slice(0, 4).map((r, i) => (
      <div
        key={i}
        onClick={() => setActiveRecipe(r)}
        style={{
          background: "#fff8f6",
          borderRadius: 24,
          overflow: "hidden",
          height: 320,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          cursor: "pointer",
          boxShadow:
            "0 4px 12px rgba(0,0,0,0.06)"
        }}
      >
        {r.image && (
          <img
            src={r.image}
            alt={r.name}
            style={{
              width: "100%",
              height: 140,
              objectFit: "cover"
            }}
          />
        )}

        <div style={{ padding: 16 }}>
          <h3
            style={{
              color: "#7c4a45"
            }}
          >
            {r.name}
          </h3>

          <p
            style={{
              color: "#777",
              fontSize: 14
            }}
          >
            {r.category || "Recipe"}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>
<div style={{ marginTop: 40 }}>
  <h2
    style={{
      color: "#7c4a45",
      marginBottom: 20
    }}
  >
    📅 Planned Meals This Week
  </h2>

  <div
    style={{
      background: "#fff8f6",
      borderRadius: 24,
      padding: 20,
      boxShadow: "0 4px 12px rgba(0,0,0,0.06)"
    }}
  >
    {Object.keys(weeklyPlan).map((day) => (
      <div
        key={day}
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "10px 0",
          borderBottom:
            "1px solid rgba(0,0,0,0.05)"
        }}
      >
        <strong>{day}</strong>
        <span>
  {(weeklyPlan[day] || []).length > 0
    ? weeklyPlan[day][0].name
    : "No meal planned"}
</span>
      </div>
    ))}
    </div>
</div>
</div>
</div>
)}

        

      {/* NEW RECIPE */}
      {page === "new" && (
        <div style={{ background: "#fffdf5", padding: 20 }}>
          <h3>Add Recipe</h3>

          <textarea
      placeholder="Paste full recipe here..."
      value={fullRecipePaste}
      onChange={(e) => setFullRecipePaste(e.target.value)}
      style={{ width: "100%", padding: 10, marginBottom: 10 }}
    />

    <button
  onClick={autoParseRecipe}
  style={{
    display: "block",
    marginBottom: 10,
    padding: "8px 12px",
    borderRadius: 14,
    cursor: "pointer",
    background: "#e58b88",
    color: "white",
    border: "none"
  }}
>
  ⚡ Auto Fill Recipe
</button>

          <input
            placeholder="Recipe Name"
            value={newRecipe.name}
            onChange={(e) =>
              setNewRecipe({ ...newRecipe, name: e.target.value })
            }
            style={{
            border: "1px solid #f3d6d0",
            background: "#3a3a3d",
            padding: 10,
            borderRadius: 12,
            color: "#ffffff",
            caretColor: "#ffffff"
            }}
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
        <img src={img} style={{ width: 100, borderRadius: 14 }} />

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

  {(newRecipe.ingredients || []).map((ing, i) => (
    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
      <input
      placeholder="Add ingredients here..."
      onKeyDown={(e) => {
  // ENTER → add new ingredient
  if (e.key === "Enter") {
    e.preventDefault();

    const nextIndex = newRecipe.ingredients.length;

    setNewRecipe((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, ""]
    }));

    setTimeout(() => {
      inputRefs.current[nextIndex]?.focus();
    }, 0);
  }

  // BACKSPACE → delete empty ingredient (except first)
  if (e.key === "Backspace" && !ing && i > 0) {
    e.preventDefault();

    const prevIndex = i - 1;

    setNewRecipe((prev) => {
      const updated = prev.ingredients.filter((_, idx) => idx !== i);
      return { ...prev, ingredients: updated };
    });

    setTimeout(() => {
      inputRefs.current[prevIndex]?.focus();
    }, 0);
  }
}}
   
        type="text"
        value={ing}
        ref={(el) => (inputRefs.current[i] = el)}
        onChange={(e) => {
          const updated = [...newRecipe.ingredients];
          updated[i] = e.target.value;
          setNewRecipe({ ...newRecipe, ingredients: updated });
        }}
        style={{ flex: 1, padding: 6, borderRadius: 14 }}
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
      borderRadius: 14,
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
        <img src={img} style={{ width: 100, borderRadius: 14 }} />

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
<div style={{ marginTop: 10 }}>
  <h4>Instructions</h4>

  {(newRecipe.instructions || []).map((step, i) => (
    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
      
      <input
      ref={(el) => (instructionRefs.current[i] = el)}
        type="text"
        
        value={`Step ${i + 1}: ${step}`}
        onKeyDown={(e) => {
          // ENTER → add new step
         if (e.key === "Enter") {
  e.preventDefault();

  const nextIndex = newRecipe.instructions.length;

  setNewRecipe((prev) => ({
    ...prev,
    instructions: [...prev.instructions, ""]
  }));

  setTimeout(() => {
    instructionRefs.current[nextIndex]?.focus();
  }, 0);
}
          // BACKSPACE → delete empty step (except Step 1)
          if (e.key === "Backspace" && !step && i > 0) {
  e.preventDefault();

  const prevIndex = i - 1;

  setNewRecipe((prev) => {
    const updated = prev.instructions.filter((_, idx) => idx !== i);
    return { ...prev, instructions: updated };
  });

  setTimeout(() => {
    instructionRefs.current[prevIndex]?.focus();
  }, 0);
}
        }}
        onChange={(e) => {
  const text = e.target.value.replace(`Step ${i + 1}: `, "");

  const updated = [...newRecipe.instructions];
  updated[i] = text;

  setNewRecipe({ ...newRecipe, instructions: updated });
}}
        style={{ flex: 1, padding: 6, borderRadius: 14 }}
      />

      {step && (
  <button
    onClick={() => {
      const updated = newRecipe.instructions.filter(
        (_, idx) => idx !== i
      );

      setNewRecipe({
        ...newRecipe,
        instructions: updated.length ? updated : [""]
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
</div>

          <button onClick={saveRecipe}>Save Recipe</button>
        </div>
      )}

      {/* RECIPE BOOK */}
      {page === "book" && (
        <div>
          <h2
  style={{
    color: "#7c4a45",
    marginBottom: 20,
    fontSize: 30
  }}
>
  📖 Recipe Book
</h2>

          <input
  type="text"
  placeholder="Search recipes..."
  value={recipeSearch}
  onChange={(e) =>
    setRecipeSearch(e.target.value)
  }
  style={{
    width: "100%",
    background: "#fff8f6",
    border: "1px solid #f3d6d0",
    padding: 12,
    marginBottom: 15,
    borderRadius: 14,
    fontSize: 15,
    outline: "none",
    color: "#2f2f2f",
    caretColor: "#7c4a45"
  }}
/>
 <div>
          {filtered
  .filter((r) =>
    r.name
      .toLowerCase()
      .includes(recipeSearch.toLowerCase())
  )
 
 
  .map((r, i) => (
            <div key={i} style={{ background: "#fff8f6",
padding: 18,
transition: "0.2s",
marginBottom: 18,
borderRadius: 24,
boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
border: "1px solid rgba(255,255,255,0.6)" }}>
              <h3
  style={{
    color: "#7c4a45",
    fontSize: 22,
    marginBottom: 10,
    display: "flex",
alignItems: "center",
gap: 10
  }}
>
                
                <span
                onClick={() => {
                setActiveRecipe(r);
                  }}
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
                  style={{ cursor: "pointer" }}
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
          <button
  onClick={scrollToTop}
  style={{
    position: "fixed",
    bottom: 20,
    right: 20,
    borderRadius: "50%",
    width: 45,
    height: 45,
    border: "none",
    background: "#e58b88",
    color: "white",
    fontSize: 20,
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
  }}
>
  ↑
</button>

        </div>
      )}

     {/* PLANNER */}
{page === "planner" && (
  <div>
  <h2
  style={{
    color: "#7c4a45",
    marginBottom: 20,
    fontSize: 30
  }}
>
  📅 Planner
</h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 15,
      marginTop: 20
    }}
  >
    {Object.keys(weeklyPlan).map((day) => (
      <div
  key={day}
  onClick={() => setOpenDay(day)}
  style={{
    background: "#fffdfb",
    borderRadius: 20,
    padding: 15,
    minHeight: 120,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    border: "1px solid rgba(255,255,255,0.6)"
  }}
>
  <h3>{day}</h3>

  <div style={{ marginTop: 10 }}>
    {(weeklyPlan[day] || []).slice(0, 3).map((r, i) => (
      <div key={i}>• {r.name}</div>
    ))}

    {(weeklyPlan[day] || []).length > 3 && (
      <div style={{ marginTop: 5, fontSize: 14 }}>
        +{weeklyPlan[day].length - 3} more
      </div>
    )}
  </div>
</div>
       
    ))}
  </div>

{openDay && (
  <div
    onClick={() => setOpenDay(null)}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 3000
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "relative",
        background: "#fffdf5",
        padding: 20,
        borderRadius: 12,
        width: "90%",
        maxWidth: 500
      }}
    >

<button
  onClick={() => setOpenDay(null)}
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

      <h2>{openDay}</h2>

<input
  type="text"
  placeholder="Search recipes..."
  value={plannerSearch}
  onChange={(e) =>
    setPlannerSearch(e.target.value)
  }
  style={{
    width: "100%",
    padding: 10,
    borderRadius: 12,
    border: "1px solid #ddd",
    marginBottom: 15,
    marginTop: 10,
    background: "#3a3a3d",
    color: "white"
  }}
/>

<div
  style={{
    maxHeight: 200,
    overflowY: "auto",
    marginBottom: 15
  }}
>
  {recipes
    .filter((r) =>
      r.name
        .toLowerCase()
        .includes(
          plannerSearch.toLowerCase()
        )
    )
    .slice(0, 6)
    .map((r, i) => (
      <div
        key={i}
        onClick={() => {
          assignToDay(openDay, r);
          setPlannerSearch("");
        }}
        style={{
          padding: 10,
          marginBottom: 8,
          borderRadius: 12,
          cursor: "pointer",
          background: "#fff8f6",
          border:
            "1px solid rgba(0,0,0,0.08)"
        }}
      >
        {r.name}
      </div>
    ))}
</div>

      {(weeklyPlan[openDay] || []).map((r, i) => (
       <div
  key={i}
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    marginBottom: 8,
    background: "#fef3c7",
    borderRadius: 14
  }}
>
  <span
    onClick={() => setActiveRecipe(r)}
    style={{
      cursor: "pointer",
      flex: 1
    }}
  >
    • {r.name}
  </span>

  <button
    onClick={() => {
      const updatedDay = weeklyPlan[openDay].filter(
        (_, idx) => idx !== i
      );

      const updated = {
        ...weeklyPlan,
        [openDay]: updatedDay
      };

if (updatedDay.length === 0) {
  setOpenDay(null);
}

      setWeeklyPlan(updated);

      localStorage.setItem(
        "weeklyPlan",
        JSON.stringify(updated)
      );
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
  </div>
)}

</div>
)}

      {/* GROCERY */}
      {page === "grocery" && (
        <div>
          <h2
  style={{
    color: "#7c4a45",
    marginBottom: 20,
    fontSize: 30
  }}
>
  🛒 Grocery
</h2>

          <div
  style={{
    display: "flex",
    gap: 10,
    marginBottom: 20
  }}
>
  <input
    type="text"
    placeholder="Add grocery item..."
    value={manualGroceryItem}
    onChange={(e) =>
      setManualGroceryItem(e.target.value)
    }
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();

        if (!manualGroceryItem.trim()) return;

        const updated = [
          ...groceryList,
          manualGroceryItem.trim()
        ];

        setGroceryList(updated);

        localStorage.setItem(
          "groceryList",
          JSON.stringify(updated)
        );

        setManualGroceryItem("");
      }
    }}
    style={{
      flex: 1,
      padding: 8,
      borderRadius: 14
    }}
  />

  <button
    onClick={() => {
      if (!manualGroceryItem.trim()) return;

      const updated = [
        ...groceryList,
        manualGroceryItem.trim()
      ];

      setGroceryList(updated);

      localStorage.setItem(
        "groceryList",
        JSON.stringify(updated)
      );

      setManualGroceryItem("");
    }}
    style={{
      padding: "8px 12px",
      borderRadius: 14,
      border: "none",
      background: "#22c55e",
      color: "white",
      cursor: "pointer"
    }}
  >
    ➕ Add
  </button>
</div>

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
    <h2
      style={{
        color: "#7c4a45",
        marginBottom: 20,
        fontSize: 30
      }}
    >
      🔍 Discover
    </h2>

    <input
      type="text"
      placeholder="Search recipes..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      style={{
        width: "100%",
        background: "#fff8f6",
        border: "1px solid #f3d6d0",
        padding: 12,
        marginBottom: 15,
        borderRadius: 14,
        fontSize: 15,
        outline: "none",
        color: "#2f2f2f",
        caretColor: "#7c4a45"
      }}
    />

    {(apiRecipes || []).map((r, i) => {
      if (!r) return null;

      return (
        <div
          key={i}
          onClick={() => setActiveRecipe(r)}
          style={{
            cursor: "pointer",
            transition: "0.2s",
            background: "#fff8f6",
            padding: 18,
            marginBottom: 18,
            borderRadius: 24,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            border: "1px solid rgba(255,255,255,0.6)"
          }}
        >
          <h3
            style={{
              cursor: "pointer",
              color: "#7c4a45",
              fontSize: 24,
              marginBottom: 12
            }}
          >
            {r.name || "No Name"}
          </h3>

          {r.image && (
            <img
              src={r.image}
              alt={r.name}
              style={{
                width: "100%",
                maxWidth: 350,
                borderRadius: 20,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                objectFit: "cover",
                marginTop: 10
              }}
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
        borderRadius: 14,
        cursor: "pointer"
      }}
    >
      🔄 Load More
    </button>

    <button
      onClick={scrollToTop}
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        borderRadius: "50%",
        width: 45,
        height: 45,
        border: "none",
        background: "#e58b88",
        color: "white",
        fontSize: 20,
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
      }}
    >
      ↑
    </button>
  </div>
)}

</div>
{activeRecipe && (
 <div
   onClick={() => {
  setActiveRecipe(null);
}}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(60,40,40,0.45)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
     zIndex: 9999
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "relative",
        background: "#fff8f6",
  padding: 28,
  borderRadius: 28,
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  border: "1px solid rgba(255,255,255,0.6)",
        width: "90%",
        maxWidth: 600,
       maxHeight: "85vh",
        overflowY: "auto"
      }}
    >
      <button
  onClick={() => {
  setActiveRecipe(null);
}}
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
    borderRadius: 14,
    background: "#ef4444",
    color: "white",
    border: "none",
    cursor: "pointer"
  }}
>
  🗑 Delete Recipe
</button>

<button
  onClick={() => {
    const safeRecipe = {
      name: activeRecipe.name || "",
      image: activeRecipe.image || "",
      category: activeRecipe.category || "",
      favorite: activeRecipe.favorite || false,

      ingredients: Array.isArray(activeRecipe.ingredients)
        ? [...activeRecipe.ingredients]
        : typeof activeRecipe.ingredients === "string"
        ? activeRecipe.ingredients
            .split("\n")
            .filter(Boolean)
        : [""],

      instructions: Array.isArray(activeRecipe.instructions)
        ? [...activeRecipe.instructions]
        : typeof activeRecipe.instructions === "string"
        ? activeRecipe.instructions
            .split("\n")
            .filter(Boolean)
        : [""],

      imageIngredients:
        activeRecipe.imageIngredients || [],

      imageInstructions:
        activeRecipe.imageInstructions || []
    };

    setNewRecipe(safeRecipe);

    const index = recipes.findIndex(
      (r) => r.name === activeRecipe.name
    );

    setEditIndex(index);

    
setActiveRecipe(null);

    setTimeout(() => {
      setPage("new");
    }, 0);
  }}
  style={{
    marginTop: 10,
    marginRight: 10,
    padding: "6px 10px",
    borderRadius: 14,
    border: "none",
    background: "#e58b88",
    color: "white",
    cursor: "pointer"
  }}
>
  ✏️ Edit
</button>

      <h2 style={{ color: "#111" }}>
  {activeRecipe.name}
</h2>

      {activeRecipe.image && (
  <div style={{ textAlign: "center", marginTop: 10 }}>
    <img
      src={activeRecipe.image}
      alt={activeRecipe.name}
      style={{
        width: "100%",
        maxWidth: 350,
        borderRadius: 20,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        objectFit: "cover",
      }}
    />
  </div>
)}

      <div style={{ marginTop: 15 }}>
  <strong>📅 Add to Planner:</strong>

  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8
    }}
  >
    {Object.keys(weeklyPlan || {}).map((day) => {
  const alreadyAdded = (weeklyPlan[day] || []).some(
    (r) => r.name === activeRecipe.name
  );

  return (
    <button
      key={day}
      onClick={() => {
  assignToDay(day, activeRecipe);

  setPlannerFeedback(day);

  window.clearTimeout(window.plannerTimeout);

window.plannerTimeout = setTimeout(() => {
  setPlannerFeedback("");
}, 2000);
}}
      style={{
        padding: "6px 10px",
        borderRadius: 14,
        border: "none",
        background:
  plannerFeedback === day
    ? "#22c55e"
    : "#8b5cf6",
        color: "white",
        cursor: "pointer"
      }}
    >
      {plannerFeedback === day ? `✔ ${day}` : day}
    </button>
  );
})}
  </div>
</div>
 

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
    borderRadius: 14,
   background: "#e58b88",
    color: "white",
    border: "none",
    cursor: "pointer"
  }}
>
  ➕ Add Selected Ingredients
</button>

      <div>
        <strong>Ingredients:</strong>
        {(
  Array.isArray(activeRecipe.ingredients)
    ? activeRecipe.ingredients
    : []
).map((item, i) => (
  <div
    key={i}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8
    }}
  >
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
        {(
  Array.isArray(activeRecipe.instructions)
    ? activeRecipe.instructions
    : activeRecipe.instructions?.split("\n") || []
).map((step, i) => (
  <div key={i}>{step}</div>
))} 
        </div>
</div>
</div>

)}

    </div>
  
);
}