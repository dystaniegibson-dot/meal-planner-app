import { useState, useRef } from "react";
import { useEffect } from "react";

export default function App() {
  const inputRefs = useRef([]);
  // ===== STATE ===== //
  
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
    category: ""
  });

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
    ingredients: [""],
    instructions: "",
    imageIngredients: [],
    imageInstructions: [],
    favorite: false,
    category: ""
  });

  setIngredientPaste("");
  setInstructionPaste("");
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

        {/* INGREDIENTS */}
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

