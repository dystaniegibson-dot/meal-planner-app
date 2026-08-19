// ============================== Home Page ==============================

export default function Home({ recipes, groceryList, apiRecipes, weeklyPlan, setActiveRecipe, themeFruit }) {
  // Get the current hour so the greeting can eventually change
  // between morning, afternoon, and evening.
  const hour = new Date().getHours();

  let greeting = "";

  if (hour < 12) {
    greeting = "Good Morning";
  } else if (hour < 18) {
    greeting = "Good Afternoon";
  } else {
    greeting = "Good Evening";
  }

  // This is currently the placeholder name for the greeting.
  // We are keeping it because the sign-in/user-name feature is planned.
  const userName = "Friend";

  // ============================== Home Page ==============================

  return (
    <main className="page-container">
      {/* ============================== Welcome Section ============================== */}

      <div className="home-welcome-section">
        <h1 className="page-title">Welcome back! {themeFruit}</h1>

        <p className="page-subtitle">Your personal cookbook, meal planner, and grocery companion.</p>

        {/* ============================== Recipe Stats ============================== */}

        <section className="stats-grid">
          {/* Favorite recipe count */}
          <div className="stat-card">
            <span className="stat-icon">⭐</span>

            <span className="stat-number">{recipes.filter((r) => r.favorite).length}</span>
          </div>

          {/* Total recipe count */}
          <div className="stat-card">
            <span className="stat-icon">📖</span>

            <span className="stat-number">{recipes.length}</span>
          </div>

          {/* Grocery item count */}
          <div className="stat-card">
            <span className="stat-icon">🛒</span>

            <span className="stat-number">{groceryList.length}</span>
          </div>
        </section>

        {/* ============================== Home Content ============================== */}

        <div className="home-content">
          {/* ============================== Featured Recipes ============================== */}

          <section className="featured-section">
            <h2 className="section-title">{themeFruit} Featured Recipes</h2>

            <div className="recipe-grid">
              {apiRecipes.slice(0, 4).map((r, i) => (
                <div
                  key={i}
                  className="recipe-card"
                  onClick={() => setActiveRecipe(r)} // Open the selected recipe.
                >
                  {/* Only display the image when this recipe has one. */}
                  {r.image && <img className="recipe-image" src={r.image} alt={r.name} />}

                  <div className="recipe-content">
                    <h3 className="recipe-title">{r.name}</h3>

                    <p className="recipe-category">{r.category || "Recipe"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ============================== Planned Meals ============================== */}

          <section className="planned-meals-section">
            <h3 className="stat-title">📅 Planned Meals This Week</h3>

            <div className="planned-meals-card">
              {Object.keys(weeklyPlan).map((day) => (
                <div key={day} className="planned-meal-row">
                  <strong>{day}</strong>

                  <span
                    className="planned-meal-name"
                    onClick={() => weeklyPlan[day]?.length > 0 && setActiveRecipe(weeklyPlan[day][0])} // Open the first planned recipe for this day.
                  >
                    {(weeklyPlan[day] || []).length > 0 ? weeklyPlan[day][0].name : "No meal planned"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
