import { useMemo, useState } from "react";

// ============================== Favorites ==============================
//
// This page intentionally mirrors the Recipe Book layout.
// It only shows recipes whose favorite value is true.
//
// It uses the SAME CSS classes as RecipeBook.jsx so the
// scrapbook, mobile recipe notes, images, placeholders,
// ingredients, and page navigation all look the same.
//

export default function Favorites({ recipes, setActiveRecipe, recipesLoading }) {
  // ============================== Favorite Recipes ==============================

  // Only recipes marked as favorites appear on this page.
  const favoriteRecipes = recipes.filter((recipe) => recipe.favorite === true);

  // ============================== Search ==============================

  const [favoriteSearch, setFavoriteSearch] = useState("");

  const filteredFavorites = favoriteRecipes.filter((recipe) => recipe.name.toLowerCase().includes(favoriteSearch.toLowerCase()));

  // ============================== Scrapbook Pages ==============================

  const [recipePage, setRecipePage] = useState(0);

  // Each scrapbook spread contains two recipes.
  const recipesPerPage = 2;

  const totalPages = Math.ceil(filteredFavorites.length / recipesPerPage);

  const pageStart = recipePage * recipesPerPage;

  const firstRecipe = filteredFavorites[pageStart];

  const secondRecipe = filteredFavorites[pageStart + 1];

  // ============================== Recipe Images ==============================

  // Get the saved recipe image from whichever image property exists.
  const getRecipeImage = (recipe) => {
    const image = recipe?.image || recipe?.imageUrl || recipe?.photo || recipe?.images?.[0] || null;

    // Blob URLs cannot survive a page refresh.
    // Treat them as missing so the normal placeholder appears.
    if (typeof image === "string" && image.startsWith("blob:")) {
      return null;
    }

    return image;
  };

  // ============================== Placeholder Choices ==============================

  // These are display-only placeholders.
  // They do not modify the recipe.
  const placeholderChoices = [
    {
      emoji: "🍳",
      message: "I'm hungry!",
      note: "Go make something delicious.",
    },
    {
      emoji: "🍓",
      message: "Feed the family!",
      note: "This spot needs something yummy.",
    },
    {
      emoji: "🍪",
      message: "This page looks lonely...",
      note: "I think it needs a recipe.",
    },
    {
      emoji: "🍕",
      message: "Come on, cook something!",
      note: "You know you're hungry.",
    },
  ];

  // Pick the scrapbook empty-page placeholders once.
  const placeholderSlots = useMemo(() => {
    return Array.from({ length: 2 }, () => {
      return placeholderChoices[Math.floor(Math.random() * placeholderChoices.length)];
    });
  }, []);

  // ============================== Mobile Placeholder ==============================

  // Give each recipe a consistent placeholder based on its ID.
  // This prevents the emoji from changing every time React re-renders.
  const getPlaceholder = (recipe) => {
    const index = recipe?.id
      ? recipe.id
          .toString()
          .split("")
          .reduce((total, char) => total + char.charCodeAt(0), 0) % placeholderChoices.length
      : 0;

    return placeholderChoices[index];
  };

  // ============================== Recipe Slot ==============================

  const renderRecipe = (recipe, slotIndex) => {
    // ============================== Empty Scrapbook Spot ==============================

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

    // ============================== Real Favorite Recipe ==============================

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
          onClick={(e) => {
            // Prevent the outer recipe slot from receiving
            // the same click a second time.
            e.stopPropagation();

            setActiveRecipe(recipe);
          }}
          className="show-more-button"
        >
          Show More →
        </button>
      </div>
    );
  };

  // ============================== Favorites Page ==============================

  return (
    <main className="recipe-book-page">
      {/* ============================== Page Title ============================== */}

      <h2 className="recipe-book-title">⭐ Favorite Recipes</h2>

      {/* ============================== Favorite Search ============================== */}

      <input
        className="recipe-book-search"
        type="text"
        placeholder="Search favorite recipes..."
        value={favoriteSearch}
        onChange={(e) => {
          setFavoriteSearch(e.target.value);

          // Return to the first scrapbook spread when
          // the search results change.
          setRecipePage(0);
        }}
      />

      {/* ============================== Mobile Favorite Recipes ============================== */}

      <div className="mobile-recipe-book">
        {filteredFavorites.length > 0 ? (
          filteredFavorites.map((recipe) => {
            const placeholder = getPlaceholder(recipe);

            return (
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
                    <span>{placeholder.emoji}</span>
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
            );
          })
        ) : (
          <div className="mobile-recipe-note-empty">
            {favoriteRecipes.length === 0 ? "You don't have any favorite recipes yet." : "No favorite recipes found."}
          </div>
        )}
      </div>

      {/* ============================== Open Scrapbook ============================== */}

      <div className="open-recipe-book">
        {/* ============================== Loading Message ============================== */}

        {recipesLoading && (
          <div className="recipe-book-loading">
            <div className="recipe-book-loading-spinner"></div>

            <strong>Loading your favorite recipes...</strong>

            <span>Please wait while your recipes load.</span>
          </div>
        )}

        {/* ============================== Left Scrapbook Page ============================== */}

        <section className="recipe-book-left-page">{renderRecipe(firstRecipe, 0)}</section>

        {/* ============================== Right Scrapbook Page ============================== */}

        <section className="recipe-book-right-page">{renderRecipe(secondRecipe, 1)}</section>

        {/* ============================== Scrapbook Navigation ============================== */}

        <div className="recipe-book-navigation">
          <button
            className="book-page-arrow next-page-arrow"
            onClick={() => setRecipePage((page) => Math.max(0, page - 1))}
            disabled={recipePage === 0}
            aria-label="Previous scrapbook page"
          >
            <span>‹</span>
          </button>

          <span className="recipe-book-page-number">
            {totalPages > 0 ? recipePage + 1 : 0}

            {" / "}

            {totalPages}
          </span>

          <button
            className="book-page-arrow previous-page-arrow"
            onClick={() => setRecipePage((page) => Math.min(totalPages - 1, page + 1))}
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
