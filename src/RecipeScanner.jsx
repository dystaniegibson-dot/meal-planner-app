// ============================== Recipe Scanner ==============================

import { useRef, useState } from "react";
import { supabase } from "./supabase";

export default function RecipeScanner({ onSaveRecipe }) {
  // ============================== Scanner State ==============================

  // Stores the ORIGINAL images.
  // These files are NEVER replaced by the crop.
  // They are the files sent to OCR.
  const [imageFiles, setImageFiles] = useState([]);

  // Stores previews of the ORIGINAL images.
  const [imagePreviews, setImagePreviews] = useState([]);

  // Stores the SEPARATE cropped copy that will become
  // the recipe image on the New Recipe page.
  const [recipeImagePreview, setRecipeImagePreview] = useState("");

  // Tracks whether the recipe image has been cropped.
  const [isRecipeImageCropped, setIsRecipeImageCropped] = useState(false);

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

    // A new image selection means the scan must start over.
    setRecipe(null);
    setErrorMessage("");

    // Remove any previous cropped recipe image.
    if (recipeImagePreview) {
      URL.revokeObjectURL(recipeImagePreview);
    }

    setRecipeImagePreview("");
    setIsRecipeImageCropped(false);

    // Add the ORIGINAL files.
    setImageFiles((prev) => [...prev, ...selectedFiles]);

    // Create previews for the ORIGINAL files.
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

    // The first image is the only image that can be the recipe photo.
    if (indexToRemove === 0) {
      if (recipeImagePreview) {
        URL.revokeObjectURL(recipeImagePreview);
      }

      setRecipeImagePreview("");
      setIsRecipeImageCropped(false);
    }

    // If the user removes an image after scanning,
    // clear the old results because the image collection changed.
    setRecipe(null);
    setErrorMessage("");
  };

  // ============================== Open Crop Editor ==============================

  const handleOpenCrop = (index) => {
    // ONLY the first image is used as the New Recipe image.
    if (index !== 0) return;

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

  // ============================== Create Cropped Recipe Image ==============================

  const handleSaveCroppedImage = () => {
    if (cropIndex !== 0 || !cropImageRef.current) return;

    // IMPORTANT:
    // This is the ORIGINAL file.
    // We read from it but NEVER replace it.
    const file = imageFiles[0];

    if (!file) return;

    if (cropArea.width < 1 || cropArea.height < 1) {
      setErrorMessage("Please select an area of the image to crop.");
      return;
    }

    const image = cropImageRef.current;

    // Create a separate canvas for the recipe photo.
    const canvas = document.createElement("canvas");

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

    // Draw ONLY the selected area onto the separate canvas.
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

    // Create the cropped copy.
    canvas.toBlob((blob) => {
      if (!blob) {
        setErrorMessage("Unable to create the cropped image.");
        return;
      }

      const croppedFile = new File([blob], "recipe-image-cropped.png", {
        type: "image/png",
      });

      // Create a preview for the NEW cropped copy.
      const croppedPreview = URL.createObjectURL(croppedFile);

      // Remove the previous cropped recipe image, if one exists.
      if (recipeImagePreview) {
        URL.revokeObjectURL(recipeImagePreview);
      }

      // IMPORTANT:
      // We ONLY save the cropped copy here.
      //
      // imageFiles[0] remains the ORIGINAL full page.
      setRecipeImagePreview(croppedPreview);

      setIsRecipeImageCropped(true);

      setErrorMessage("");

      handleCloseCrop();
    }, "image/png");
  };

  // ============================== Convert Image to Base64 ==============================
  //
  // This version is designed to be safer on mobile devices.
  //
  // Instead of loading the original image into a huge Base64 data URL first,
  // we use a temporary object URL. This avoids making an unnecessary full-size
  // copy of the image in memory.
  //
  // We also process one image at a time instead of processing all recipe pages
  // simultaneously. This is especially important on phones, where available
  // memory can be much lower than on a PC.
  //
  // The image is resized to a maximum of 2000 pixels on its longest side.
  // This keeps the entire recipe page readable while preventing extremely
  // large phone-camera images from overwhelming the browser.
  //

  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("No image file was provided."));
        return;
      }

      // Create a temporary browser URL for the original image.
      // This is much lighter on memory than immediately converting
      // the entire original file into a Base64 data URL.
      const objectUrl = URL.createObjectURL(file);

      const image = new Image();

      // Make sure the temporary URL is released after we're finished.
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };

      image.onload = () => {
        try {
          // Keep the entire recipe page, but reduce extremely large
          // phone-camera images before sending them to Gemini.
          const maxDimension = 2000;

          let width = image.naturalWidth;
          let height = image.naturalHeight;

          if (!width || !height) {
            cleanup();
            reject(new Error("The selected image has invalid dimensions."));
            return;
          }

          // Resize only when necessary.
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }

          // Create a canvas for the OCR copy.
          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");

          if (!context) {
            cleanup();
            reject(new Error("Unable to prepare the image for scanning."));
            return;
          }

          // Draw the complete recipe page onto the canvas.
          context.drawImage(image, 0, 0, width, height);

          // The original image is no longer needed by this point.
          cleanup();

          // Convert the prepared image to JPEG.
          canvas.toBlob(
            (blob) => {
              // Release the canvas memory as soon as possible.
              canvas.width = 1;
              canvas.height = 1;

              if (!blob) {
                reject(new Error("Unable to create the scanning image."));
                return;
              }

              // Convert ONLY the smaller prepared image to Base64.
              const reader = new FileReader();

              reader.onload = () => {
                try {
                  const result = reader.result;

                  if (typeof result !== "string") {
                    reject(new Error("The prepared image could not be read."));
                    return;
                  }

                  const commaIndex = result.indexOf(",");

                  if (commaIndex === -1) {
                    reject(new Error("The prepared image had an invalid format."));
                    return;
                  }

                  // Remove the "data:image/jpeg;base64," portion.
                  const base64String = result.slice(commaIndex + 1);

                  if (!base64String) {
                    reject(new Error("The prepared image contained no data."));
                    return;
                  }

                  resolve(base64String);
                } catch (error) {
                  reject(error);
                }
              };

              reader.onerror = () => {
                reject(new Error("Unable to read the prepared image."));
              };

              reader.readAsDataURL(blob);
            },
            "image/jpeg",
            0.85,
          );
        } catch (error) {
          cleanup();
          reject(new Error(error?.message || "Unable to prepare the image for scanning."));
        }
      };

      image.onerror = () => {
        cleanup();
        reject(new Error("The phone or browser could not decode this image. Please try selecting the photo again."));
      };

      // Load the ORIGINAL image from the temporary browser URL.
      image.src = objectUrl;
    });
  };

  // ============================== Scan Recipe ==============================

  // ============================== Scan Recipe ==============================

  const handleScanRecipe = async () => {
    if (!imageFiles.length) {
      setErrorMessage("❌ Scanner Error: No recipe images were selected.");
      return;
    }

    // The recipe photo must be cropped,
    // but the crop is NOT used for OCR.
    if (!isRecipeImageCropped) {
      setErrorMessage("❌ Scanner Error: Please crop the recipe image first.");
      return;
    }

    setScanning(true);
    setErrorMessage("");
    setRecipe(null);

    try {
      // ============================================================
      // STEP 1 — PREPARE THE IMAGES
      // ============================================================

      let images;

      try {
        setErrorMessage("🔄 Step 1/3: Preparing recipe images...");

        // Process the images ONE AT A TIME.
        //
        // This keeps memory usage much lower on phones.
        // The finished Base64 data is kept, but the temporary canvas/image
        // used for each page is released before the next page is prepared.

        images = [];

        for (const file of imageFiles) {
          const preparedImage = await imageToBase64(file);

          images.push({
            image: preparedImage,

            // IMPORTANT:
            // imageToBase64() converts every scanning image to JPEG,
            // so the MIME type must also be JPEG.
            mimeType: "image/jpeg",
          });
        }

        console.log("Scanner: images prepared successfully", images.length);
      } catch (error) {
        console.error("Scanner Step 1 Error:", error);

        throw new Error(`❌ Image preparation failed: ${error.message || "The selected image could not be prepared."}`);
      }

      // ============================================================
      // STEP 2 — CALL SUPABASE
      // ============================================================

      let data;
      let error;

      try {
        setErrorMessage("🔄 Step 2/3: Sending images to the scanner...");

        const response = await supabase.functions.invoke("scan-recipe", {
          body: {
            images,
          },
        });

        data = response.data;
        error = response.error;

        console.log("Scanner: Supabase response received", {
          data,
          error,
        });
      } catch (invokeError) {
        console.error("Scanner Step 2 Network/Invoke Error:", invokeError);

        throw new Error(`❌ Scanner connection failed: ${invokeError.message || "The scanner request could not be sent."}`);
      }

      // ============================================================
      // STEP 3 — CHECK SUPABASE FUNCTION ERROR
      // ============================================================

      if (error) {
        console.error("Scanner Step 3 Supabase Error:", error);

        // Supabase may give us the actual Edge Function response
        // inside error.context. We want to read that response so
        // the app can tell us WHY the scanner failed instead of
        // only saying "non-2xx status code."

        let serverError = "";

        try {
          if (error.context && typeof error.context.json === "function") {
            const errorBody = await error.context.json();

            console.error("Scanner Edge Function Error Body:", errorBody);

            serverError = errorBody?.error || errorBody?.message || errorBody?.details || "";
          }
        } catch (readError) {
          console.error("Could not read Edge Function error response:", readError);
        }

        const errorDetails = serverError || error.message || error.details || error.hint || "The scanner function returned an unknown error.";

        throw new Error(`❌ Scanner function error: ${errorDetails}`);
      }

      // ============================================================
      // STEP 4 — CHECK THE ACTUAL SCANNER RESULT
      // ============================================================

      console.log("Scanner: final response data", data);

      if (!data) {
        throw new Error("❌ Scanner result error: No response was returned.");
      }

      if (!data.success) {
        throw new Error(`❌ Scanner result error: ${data.error || "The scanner did not report success."}`);
      }

      if (!data.recipe) {
        throw new Error("❌ Scanner result error: The scanner finished, but no recipe was returned.");
      }

      // ============================================================
      // SUCCESS
      // ============================================================

      console.log("Scanner: recipe successfully extracted", data.recipe);

      setRecipe(data.recipe);
      setErrorMessage("");
    } catch (error) {
      console.error("========================================");
      console.error("RECIPE SCANNER FAILED");
      console.error("Error:", error);
      console.error("Message:", error?.message);
      console.error("Full error:", JSON.stringify(error, null, 2));
      console.error("========================================");

      setErrorMessage(error?.message || "❌ Scanner error: Something went wrong while scanning the recipe.");
    } finally {
      setScanning(false);
    }
  };

  // ============================== Send Recipe to New Recipe ==============================

  const handleSendRecipeToNewRecipe = () => {
    if (!recipe || !onSaveRecipe || !recipeImagePreview) {
      return;
    }

    // IMPORTANT:
    //
    // recipeImagePreview is the CROPPED COPY.
    //
    // The OCR recipe was created from the ORIGINAL
    // full-size imageFiles.
    onSaveRecipe(recipe, recipeImagePreview);
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

            <p>Only the first image is cropped for the New Recipe photo. The original full page is still used for scanning.</p>
          </div>
        </div>

        <div className="scanner-step">
          <div className="scanner-step-number">3</div>

          <div>
            <strong>Scan and send to New Recipe</strong>

            <p>The full recipe pages are scanned for ingredients and instructions, while the cropped copy becomes the recipe image.</p>
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
                {/* ============================== Page Number ============================== */}

                <div className="scanner-image-number">
                  {index === 0 ? "Recipe Image" : `OCR Image ${index + 1}`}

                  {index === 0 && isRecipeImageCropped && <span className="scanner-cropped-status"> ✓ Cropped</span>}
                </div>

                {/* ============================== Image / Crop Editor ============================== */}

                {cropIndex === index ? (
                  <div>
                    <p className="recipe-crop-instruction">✂️ Drag across the part of the image you want to use as the recipe photo.</p>

                    <div
                      className="recipe-crop-image-container"
                      onPointerDown={handleCropPointerDown}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerUp}
                      onPointerCancel={handleCropPointerUp}
                      style={{
                        position: "relative",
                        width: "fit-content",
                        maxWidth: "100%",
                        margin: "0 auto",
                      }}
                    >
                      <img
                        ref={cropImageRef}
                        src={preview}
                        alt="Crop recipe image"
                        className="recipe-crop-image"
                        draggable="false"
                        style={{
                          display: "block",
                          maxWidth: "100%",
                          maxHeight: "70vh",
                          width: "auto",
                          height: "auto",
                        }}
                      />

                      <div
                        className="recipe-crop-selection"
                        style={{
                          left: `${cropArea.x}%`,
                          top: `${cropArea.y}%`,
                          width: `${cropArea.width}%`,
                          height: `${cropArea.height}%`,
                        }}
                      />

                      {/* ============================== Floating Crop Button ============================== */}

                      {cropArea.width > 1 && cropArea.height > 1 && (
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveCroppedImage();
                          }}
                          className="scanner-save-cropped-image-button"
                          style={{
                            position: "absolute",
                            left: `${Math.min(cropArea.x + cropArea.width - 2, 72)}%`,
                            top: `${Math.min(cropArea.y + cropArea.height + 1, 88)}%`,
                            zIndex: 10,
                            minHeight: "44px",
                            padding: "10px 16px",
                            borderRadius: "10px",
                            fontWeight: "600",
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            touchAction: "manipulation",
                          }}
                        >
                          ✓ Use This Crop
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <img src={preview} alt={index === 0 ? "Recipe image" : `OCR image ${index + 1}`} className="scanner-image-preview" />
                )}

                {/* ============================== Image Actions ============================== */}

                <div className="scanner-image-actions">
                  {cropIndex === index ? (
                    <button type="button" onClick={handleCloseCrop} className="scanner-crop-cancel-button">
                      Cancel
                    </button>
                  ) : (
                    <>
                      {/* ONLY the first image can be cropped. */}

                      {index === 0 && (
                        <button type="button" onClick={() => handleOpenCrop(index)} className="scanner-crop-image-button">
                          ✂️ Crop Recipe Image
                        </button>
                      )}

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
            {!isRecipeImageCropped && (
              <p className="scanner-step-message">
                ✂️ <strong>Next:</strong> Crop the Recipe Image above.
                <br />
                Additional OCR images do not need to be cropped.
              </p>
            )}

            {isRecipeImageCropped && (
              <p className="scanner-step-message scanner-ready-message">
                ✅ Recipe image is cropped.
                <br />
                The original full pages will be used for OCR.
              </p>
            )}

            <button type="button" onClick={handleScanRecipe} disabled={scanning || !isRecipeImageCropped} className="scanner-scan-button">
              {scanning ? "🔍 Scanning Recipe..." : `🔍 Scan ${imageFiles.length} ${imageFiles.length === 1 ? "Page" : "Pages"}`}
            </button>
          </div>

          {/* ============================== Send to New Recipe ============================== */}

          {recipe && (
            <div className="scanner-extract-section">
              <h3>✅ Recipe Text Ready</h3>

              <p>Your recipe text was extracted from the full recipe pages.</p>

              <p>Your cropped recipe image is ready to use as the recipe photo.</p>

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
