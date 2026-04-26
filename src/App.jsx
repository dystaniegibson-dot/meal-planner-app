import { useState, useEffect } from "react";

export default function App() {
  // ===== STATE =====
  const [search, setSearch] = useState("");
  const [recipe, setRecipe] = useState(null);

  const [recipes, setRecipes] = useState(() => {
    const saved = localStorage.getItem("recipes");
    return saved ? JSON.parse(saved) : [];
  });

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  });

  const [groceryList, setGroceryList] = useState([]);
  const [checkedItems, setCheckedItems] = useState([]);
  const [weeklyPlan, setWeeklyPlan] = useState([]);

  const [page, setPage] = useState("home");
  const [ingredientsInput, setIngredientsInput] = useState("");
  const [showFull, setShowFull] = useState(false);

  const [fade, setFade] = useState(true);

  // ===== STYLES =====
  const primaryBtn = {
    background: "#6366f1",
    color: "white",
    border: "none",
    borderRadius: 14,
    padding: "12px",
    flex: 1
  };

  const secondaryBtn = {
    background: "#e5e7eb",
    border: "none",
    borderRadius: 14,
    padding: "12px",
    flex: 1
  };

  const changePage = (newPage) => {
    setFade(false);
    setTimeout(() => {
      setPage(newPage);
      setFade(true);
    }, 200);
  };

  // ===== FETCH =====
  const fetchRecipe = async () => {
    let url = search
      ? `https://www.themealdb.com/api/json/v1/1/search.php?s=${search}`
      : "https://www.themealdb.com/api/json/v1/1/random.php";

    const res = await fetch(url);
    const data = await res.json();

    if (!data.meals) return alert("No recipes found");

    formatRecipe(data.meals[Math.floor(Math.random() * data.meals.length)]);
  };

  const fetchSuggestion = async () => {
    if (!ingredientsInput) return;

    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredientsInput}`
    );
    const data = await res.json();

    if (!data.meals) return alert("No recipes found");

    const randomMeal =
      data.meals[Math.floor(Math.random() * data.meals.length)];

    const detailRes = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${randomMeal.idMeal}`
    );
    const detailData = await detailRes.json();

    formatRecipe(detailData.meals[0]);
    changePage("home");
  };

  const formatRecipe = (meal) => {
    const ingredients = [];

    for (let i = 1; i <= 20; i++) {
      if (meal[`strIngredient${i}`]) {
        ingredients.push(meal[`strIngredient${i}`]);
      }
    }

    setRecipe({
      name: meal.strMeal,
      image: meal.strMealThumb,
      instructions: meal.strInstructions,
      ingredients
    });

    setShowFull(false);
  };

  useEffect(() => {
    fetchRecipe();
  }, []);

  // ===== ACTIONS =====
  const saveRecipe = () => {
    if (recipes.find((r) => r.name === recipe.name)) return;
    const updated = [...recipes, recipe];
    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
  };

  const addFavorite = () => {
    const updated = [...favorites, recipe];
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };

  const toggleIngredient = (item) => {
    setCheckedItems((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : [...prev, item]
    );
  };

  const addToGrocery = () => {
    const updated = [...new Set([...groceryList, ...checkedItems])];
    setGroceryList(updated);
    setCheckedItems([]);
  };

  const removeFromGrocery = (item) => {
    setGroceryList((prev) => prev.filter((i) => i !== item));
  };

  const addToWeek = () => {
    setWeeklyPlan([...weeklyPlan, recipe]);
  };

  // ===== UI =====
  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 500, height: "100vh", display: "flex", flexDirection: "column" }}>

        {/* CONTENT */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 15,
            transition: "opacity 0.3s",
            opacity: fade ? 1 : 0
          }}
        >

          {/* HOME */}
          {page === "home" && (
            <>
              <h2>🍽 Find Your Meal</h2>

              <input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: 10 }}
              />

              <button style={{ ...primaryBtn, marginTop: 10 }} onClick={fetchRecipe}>
                Search
              </button>

              {recipe && (
                <div style={{
                  background: "white",
                  borderRadius: 20,
                  padding: 15,
                  marginTop: 20,
                  boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
                  transition: "transform 0.2s"
                }}>
                  <h3>{recipe.name}</h3>

                  <img src={recipe.image} style={{ width: "100%", borderRadius: 15 }} />

                  <h4>Ingredients</h4>
                  {recipe.ingredients.map((item, i) => (
                    <div key={i}>
                      <input
                        type="checkbox"
                        checked={checkedItems.includes(item)}
                        onChange={() => toggleIngredient(item)}
                      />
                      {item}
                    </div>
                  ))}

                  <h4>Instructions</h4>
                  <p>
                    {showFull
                      ? recipe.instructions
                      : recipe.instructions.slice(0, 150) + "..."}
                  </p>

                  <button onClick={() => setShowFull(!showFull)}>
                    {showFull ? "Show Less" : "Show More"}
                  </button>

                  <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
                    <button style={primaryBtn} onClick={addFavorite}>❤️ Favorite</button>
                    <button style={secondaryBtn} onClick={saveRecipe}>💾 Save</button>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button style={primaryBtn} onClick={fetchRecipe}>➡️ Next</button>
                    <button style={secondaryBtn} onClick={addToWeek}>📅 Plan</button>
                  </div>

                  <button style={{ width: "100%", marginTop: 15 }} onClick={addToGrocery}>
                    🛒 Grocery
                  </button>
                </div>
              )}
            </>
          )}

          {/* SUGGEST */}
          {page === "suggest" && (
            <>
              <h2>🥘 What do you have?</h2>
              <input
                placeholder="chicken, rice..."
                value={ingredientsInput}
                onChange={(e) => setIngredientsInput(e.target.value)}
              />
              <button style={primaryBtn} onClick={fetchSuggestion}>
                Suggest Meal
              </button>
            </>
          )}

          {/* PLANNER */}
          {page === "planner" && (
            <>
              <h2>📅 Weekly Plan</h2>
              {weeklyPlan.map((r, i) => (
                <div key={i}>{r.name}</div>
              ))}
            </>
          )}

          {/* FAVORITES */}
          {page === "favorites" && (
            <>
              <h2>❤️ Favorites</h2>
              {favorites.map((r, i) => (
                <div key={i}>{r.name}</div>
              ))}
            </>
          )}

          {/* GROCERY */}
          {page === "grocery" && (
            <>
              <h2>🛒 Grocery List</h2>
              {groceryList.map((item, i) => (
                <div key={i}>
                  {item}
                  <button onClick={() => removeFromGrocery(item)}>❌</button>
                </div>
              ))}
            </>
          )}

        </div>

        {/* BOTTOM NAV */}
        <div style={{
          display: "flex",
          justifyContent: "space-around",
          padding: 10,
          background: "white",
          borderTop: "1px solid #ddd"
        }}>
          <div onClick={() => changePage("home")} style={{ textAlign: "center" }}>
            🏠
            <div style={{ fontSize: 10 }}>Home</div>
          </div>

          <div onClick={() => changePage("suggest")} style={{ textAlign: "center" }}>
            🍳
            <div style={{ fontSize: 10 }}>Suggest</div>
          </div>

          <div onClick={() => changePage("planner")} style={{ textAlign: "center" }}>
            📅
            <div style={{ fontSize: 10 }}>Plan</div>
          </div>

          <div onClick={() => changePage("favorites")} style={{ textAlign: "center" }}>
            ❤️
            <div style={{ fontSize: 10 }}>Favorites</div>
          </div>

          <div onClick={() => changePage("grocery")} style={{ textAlign: "center" }}>
            🛒
            <div style={{ fontSize: 10 }}>Grocery</div>
          </div>
        </div>

      </div>
    </div>
  );
}