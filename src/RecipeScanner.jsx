// ============================== Recipe Scanner ==============================

import { useRef, useState } from "react";
import { supabase } from "./supabase";

export default function RecipeScanner({ onSaveRecipe }) {
  // ============================== Scanner State ==============================

  // Stores ALL recipe images selected by the user.
  const [imageFiles, setImageFiles] = useState([]);

  // Stores preview URLs for the selected/cropped images.
  const [imagePreviews, setImagePreviews] = useState([]);

  // Tracks which pages have been cropped.
  const [croppedPages, setCroppedPages] = useState([]);

  // Stores the recipe returned by Gemini.
  const [recipe, setRecipe] = useState(null);

  // Lets us show a loading message while Gemini is scanning.
  const [scanning, setScanning] = useState(false);

  // Stores any scanner error message.
  const [errorMessage, setErrorMessage] = useState("");

  // ============================== Crop State ==============================

  // Which image is currently being cropped.
  const [cropIndex, setCropIndex] = useState(null);

  // The selected crop area, stored as percentages of the image.
  const [cropArea, setCropArea] = useState({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });

  // Tracks whether the user is currently dragging the crop box.
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);

  // Stores where the crop drag started.
  const cropDragStart = useRef(null);

  // Gives us access to the actual image dimensions.
  const cropImageRef = useRef(null);

  // ============================== Select Images ==============================

  const handleImageSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (!selectedFiles.length) return;

    // A new set of images means we need to start the workflow over.
    setRecipe(null);
    setErrorMessage("");
    setCroppedPages([]);

    // Add the newly selected images to the existing images.
    setImageFiles((prev) => [...prev, ...selectedFiles]);

    // Create preview URLs for the newly selected images.
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));

    setImagePreviews((prev) => [...prev, ...newPreviews]);

    // Allows the user to select the same file again if needed.
    e.target.value = "";
  };

  // ============================== Remove Image ==============================

  const handleRemoveImage = (indexToRemove) => {
    // Revoke the preview URL we are removing.
    URL.revokeObjectURL(imagePreviews[indexToRemove]);

    setImageFiles((prev) => prev.filter((_, index) => index !== indexToRemove));

    setImagePreviews((prev) => prev.filter((_, index) => index !== indexToRemove));

    // Rebuild the cropped-page list after removing an image.
    setCroppedPages((prev) => prev.filter((index) => index !== indexToRemove).map((index) => (index > indexToRemove ? index - 1 : index)));

    // If the user removes an image after scanning,
    // clear the old results because the image collection changed.
    setRecipe(null);
    setErrorMessage("");
  };

  // ============================== Open Crop Editor ==============================

  const handleOpenCrop = (index) => {
    setCropIndex(index);

    // Start with most of the image selected.
    setCropArea({
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    });

    setErrorMessage("");
  };

  // ============================== Close Crop Editor ==============================

  const handleCloseCrop = () => {
    setCropIndex(null);
    setIsDraggingCrop(false);
    cropDragStart.current = null;
  };

  // ============================== Start Crop ==============================

  const handleCropPointerDown = (e) => {
    if (!cropImageRef.current) return;

    const image = cropImageRef.current;
    const rect = image.getBoundingClientRect();

    const startX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));

    const startY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    cropDragStart.current = {
      x: startX,
      y: startY,
    };

    setCropArea({
      x: startX,
      y: startY,
      width: 0,
      height: 0,
    });

    setIsDraggingCrop(true);

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // ============================== Move Crop ==============================

  const handleCropPointerMove = (e) => {
    if (!isDraggingCrop || !cropDragStart.current || !cropImageRef.current) {
      return;
    }

    const image = cropImageRef.current;
    const rect = image.getBoundingClientRect();

    const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));

    const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const startX = cropDragStart.current.x;
    const startY = cropDragStart.current.y;

    setCropArea({
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
    });
  };

  // ============================== Finish Crop Selection ==============================

  const handleCropPointerUp = () => {
    setIsDraggingCrop(false);
    cropDragStart.current = null;
  };

  // ============================== Use Cropped Image ==============================

  const handleSaveCroppedImage = () => {
    if (cropIndex === null || !cropImageRef.current) return;

    const file = imageFiles[cropIndex];

    if (!file) return;

    if (cropArea.width < 1 || cropArea.height < 1) {
      setErrorMessage("Please select an area of the image to crop.");
      return;
    }

    const image = cropImageRef.current;

    // Create a canvas to hold only the selected crop.
    const canvas = document.createElement("canvas");

    // Convert the percentage crop into the original image's pixels.
    const sourceX = (cropArea.x / 100) * image.naturalWidth;
    const sourceY = (cropArea.y / 100) * image.naturalHeight;

    const sourceWidth = (cropArea.width / 100) * image.naturalWidth;
    const sourceHeight = (cropArea.height / 100) * image.naturalHeight;

    canvas.width = Math.round(sourceWidth);
    canvas.height = Math.round(sourceHeight);

    const context = canvas.getContext("2d");

    if (!context) {
      setErrorMessage("Unable to crop this image.");
      return;
    }

    // Draw only the selected portion onto the canvas.
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

    // Turn the cropped canvas into a file.
    canvas.toBlob((blob) => {
      if (!blob) {
        setErrorMessage("Unable to create the cropped image.");
        return;
      }

      // Create a new File from the cropped image.
      // This replaces the original page image inside the scanner.
      const croppedFile = new File([blob], `cropped-recipe-page-${cropIndex + 1}.png`, {
        type: "image/png",
      });

      // Create a new preview URL for the cropped image.
      const croppedPreview = URL.createObjectURL(croppedFile);

      // Revoke the old preview URL because the original image
      // is being replaced by the cropped version.
      URL.revokeObjectURL(imagePreviews[cropIndex]);

      // Replace the original image file with the cropped file.
      setImageFiles((prev) => prev.map((item, index) => (index === cropIndex ? croppedFile : item)));

      // Replace the image preview with the cropped image.
      setImagePreviews((prev) => prev.map((item, index) => (index === cropIndex ? croppedPreview : item)));

      // Mark this page as cropped.
      setCroppedPages((prev) => (prev.includes(cropIndex) ? prev : [...prev, cropIndex]));

      // Clear any previous error.
      setErrorMessage("");

      // Close the crop editor.
      handleCloseCrop();
    }, "image/png");
  };

  // ============================== Convert Image to Base64 ==============================

  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        // FileReader returns:
        // data:image/jpeg;base64,XXXXXXXX
        //
        // Gemini only needs the part AFTER "base64,".
        const base64String = reader.result.split(",")[1];

        resolve(base64String);
      };

      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  };

  // ============================== Scan Recipe ==============================

  const handleScanRecipe = async () => {
    if (!imageFiles.length) {
      setErrorMessage("Please choose at least one recipe image first.");
      return;
    }

    // Require every selected page to be cropped before scanning.
    if (croppedPages.length !== imageFiles.length) {
      setErrorMessage("Please crop each recipe page first. Once every page is cropped, you can scan the recipe.");
      return;
    }

    setScanning(true);
    setErrorMessage("");
    setRecipe(null);

    try {
      // Convert EVERY cropped image into Base64.
      const images = await Promise.all(
        imageFiles.map(async (file) => ({
          image: await imageToBase64(file),
          mimeType: file.type,
        })),
      );

      // ============================== Call Supabase ==============================

      // Send ALL cropped recipe pages to the Edge Function together.
      const { data, error } = await supabase.functions.invoke("scan-recipe", {
        body: {
          images,
        },
      });

      // ============================== Handle Supabase Error ==============================

      if (error) {
        console.error("Scanner function error:", error);

        throw new Error("The scanner could not process the recipe images.");
      }

      // ============================== Handle Scanner Error ==============================

      if (!data?.success || !data?.recipe) {
        throw new Error(data?.error || "The scanner did not return a recipe.");
      }

      // ============================== Store Recipe ==============================

      setRecipe(data.recipe);
    } catch (error) {
      console.error("Recipe scanner error:", error);

      setErrorMessage(error.message || "Something went wrong while scanning the recipe.");
    } finally {
      setScanning(false);
    }
  };

  // ============================== Send Recipe to New Recipe ==============================

  const handleSendRecipeToNewRecipe = () => {
    if (!recipe || !onSaveRecipe) return;

    // The first cropped image becomes the recipe's main photo.
    // The full set of cropped pages was already used for scanning.
    const recipeImage = imagePreviews[0] || "";

    // Send BOTH the scanned recipe and the cropped recipe image
    // to App.jsx.
    onSaveRecipe(recipe, recipeImage);
  };

  // ============================== Save Original Recipe Image ==============================

  const handleSaveImage = (index) => {
    const file = imageFiles[index];

    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    const link = document.createElement("a");

    link.href = imageUrl;

    link.download = file.name || `recipe-image-${index + 1}.jpg`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(imageUrl);
  };

  // ============================== Page ==============================

  return (
    <main className="recipe-scanner-page">
      {/* ============================== Scanner Header ============================== */}

      <h1>📷 Recipe Scanner</h1>

      <p>Turn your recipe photos into an editable recipe. Follow the steps below in order.</p>

      {/* ============================== Scanner Steps ============================== */}

      <div className="scanner-steps">
        <div className="scanner-step">
          <div className="scanner-step-number">1</div>

          <div>
            <strong>Choose your recipe images</strong>

            <p>Add one or more pages of your recipe.</p>
          </div>
        </div>

        <div className="scanner-step">
          <div className="scanner-step-number">2</div>

          <div>
            <strong>Crop the recipe image you would like to keep.</strong>

            <p>Remove extra background so only the recipe image is visible.</p>
          </div>
        </div>

        <div className="scanner-step">
          <div className="scanner-step-number">3</div>

          <div>
            <strong>Scan and send to New Recipe</strong>

            <p>
              After your desired recipe image is cropped, scan the recipe, extract the text, and your text and cropped image will go automatically to
              new recipe page.
            </p>
          </div>
        </div>
      </div>

      {/* ============================== Choose Images ============================== */}

      <div className="scanner-image-section">
        <label htmlFor="recipe-scanner-image">📷 Choose Recipe Images</label>

        <input id="recipe-scanner-image" type="file" accept="image/*" multiple onChange={handleImageSelect} />

        <p>For long recipes, select multiple pages in the correct order.</p>
      </div>

      {/* ============================== Image Previews ============================== */}

      {imagePreviews.length > 0 && (
        <div className="scanner-preview-section">
          <h3>Recipe Pages ({imagePreviews.length})</h3>

          <div className="scanner-image-list">
            {imagePreviews.map((preview, index) => (
              <div className="scanner-image-item" key={`${preview}-${index}`}>
                {/* Page Number */}

                <div className="scanner-image-number">
                  Page {index + 1}
                  {croppedPages.includes(index) && <span className="scanner-cropped-status"> ✓ Cropped</span>}
                </div>

                {/* Image / Crop Editor */}

                {cropIndex === index ? (
                  <div>
                    <p className="recipe-crop-instruction">✂️ Drag across the part of the image you want to keep.</p>

                    <div
                      className="recipe-crop-image-container"
                      onPointerDown={handleCropPointerDown}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerUp}
                      onPointerCancel={handleCropPointerUp}
                    >
                      <img ref={cropImageRef} src={preview} alt={`Crop recipe page ${index + 1}`} className="recipe-crop-image" draggable="false" />

                      <div
                        className="recipe-crop-selection"
                        style={{
                          left: `${cropArea.x}%`,
                          top: `${cropArea.y}%`,
                          width: `${cropArea.width}%`,
                          height: `${cropArea.height}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <img src={preview} alt={`Recipe page ${index + 1}`} className="scanner-image-preview" />
                )}

                {/* Image Actions */}

                <div className="scanner-image-actions">
                  {cropIndex === index ? (
                    <>
                      <button type="button" onClick={handleCloseCrop} className="scanner-crop-cancel-button">
                        Cancel
                      </button>

                      <button type="button" onClick={handleSaveCroppedImage} className="scanner-save-cropped-image-button">
                        ✓ Use This Crop
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => handleOpenCrop(index)} className="scanner-crop-image-button">
                        ✂️ Crop Image
                      </button>

                      <button type="button" onClick={() => handleRemoveImage(index)} className="scanner-remove-image-button">
                        ✖ Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ============================== Scan Recipe ============================== */}

          <div className="scanner-next-step">
            {croppedPages.length < imageFiles.length && (
              <p className="scanner-step-message">
                ✂️ <strong>Next:</strong> Crop every recipe page above.
                <br />
                Once all pages show ✓ Cropped, you can scan the recipe.
              </p>
            )}

            {croppedPages.length === imageFiles.length && (
              <p className="scanner-step-message scanner-ready-message">
                ✅ All recipe pages are cropped.
                <br />
                You're ready to scan the recipe text.
              </p>
            )}

            <button
              type="button"
              onClick={handleScanRecipe}
              disabled={scanning || croppedPages.length !== imageFiles.length}
              className="scanner-scan-button"
            >
              {scanning ? "🔍 Scanning Recipe..." : `🔍 Scan ${imageFiles.length} ${imageFiles.length === 1 ? "Page" : "Pages"}`}
            </button>
          </div>

          {/* ============================== Send to New Recipe ============================== */}

          {recipe && (
            <div className="scanner-extract-section">
              <h3>✅ Recipe Text Ready</h3>

              <p>Your recipe text has been extracted and your cropped recipe image is ready.</p>

              <p>Continue to New Recipe to review and save everything.</p>

              <button type="button" onClick={handleSendRecipeToNewRecipe} className="scanner-save-recipe-button">
                📝 Continue to New Recipe
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================== Error ============================== */}

      {errorMessage && <div className="scanner-error-message">⚠️ {errorMessage}</div>}

      {/* ============================== Scanned Recipe ============================== */}

      {recipe && (
        <section className="scanned-recipe-results">
          <h2>Recipe Results</h2>

          {/* ============================== Recipe Name ============================== */}

          {recipe.recipeName && (
            <div className="scanned-recipe-name">
              <h3>Recipe Name</h3>

              <p>{recipe.recipeName}</p>
            </div>
          )}

          {/* ============================== Ingredients ============================== */}

          <div className="scanned-ingredients">
            <h3>Ingredients</h3>

            {recipe.ingredients?.length > 0 ? (
              <ul>
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            ) : (
              <p>No ingredients were detected.</p>
            )}
          </div>

          {/* ============================== Instructions ============================== */}

          <div className="scanned-instructions">
            <h3>Instructions</h3>

            {recipe.instructions?.length > 0 ? (
              <ol>
                {recipe.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            ) : (
              <p>No instructions were detected.</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
