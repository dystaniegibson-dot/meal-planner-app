import { useMemo, useState } from "react";

// ============================== Recipe Book ==============================

export default function RecipeBook({ recipeSearch, setRecipeSearch, filtered, scrollToTop, recipes, setRecipes, setActiveRecipe }) {
  // ============================== Recipe Book Data ==============================

  const bookRecipes = filtered.filter((recipe) => recipe.name.toLowerCase().includes(recipeSearch.toLowerCase()));

  const [recipePage, setRecipePage] = useState(0);

  // Each scrapbook spread displays TWO recipes:
  // one recipe on the left page and one recipe on the right page.
  const recipesPerPage = 2;
  const totalPages = Math.ceil(bookRecipes.length / recipesPerPage);

  const pageStart = recipePage * recipesPerPage;

  const firstRecipe = bookRecipes[pageStart];
  const secondRecipe = bookRecipes[pageStart + 1];

  // ============================== Recipe Images ==============================

  const getRecipeImage = (recipe) => {
    return recipe?.image || recipe?.imageUrl || recipe?.photo || recipe?.images?.[0] || null;
  };

  // ============================== Placeholder Choices ==============================

  // These are only display placeholders.
  // They do not change or save anything inside the actual recipe.
  const placeholderChoices = [
    { emoji: "🍳", message: "I'm hungry!", note: "Go make something delicious." },
    { emoji: "🍓", message: "Feed the family!", note: "This spot needs something yummy." },
    { emoji: "🍪", message: "This page looks lonely...", note: "I think it needs a recipe." },
    { emoji: "🍕", message: "Come on, cook something!", note: "You know you're hungry." },
  ];

  // Pick the placeholder choices once so they do not change on every re-render.
  const placeholderSlots = useMemo(() => {
    return Array.from({ length: 2 }, () => {
      return placeholderChoices[Math.floor(Math.random() * placeholderChoices.length)];
    });
  }, []);

  // ============================== Favorite Recipe ==============================

  const toggleFavorite = (recipe) => {
    const updated = recipes.map((item) => (item.name === recipe.name ? { ...item, favorite: !item.favorite } : item));

    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
  };

  // ============================== Recipe Slot ==============================

  // This keeps the two recipe areas consistent without changing
  // how each recipe is displayed or opened.
  const renderRecipe = (recipe, emptyMessage, slotIndex) => {
    // ============================== Empty Recipe Spot ==============================

    // Show a fun scrapbook memo when this spot does not have a recipe.
    if (!recipe) {
      const placeholder = placeholderSlots[slotIndex] || placeholderChoices[0];

      return (
        <div className="empty-recipe-page">
          <div className="empty-recipe-placeholder">
            <span className="empty-recipe-emoji">{placeholder.emoji}</span>
          </div>

          <div className="empty-recipe-memo">
            <strong>{placeholder.message}</strong>
            <span>{placeholder.note}</span>
          </div>
        </div>
      );
    }

    // ============================== Real Recipe ==============================

    return (
      <div
        className={`recipe-book-recipe-slot ${(recipe.ingredients || []).length > 9 ? "recipe-book-recipe-slot-compact" : ""}`}
        onClick={() => setActiveRecipe(recipe)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActiveRecipe(recipe);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Open ${recipe.name}`}
      >
        <h2 className="recipe-book-recipe-title">{recipe.name}</h2>

        {/* ============================== Recipe Photo ============================== */}

        {getRecipeImage(recipe) ? (
          <img src={getRecipeImage(recipe)} alt={recipe.name} className="recipe-scrapbook-image" />
        ) : (
          <div className="scrapbook-photo recipe-placeholder-photo">
            <span className="recipe-placeholder-emoji">{placeholderSlots[slotIndex]?.emoji || "🍳"}</span>
          </div>
        )}

        {/* ============================== Ingredients ============================== */}

        <h3 className="recipe-book-section-title">Ingredients</h3>

        <ul className="recipe-book-ingredients">
          {(recipe.ingredients || []).map((ingredient, index) => (
            <li key={index}>{ingredient}</li>
          ))}
        </ul>

        {/* ============================== Open Recipe ============================== */}

        <button
          onClick={() => setActiveRecipe(recipe)} // Open the complete recipe popup.
          className="show-more-button"
        >
          Show More →
        </button>
      </div>
    );
  };

  // ============================== Recipe Book Page ==============================

  return (
    <main className="recipe-book-page">
      {/* ============================== Page Title ============================== */}

      <h2 className="recipe-book-title">📖 Recipe Book</h2>

      {/* ============================== Recipe Search ============================== */}

      <input
        className="recipe-book-search"
        type="text"
        placeholder="Search recipes..."
        value={recipeSearch}
        onChange={(e) => setRecipeSearch(e.target.value)} // Update the recipe search.
      />
      {/* ============================== Mobile Recipe Notes ============================== */}

      <div className="mobile-recipe-book">
        {bookRecipes.length > 0 ? (
          bookRecipes.map((recipe) => (
            <article
              key={recipe.id || recipe.name}
              className="mobile-recipe-note"
              onClick={() => setActiveRecipe(recipe)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveRecipe(recipe);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open ${recipe.name}`}
            >
              <h2 className="mobile-recipe-note-title">{recipe.name}</h2>

              {getRecipeImage(recipe) ? (
                <img src={getRecipeImage(recipe)} alt={recipe.name} className="mobile-recipe-note-image" />
              ) : (
                <div className="mobile-recipe-note-placeholder">
                  <span>{placeholderChoices[Math.floor(Math.random() * placeholderChoices.length)].emoji}</span>
                </div>
              )}
              {recipe.ingredients?.length > 0 && (
                <div className="mobile-recipe-note-ingredients">
                  <strong>Ingredients:</strong>

                  <ul>
                    {recipe.ingredients.slice(0, 3).map((ingredient, index) => (
                      <li key={index}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="mobile-recipe-note-empty">No recipes found.</div>
        )}
      </div>
      {/* ============================== Open Scrapbook ============================== */}

      <div className="open-recipe-book">
        {/* ============================== Left Scrapbook Page ============================== */}

        <section className="recipe-book-left-page">{renderRecipe(firstRecipe, "Add your first recipe!", 0)}</section>

        {/* ============================== Right Scrapbook Page ============================== */}

        <section className="recipe-book-right-page">{renderRecipe(secondRecipe, "Add more meals!", 1)}</section>

        {/* ============================== Scrapbook Navigation ============================== */}

        <div className="recipe-book-navigation">
          <button
            className="book-page-arrow next-page-arrow"
            onClick={() => setRecipePage((page) => Math.max(0, page - 1))} // Go to the previous scrapbook spread.
            disabled={recipePage === 0}
            aria-label="Previous scrapbook page"
          >
            <span>‹</span>
          </button>

          <span className="recipe-book-page-number">
            {totalPages > 0 ? recipePage + 1 : 0} / {totalPages}
          </span>

          <button
            className="book-page-arrow previous-page-arrow"
            onClick={() => setRecipePage((page) => Math.min(totalPages - 1, page + 1))} // Go to the next scrapbook spread.
            disabled={totalPages === 0 || recipePage === totalPages - 1}
            aria-label="Next scrapbook page"
          >
            <span>›</span>
          </button>
        </div>
      </div>
    </main>
  );
}
