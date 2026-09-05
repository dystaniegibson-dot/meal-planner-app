// ============================== Discover Page ==============================

export default function Discover({ search, setSearch, apiRecipes, scrollToTop, setPageCount, setActiveRecipe }) {
  // ============================== Discover Content ==============================

  return (
    <main className="discover-page">
      {/* ============================== Discover Heading ============================== */}

      <h2 className="discover-title">🔍 Discover</h2>

      {/* ============================== Recipe Search ============================== */}

      <div className="discover-search-container">
        <input className="discover-search" type="text" placeholder="Search recipes..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* ============================== Discover Recipes ============================== */}

      <div className="discover-grid">
        {(apiRecipes || []).map((r, i) => {
          // Some API results may be empty, so skip an empty recipe instead of rendering it.
          if (!r) return null;

          return (
            <article
              key={i}
              className="discover-recipe-card"
              onClick={() => setActiveRecipe(r)} // Open the selected recipe in the recipe popup.
            >
              <h3 className="discover-recipe-title">{r.name || "No Name"}</h3>

              {/* Only display the image when the recipe has one. */}
              {r.image && <img className="discover-recipe-image" src={r.image} alt={r.name} />}
            </article>
          );
        })}
      </div>

      {/* ============================== Load More ============================== */}

      {apiRecipes.length > 0 && (
        <div className="discover-load-more">
          <button
            className="discover-load-more-button"
            onClick={() => {
              setPageCount((prev) => prev + 1); // Ask App.jsx to load the next group of recipes.
            }}
          >
            Load More
          </button>
        </div>
      )}

      {/* ============================== Scroll To Top ============================== */}

      <button
        className="discover-scroll-top"
        onClick={scrollToTop} // Scroll the page back to the top.
        aria-label="Scroll to top"
      >
        ↑
      </button>
    </main>
  );
}
