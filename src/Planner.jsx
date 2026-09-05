// ==============================
// Planner
// ==============================

import { useState } from "react";

export default function Planner({
  weeklyPlan,
  openDay,
  setOpenDay,
  plannerSearch,
  setPlannerSearch,
  recipes,
  assignToDay,
  setActiveRecipe,
  setWeeklyPlan,
}) {
  // ==============================
  // Randomizer
  // ==============================

  const [randomRecipe, setRandomRecipe] = useState(null);
  const [randomizerMessage, setRandomizerMessage] = useState("");
  // Tracks whether the user is currently choosing a day
  // to save the randomized recipe to.
  const [choosingRandomDay, setChoosingRandomDay] = useState(false);

  const pickRandomRecipe = () => {
    if (!recipes || recipes.length === 0) {
      setRandomRecipe(null);
      setRandomizerMessage("You don't have any saved recipes yet!");
      return;
    }

    // Start with every recipe in the Recipe Book.
    let matchingRecipes = [...recipes];

    // If the user selected meats, only keep recipes
    // that contain at least ONE of those meats.
    if (selectedMeats.length > 0) {
      matchingRecipes = matchingRecipes.filter((recipe) => {
        const recipeText = [recipe.name, recipe.category, recipe.ingredients].flat(Infinity).filter(Boolean).join(" ").toLowerCase();

        return selectedMeats.some((meat) => recipeText.includes(meat.toLowerCase()));
      });
    }

    // No recipes matched the selected meats.
    if (matchingRecipes.length === 0) {
      setRandomRecipe(null);
      setRandomizerMessage("I couldn't find a recipe that matches those choices. Try another meat!");
      return;
    }

    // Pick one recipe randomly from ONLY the matching recipes.
    const randomIndex = Math.floor(Math.random() * matchingRecipes.length);

    setRandomRecipe(matchingRecipes[randomIndex]);
    setRandomizerMessage("");
  };

  const rerollRecipe = () => {
    if (!recipes || recipes.length === 0) return;

    // Start with every recipe in the Recipe Book.
    let matchingRecipes = [...recipes];

    // Apply the same meat filter used by "Find Me a Recipe".
    if (selectedMeats.length > 0) {
      matchingRecipes = matchingRecipes.filter((recipe) => {
        const recipeText = [recipe.name, recipe.category, recipe.ingredients].flat(Infinity).filter(Boolean).join(" ").toLowerCase();

        return selectedMeats.some((meat) => recipeText.includes(meat.toLowerCase()));
      });
    }

    // Nothing matches the selected meat.
    if (matchingRecipes.length === 0) {
      setRandomRecipe(null);
      setRandomizerMessage("I couldn't find another recipe that matches those choices.");
      return;
    }

    // If there is more than one matching recipe,
    // try not to show the exact same recipe again.
    if (matchingRecipes.length > 1 && randomRecipe) {
      matchingRecipes = matchingRecipes.filter((recipe) => recipe.name !== randomRecipe.name);
    }

    // Pick another recipe from the filtered results.
    const randomIndex = Math.floor(Math.random() * matchingRecipes.length);

    setRandomRecipe(matchingRecipes[randomIndex]);
    setRandomizerMessage("");
  };

  const saveRandomToDay = () => {
    if (!randomRecipe) return;

    // Show the day picker directly in the Randomizer.
    // We don't need to open the normal Planner modal.
    setOpenDay(null);
    setChoosingRandomDay(true);
    setRandomizerMessage("");
  };

  const giveUpRandomizer = () => {
    setRandomRecipe(null);
    setRandomizerMessage("");
  };

  const [randomMealType, setRandomMealType] = useState("Any");
  const [selectedMeats, setSelectedMeats] = useState([]);

  // ==============================
  // Randomizer Choices
  // ==============================

  const mealTypes = ["Any", "Breakfast", "Lunch", "Dinner"];

  const meatTypes = ["Chicken", "Beef", "Pork", "Turkey", "Seafood", "Eggs"];

  // ==============================
  // Current Day Recipes
  // ==============================

  const assignedRecipes = weeklyPlan[openDay] || [];

  // ==============================
  // Available Recipes
  // ==============================

  const availableRecipes = recipes.filter(
    (r) => !assignedRecipes.some((assigned) => assigned.name === r.name) && r.name.toLowerCase().includes(plannerSearch.toLowerCase()),
  );

  // ==============================
  // Remove Planned Recipe
  // ==============================

  const removeFromDay = (index) => {
    const updatedDay = weeklyPlan[openDay].filter((_, idx) => idx !== index);

    const updated = {
      ...weeklyPlan,
      [openDay]: updatedDay,
    };

    if (updatedDay.length === 0) {
      setOpenDay(null);
    }

    setWeeklyPlan(updated);
    localStorage.setItem("weeklyPlan", JSON.stringify(updated));
  };

  // ==============================
  // Planner Page
  // ==============================

  return (
    <main className="planner-page">
      {/* ==============================
          Page Title
      ============================== */}

      <h2 className="planner-title">📅 Planner</h2>

      {/* ==============================
          Weekly Planner
      ============================== */}

      <div className="planner-week-grid">
        {Object.keys(weeklyPlan).map((day) => {
          const dayRecipes = weeklyPlan[day] || [];

          return (
            <div key={day} className="planner-day-card" onClick={() => setOpenDay(day)}>
              <h3>{day}</h3>

              <div className="planner-day-recipes">
                {dayRecipes.slice(0, 3).map((recipe, index) => (
                  <div key={index}>• {recipe.name}</div>
                ))}

                {dayRecipes.length > 3 && <div className="planner-more-count">+{dayRecipes.length - 3} more</div>}

                {/* Hint for empty days */}
                {dayRecipes.length === 0 && <div className="planner-empty-hint">💡 Click to add a meal</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ==============================
          RANDOM MEAL PICKER
      ============================== */}

      <section className="planner-randomizer">
        <div className="planner-randomizer-header">
          <h3>🎲 Don't know what you want to eat?</h3>

          <p>Let me pick for you!</p>
        </div>

        {!randomRecipe && (
          <div className="planner-randomizer-options">
            {/* ==============================
                Meat Options
            ============================== */}

            <div className="planner-randomizer-filter">
              <h4>🥩 What meat do you have/have out?</h4>

              <p className="planner-randomizer-help">Choose as many as you have.</p>

              <div className="planner-randomizer-choice-buttons">
                {meatTypes.map((meat) => {
                  const selected = selectedMeats.includes(meat);

                  return (
                    <button
                      key={meat}
                      type="button"
                      className={`planner-randomizer-choice ${selected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedMeats((current) => (selected ? current.filter((item) => item !== meat) : [...current, meat]));
                      }}
                    >
                      {selected ? "✓ " : ""}
                      {meat}
                    </button>
                  );
                })}

                <button type="button" className="planner-randomizer-choice" onClick={() => setSelectedMeats([])}>
                  Any Meat
                </button>
              </div>
            </div>

            {/* ==============================
                Find Recipe
            ============================== */}

            <button className="planner-random-pick-button" onClick={pickRandomRecipe}>
              🎲 Find Me a Recipe
            </button>
          </div>
        )}

        {randomRecipe && (
          <div className="planner-random-result">
            {randomRecipe.image && <img src={randomRecipe.image} alt={randomRecipe.name} className="planner-random-image" />}

            <div className="planner-random-info">
              <h3>{randomRecipe.name}</h3>

              {randomRecipe.category && <p className="planner-random-category">{randomRecipe.category}</p>}

              <div className="planner-random-buttons">
                <button className="planner-reroll-button" onClick={rerollRecipe}>
                  🔄 Reroll
                </button>

                <button className="planner-save-random-button" onClick={saveRandomToDay}>
                  📅 Save to a Day
                </button>

                <button className="planner-give-up-button" onClick={giveUpRandomizer}>
                  🙅 Give Up
                </button>
              </div>
            </div>
            {choosingRandomDay && (
              <div className="planner-random-day-picker">
                <h4>📅 What day would you like to add this to?</h4>

                <div className="planner-random-day-buttons">
                  {Object.keys(weeklyPlan).map((day) => (
                    <button
                      key={day}
                      type="button"
                      className="planner-random-day-button"
                      onClick={() => {
                        assignToDay(day, randomRecipe);

                        setChoosingRandomDay(false);
                        setRandomizerMessage(`✅ ${randomRecipe.name} added to ${day}!`);
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {randomizerMessage && <p className="planner-random-message">{randomizerMessage}</p>}
      </section>

      {/* ==============================
          Day Details Modal
      ============================== */}

      {openDay && (
        <div className="planner-modal-overlay" onClick={() => setOpenDay(null)}>
          <div className="planner-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}

            <button className="planner-close-button" onClick={() => setOpenDay(null)} aria-label="Close planner">
              ✖
            </button>

            {/* Selected Day */}

            <h2 className="planner-modal-title">{openDay}</h2>

            {/* Recipe Search */}

            <input
              className="planner-search"
              type="text"
              placeholder="Search recipes..."
              value={plannerSearch}
              onChange={(e) => setPlannerSearch(e.target.value)}
            />

            {/* Planned Recipes */}

            {assignedRecipes.length > 0 && (
              <div className="planner-planned-section">
                <h3 className="planner-section-heading">📅 Planned Recipes</h3>

                {assignedRecipes.map((recipe, index) => (
                  <div key={index} className="planner-planned-recipe">
                    <span className="planner-planned-recipe-name" onClick={() => setActiveRecipe(recipe)}>
                      • {recipe.name}
                    </span>

                    <button className="planner-remove-button" onClick={() => removeFromDay(index)} aria-label={`Remove ${recipe.name}`}>
                      ✖
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Available Recipes */}

            <h3 className="planner-section-heading">📖 Recipe Book</h3>

            <div className="planner-available-recipes">
              {availableRecipes.slice(0, 6).map((recipe, index) => (
                <div
                  key={index}
                  className="planner-available-recipe"
                  onClick={() => {
                    assignToDay(openDay, recipe);
                    setPlannerSearch("");
                  }}
                >
                  {recipe.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
