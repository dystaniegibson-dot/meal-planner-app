// ============================== New Recipe Page ==============================

export default function NewRecipe({
  fullRecipePaste,
  setFullRecipePaste,
  autoParseRecipe,
  newRecipe,
  setNewRecipe,
  saveRecipe,
  recipeAdded,
  instructionRefs,
  inputRefs,
}) {
  // ============================== Add Recipe Items ==============================

  // Add a new ingredient and immediately move focus to it.
  const addIngredient = () => {
    const nextIndex = newRecipe.ingredients.length;

    setNewRecipe((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, ""],
    }));

    setTimeout(() => {
      inputRefs.current[nextIndex]?.focus();
    }, 0);
  };

  // Add a new instruction and immediately move focus to it.
  const addInstruction = () => {
    const nextIndex = newRecipe.instructions.length;

    setNewRecipe((prev) => ({
      ...prev,
      instructions: [...prev.instructions, ""],
    }));

    setTimeout(() => {
      instructionRefs.current[nextIndex]?.focus();
    }, 0);
  };

  return (
    <main className="new-recipe-page">
      {/* ============================== Recipe Instructions ============================== */}

      <div className="new-recipe-content">
        <div className="recipe-entry-notice">
          <p className="recipe-entry-notice-text">
            📷 <strong>Adding a Recipe from an Image</strong>
            <br />
            Use Google Lens to extract the recipe text from your recipe image. Then crop the original image so it shows only the recipe and paste both
            the recipe text and the cropped image into the box below.
            <br />
            <br />
            ⚠️ <strong>Please double-check your recipe after using Auto Fill!</strong> Auto Fill does its best to sort the recipe into the correct
            sections, but ingredients and instructions may occasionally be placed or formatted incorrectly. Review the recipe before saving it.
          </p>

          {/* ============================== Recipe Form ============================== */}

          <h3>Add Recipe</h3>

          {/* ============================== Recipe Photo ============================== */}

          <div className="recipe-photo-section">
            <label className="recipe-photo-label">🖼️ Recipe Photo</label>

            <p className="recipe-photo-description">Add the cropped recipe image you want displayed with this recipe in your Recipe Book.</p>

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
                    image: event.target.result,
                  }));
                };

                reader.readAsDataURL(file);
              }}
            />
          </div>

          {/* ============================== Recipe Text ============================== */}

          <textarea
            className="recipe-paste-box"
            placeholder="Paste full recipe here..."
            value={fullRecipePaste}
            onChange={(e) => setFullRecipePaste(e.target.value)}
          />

          {/* ============================== Auto Fill ============================== */}

          <button
            className="auto-fill-button"
            onClick={autoParseRecipe} // Parse the pasted recipe into the recipe fields.
          >
            ⚡ Auto Fill Recipe
          </button>

          {/* ============================== Recipe Name ============================== */}

          <input
            className="recipe-name-input"
            placeholder="Recipe Name"
            value={newRecipe.name}
            onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
          />

          {/* ============================== Recipe Image Preview ============================== */}

          {newRecipe.image && <img className="recipe-image-preview" src={newRecipe.image} />}

          {/* ============================== Ingredients ============================== */}

          <div className="ingredients-section">
            <h4>Ingredients</h4>

            {(newRecipe.ingredients || []).map((ing, i) => (
              <div key={i} className="recipe-input-row">
                <input
                  placeholder="Add ingredients here..."
                  onKeyDown={(e) => {
                    // ENTER / MOBILE NEXT → add a new ingredient.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addIngredient();
                    }

                    // BACKSPACE → delete an empty ingredient, except the first one.
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
                  enterKeyHint="next"
                  ref={(el) => (inputRefs.current[i] = el)}
                  onChange={(e) => {
                    const updated = [...newRecipe.ingredients];
                    updated[i] = e.target.value;

                    setNewRecipe({
                      ...newRecipe,
                      ingredients: updated,
                    });
                  }}
                />

                {ing && (
                  <button
                    className="remove-recipe-item-button"
                    onClick={() => {
                      const updated = newRecipe.ingredients.filter((_, idx) => idx !== i);

                      setNewRecipe({
                        ...newRecipe,
                        ingredients: updated.length ? updated : [""],
                      });
                    }}
                  >
                    ✖
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="add-recipe-item-button" onClick={addIngredient} aria-label="Add ingredient">
              +
            </button>
          </div>

          {/* ============================== Instructions ============================== */}

          <div className="instructions-section">
            <h4>Instructions</h4>

            {(newRecipe.instructions || []).map((step, i) => (
              <div key={i} className="recipe-input-row">
                <input
                  ref={(el) => (instructionRefs.current[i] = el)}
                  type="text"
                  enterKeyHint="next"
                  value={step}
                  placeholder="Add instructions here..."
                  onKeyDown={(e) => {
                    // ENTER → add a new instruction step.
                    if (e.key === "Enter") {
                      e.preventDefault();

                      const nextIndex = newRecipe.instructions.length;

                      setNewRecipe((prev) => ({
                        ...prev,
                        instructions: [...prev.instructions, ""],
                      }));

                      setTimeout(() => {
                        instructionRefs.current[nextIndex]?.focus();
                      }, 0);
                    }

                    // BACKSPACE → delete an empty step, except Step 1.
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
                    const updated = [...newRecipe.instructions];
                    updated[i] = e.target.value;

                    setNewRecipe({
                      ...newRecipe,
                      instructions: updated,
                    });
                  }}
                />

                {step && (
                  <button
                    className="remove-recipe-item-button"
                    onClick={() => {
                      const updated = newRecipe.instructions.filter((_, idx) => idx !== i);

                      setNewRecipe({
                        ...newRecipe,
                        instructions: updated.length ? updated : [""],
                      });
                    }}
                  >
                    ✖
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="add-recipe-item-button"
              onClick={() => {
                const nextIndex = newRecipe.instructions.length;

                setNewRecipe((prev) => ({
                  ...prev,
                  instructions: [...prev.instructions, ""],
                }));

                setTimeout(() => {
                  instructionRefs.current[nextIndex]?.focus();
                }, 0);
              }}
              aria-label="Add instruction"
            >
              +
            </button>
          </div>

          {/* ============================== Recipe Actions ============================== */}

          <div className="recipe-actions">
            <button
              className="save-recipe-button"
              onClick={saveRecipe} // Save the completed recipe.
            >
              {recipeAdded ? "✅ Recipe Added!" : "Save Recipe"}
            </button>

            <button
              className="clear-recipe-button"
              onClick={() => {
                setNewRecipe({
                  name: "",
                  ingredients: [""],
                  instructions: [""],
                  image: "",
                  imageIngredients: [],
                  imageInstructions: [],
                  favorite: false,
                  category: "",
                });

                setFullRecipePaste(""); // Clear the pasted recipe text.
              }}
            >
              🗑️ Clear Recipe
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
