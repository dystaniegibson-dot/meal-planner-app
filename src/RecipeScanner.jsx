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

      // Convert the cropped image into permanent image data.
      // IMPORTANT:
      // We do NOT save the temporary blob: URL.
      // A blob: URL only exists in the current browser session,
      // so it cannot be saved to Supabase and reused later.
      //
      // The actual image data is stored as a data URL instead.
      const reader = new FileReader();

      reader.onloadend = () => {
        const croppedDataUrl = reader.result;

        if (typeof croppedDataUrl !== "string" || !croppedDataUrl) {
          setErrorMessage("Unable to save the cropped image.");
          return;
        }

        // If the previous preview was a temporary blob URL,
        // clean it up before replacing it.
        if (recipeImagePreview?.startsWith("blob:")) {
          URL.revokeObjectURL(recipeImagePreview);
        }

        // Save the ACTUAL image data, not a temporary blob URL.
        setRecipeImagePreview(croppedDataUrl);

        setIsRecipeImageCropped(true);

        setErrorMessage("");

        handleCloseCrop();
      };

      reader.readAsDataURL(blob);
    }, "image/png");
  };

  // ============================== Convert Image to Base64 ==============================
  //
  // MOBILE-SAFE IMAGE PREPARATION
  //
  // Phones can handle image files differently from desktop browsers.
  //
  // We first try createImageBitmap(), which is efficient for large images.
  // If the phone cannot decode the image that way, we automatically fall
  // back to the traditional FileReader + Image method.
  //
  // This gives the scanner two ways to prepare an image instead of depending
  // on one browser implementation.
  //
  // The full recipe page is preserved for OCR.
  // The image is only resized to make processing easier on mobile devices.
  //

  const imageToBase64 = async (file) => {
    if (!file) {
      throw new Error("No image file was provided.");
    }

    const maxDimension = 1800;

    // ============================== Method 1 ==============================
    // Try createImageBitmap first.
    //
    // This is generally efficient for large camera images.
    // If the browser cannot decode the image this way, we fall back
    // to the traditional image-loading method below.

    try {
      if ("createImageBitmap" in window) {
        const bitmap = await createImageBitmap(file);

        try {
          let width = bitmap.width;
          let height = bitmap.height;

          // Keep the image proportional while reducing very large images.
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Unable to create the image canvas.");
          }

          context.drawImage(bitmap, 0, 0, width, height);

          const base64String = await new Promise((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Unable to create the scanning image."));
                  return;
                }

                const reader = new FileReader();

                reader.onload = () => {
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

                  resolve(result.slice(commaIndex + 1));
                };

                reader.onerror = () => {
                  reject(new Error("Unable to read the prepared image."));
                };

                reader.readAsDataURL(blob);
              },
              "image/jpeg",
              0.85,
            );
          });

          // Release canvas memory.
          canvas.width = 1;
          canvas.height = 1;

          return base64String;
        } finally {
          // Always release the decoded bitmap.
          bitmap.close();
        }
      }
    } catch (bitmapError) {
      // Do NOT stop the scanner here.
      //
      // Some mobile browsers may fail with createImageBitmap even though
      // they can successfully display and process the same image another way.

      console.warn("createImageBitmap failed. Trying traditional image loading instead:", bitmapError);
    }

    // ============================== Method 2 ==============================
    // Traditional FileReader + Image fallback.
    //
    // This is the more widely compatible browser method.
    // It gives Android Chrome another way to process the image.

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = async () => {
          try {
            let width = image.naturalWidth;
            let height = image.naturalHeight;

            if (!width || !height) {
              throw new Error("The selected image has invalid dimensions.");
            }

            // Keep the image proportional.
            if (width > maxDimension || height > maxDimension) {
              if (width >= height) {
                height = Math.round((height / width) * maxDimension);
                width = maxDimension;
              } else {
                width = Math.round((width / height) * maxDimension);
                height = maxDimension;
              }
            }

            const canvas = document.createElement("canvas");

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d");

            if (!context) {
              throw new Error("Unable to create the image canvas.");
            }

            // Draw the complete recipe page.
            context.drawImage(image, 0, 0, width, height);

            const base64String = await new Promise((resolveBlob, rejectBlob) => {
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    rejectBlob(new Error("Unable to create the scanning image."));
                    return;
                  }

                  const blobReader = new FileReader();

                  blobReader.onload = () => {
                    const result = blobReader.result;

                    if (typeof result !== "string") {
                      rejectBlob(new Error("The prepared image could not be read."));
                      return;
                    }

                    const commaIndex = result.indexOf(",");

                    if (commaIndex === -1) {
                      rejectBlob(new Error("The prepared image had an invalid format."));
                      return;
                    }

                    resolveBlob(result.slice(commaIndex + 1));
                  };

                  blobReader.onerror = () => {
                    rejectBlob(new Error("Unable to read the prepared image."));
                  };

                  blobReader.readAsDataURL(blob);
                },
                "image/jpeg",
                0.85,
              );
            });

            // Release canvas memory.
            canvas.width = 1;
            canvas.height = 1;

            resolve(base64String);
          } catch (error) {
            reject(error);
          }
        };

        image.onerror = () => {
          reject(new Error(`The browser could not decode "${file.name}" for scanning.`));
        };

        image.src = reader.result;
      };

      reader.onerror = () => {
        reject(new Error(`The browser could not read "${file.name}" for scanning.`));
      };

      reader.readAsDataURL(file);
    });
  };

  // ============================== Scan Recipe ==============================

  // ============================== Scan Recipe ==============================

  const handleScanRecipe = async () => {
    if (!imageFiles.length) {
      setErrorMessage("❌ Scanner Error: No recipe images were selected.");
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

        for (let index = 0; index < imageFiles.length; index++) {
          const file = imageFiles[index];

          setErrorMessage(`🔄 Step 1/3: Preparing recipe image ${index + 1} of ${imageFiles.length}...`);

          console.log("Preparing scanner image:", {
            page: index + 1,
            name: file.name,
            type: file.type,
            size: file.size,
          });

          const preparedImage = await imageToBase64(file);

          images.push({
            image: preparedImage,
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
    if (!recipe || !onSaveRecipe) {
      return;
    }

    // IMPORTANT:
    //
    // recipeImagePreview is the CROPPED COPY.
    //
    // The OCR recipe was created from the ORIGINAL
    // full-size imageFiles.
    onSaveRecipe(recipe, recipeImagePreview || "");
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
                ✂️ Cropping the Recipe Image is optional.
                <br />
                You can crop it if you want to use it as the recipe photo.
              </p>
            )}

            {isRecipeImageCropped && (
              <p className="scanner-step-message scanner-ready-message">
                ✅ Recipe image is cropped.
                <br />
                The original full pages will be used for OCR.
              </p>
            )}

            <button type="button" onClick={handleScanRecipe} disabled={scanning} className="scanner-scan-button">
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
