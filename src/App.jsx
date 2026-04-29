import { useState, useRef } from "react";

export default function App() {
  const inputRefs = useRef([]);
  // ===== STATE =====
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
    ingredients: newRecipe.ingredients.join("\n"),
    imageIngredients: newRecipe.imageIngredients || [],
    imageInstructions: newRecipe.imageInstructions || []
  };

  const updated = [...recipes, recipe];

  setRecipes(updated);
  localStorage.setItem("recipes", JSON.stringify(updated));

  setNewRecipe({
    name: "",
    ingredients: [""],
    instructions: "",
    imageIngredients: [],      // ✅ FIXED
    imageInstructions: [],     // ✅ FIXED
    favorite: false,
    category: ""
  });
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
  const filtered = recipes
    .filter((r) => {
      const text =
        r.name + r.ingredients + r.instructions + r.category;
      return text.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => b.favorite - a.favorite);

  // ===== PLANNER =====
  const assignToDay = (day, recipe) => {
    const updated = { ...weeklyPlan, [day]: recipe };
    setWeeklyPlan(updated);
    localStorage.setItem("weeklyPlan", JSON.stringify(updated));
  };
return (
<div
  style={{
    padding: 20,
    minHeight: "100vh",
    background: "linear-gradient(to bottom, #fff7ed, #fde68a)"
  }}
>    <h1>🍽 Recipe Scanner</h1>

    {/* NAV */}
    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
      <button onClick={() => setPage("new")}>➕ New Recipe</button>
      <button onClick={() => setPage("book")}>📖 Recipe Book</button>
      <button onClick={() => setPage("planner")}>📅 Planner</button>
      <button onClick={() => setPage("grocery")}>🛒 Grocery</button>    </div>

    {/* SEARCH */}
    {page === "recipes" && (
      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 20 }}
      />
    )}

   {/* NEW RECIPE */}
{page === "new" && (
  <div style={{
  background: "#fffdf5",
  padding: 20,
  borderRadius: 16,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  border: "1px solid #fcd34d"
}}>
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
<div style={{ display: "flex", gap: 15, marginBottom: 20 }}>
  {/* LEFT SIDE */}
  <div style={{ flex: 1 }}>
    <strong>Ingredients</strong>

    {newRecipe.ingredients.map((item, index) => (
      <input
  ref={(el) => {
    inputRefs.current[index] = el;
  }}
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

      const updated = [...newRecipe.ingredients];
      updated.splice(index + 1, 0, "");

      setNewRecipe({
        ...newRecipe,
        ingredients: updated
      });

      // 🔥 force focus AFTER render
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 0);
    }

    if (
      e.key === "Backspace" &&
      item === "" &&
      newRecipe.ingredients.length > 1
    ) {
      e.preventDefault();

      const updated = [...newRecipe.ingredients];
      updated.splice(index, 1);

      setNewRecipe({
        ...newRecipe,
        ingredients: updated
      });

      setTimeout(() => {
        inputRefs.current[index - 1]?.focus();
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
  </div>

  {/* RIGHT SIDE */}
  <div
    style={{
      width: 200,
      background: "#e5e7eb",
      borderRadius: 10,
      padding: 10,
      textAlign: "center"
    }}
  >
    <p style={{ fontSize: 12 }}>Ingredients Images</p>
    <input
      type="file"
      multiple
      onChange={(e) => handleImage(e, "imageIngredients")}
    />

    <div style={{ display: "flex", flexWrap: "wrap", marginTop: 10 }}>
      {newRecipe.imageIngredients.map((img, i) => (
        <img
          key={i}
          src={img}
          style={{ width: 60, height: 60, margin: 5 }}
        />
      ))}
    </div>
  </div>
</div>

{/* INSTRUCTIONS */}
<div style={{ display: "flex", gap: 15, marginBottom: 20 }}>
  {/* LEFT SIDE */}
  <div style={{ flex: 1 }}>
    <strong>Instructions</strong>

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
  </div>

  {/* RIGHT SIDE */}
  <div
    style={{
      width: 200,
      background: "#e5e7eb",
      borderRadius: 10,
      padding: 10,
      textAlign: "center"
    }}
  >
    <p style={{ fontSize: 12 }}>Instructions Images</p>
    <input
      type="file"
      multiple
      onChange={(e) => handleImage(e, "imageInstructions")}
    />

    <div style={{ display: "flex", flexWrap: "wrap", marginTop: 10 }}>
      {newRecipe.imageInstructions.map((img, i) => (
        <img
          key={i}
          src={img}
          style={{ width: 60, height: 60, margin: 5 }}
        />
      ))}
    </div>
  </div>
</div>
    {/* KEEP your ingredients + instructions section here */}

    <button onClick={saveRecipe}>Save Recipe</button>
  </div>
)}

{/* RECIPE BOOK */}
{page === "book" && (
  <div style={{ marginTop: 20 }}>
    <h2>📖 Recipe Book</h2>

    {filtered.map((r, i) => (
      <div
        key={i}
        style={{
          background: "white",
          padding: 15,
          marginBottom: 10,
          borderRadius: 12
        }}
      >
        <h3
          onClick={() =>
            setOpenRecipe(openRecipe === i ? null : i)
          }
          style={{ cursor: "pointer" }}
        >
          {openRecipe === i ? "▼ " : "▶ "} {r.name}
        </h3>

        {openRecipe === i && (
          <>
            <p><strong>Category:</strong> {r.category}</p>
            <div>
  <strong>Ingredients:</strong>

  {(Array.isArray(r.ingredients)
    ? r.ingredients
    : r.ingredients?.split("\n") || []
  ).map((item, idx) => (
    <div key={idx}>
      <label>
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
        {item}
      </label>
    </div>
  ))}
</div>
            <p><strong>Instructions:</strong> {r.instructions}</p>



            <div style={{ display: "flex", flexWrap: "wrap" }}>
  {Array.isArray(r.imageIngredients) &&
    r.imageIngredients.map((img, idx) => (
      <img
        key={idx}
        src={img}
        onClick={() => setZoomImage(img)}
        style={{
          width: 180,
          height: 180,
          objectFit: "cover",
          borderRadius: 10,
          marginRight: 10,
          marginTop: 10,
          cursor: "pointer"
        }}
      />
    ))}

<div style={{ display: "flex", flexWrap: "wrap", marginTop: 10 }}>
  {Array.isArray(r.imageInstructions) &&
    r.imageInstructions.map((img, idx) => (
      <img
        key={idx}
        src={img}
        onClick={() => setZoomImage(img)}
        style={{
          width: 180,
          height: 180,
          objectFit: "cover",
          borderRadius: 10,
          marginRight: 10,
          marginTop: 10,
          cursor: "pointer"
        }}
      />
    ))}
</div>

</div>      <button
  onClick={addSelectedToGrocery}
  style={{
    marginTop: 10,
    padding: "8px 12px",
    borderRadius: 8
  }}
>
  🛒 Add Selected to Grocery
</button>  
<button
  onClick={() => setPlannerRecipe(r)}
  style={{
    marginTop: 10,
    padding: "8px 12px",
    borderRadius: 8
  }}
>
  📅 Add to Planner
</button>   
{plannerRecipe === r && (
  <div style={{ marginTop: 10 }}>
    <strong>Select Day:</strong>

    {Object.keys(weeklyPlan).map((day) => (
      <button
        key={day}
        onClick={() => {
          assignToDay(day, r);
          setPlannerRecipe(null);
        }}
        style={{
          margin: 5,
          padding: "5px 10px",
          borderRadius: 6
        }}
      >
        {day}
      </button>
    ))}
  </div>
)}
          </>
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
      <div
  key={day}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    background: "#fffdf5",
    padding: 10,
    borderRadius: 10
  }}
>
  <div>
    <strong>{day}:</strong>{" "}
    {weeklyPlan[day]?.name || "No meal planned"}
  </div>

  {weeklyPlan[day] && (
    <button
      onClick={() => {
        const updated = { ...weeklyPlan, [day]: null };
        setWeeklyPlan(updated);
        localStorage.setItem("weeklyPlan", JSON.stringify(updated));
      }}
      style={{
        background: "#ef4444",
        color: "white",
        borderRadius: 6,
        padding: "4px 8px"
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
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ flex: 1 }}>
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
              textDecoration: checkedItems[item]
                ? "line-through"
                : "none"
            }}
          >
            {item}
          </span>
        </label>

        <button
          onClick={() => {
            const updated = groceryList.filter((_, idx) => idx !== i);
            setGroceryList(updated);
            localStorage.setItem("groceryList", JSON.stringify(updated));
          }}
          style={{ background: "#ef4444", color: "white" }}
        >
          ❌
        </button>
      </div>
    ))}
  </div>
)}

{zoomImage && (
  <div
    onClick={() => setZoomImage(null)}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000
    }}
  >
    <img
      src={zoomImage}
      style={{
        maxWidth: "90%",
        maxHeight: "90%"
      }}
    />
  </div>
)}

  </div>
);
}