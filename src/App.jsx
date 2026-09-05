// ============================== Imports ==============================
import { useState, useRef, useEffect } from "react";
import "./App.css";
import { supabase } from "./supabase";
import Home from "./Home";
import Discover from "./Discover";
import NewRecipe from "./NewRecipe";
import RecipeBook from "./RecipeBook";
import Favorites from "./Favorites";
import Planner from "./Planner";
import GroceryList from "./GroceryList";
import SignIn from "./SignIn";
import Settings, { themes } from "./Settings";
import RecipeScanner from "./RecipeScanner";
import Footer from "./Footer";
// ============================== App Component ==============================
export default function App() {
  // ============================== Restore Login Session ==============================
  //
  // When the app is refreshed, Supabase needs a moment to restore the
  // existing login session.
  //
  // We wait for that process to finish before treating the user as logged out.
  // A temporary "no user yet" state during startup does NOT mean the user
  // actually logged out.

  // ============================== Restore Login Session ==============================
  //
  // When the app refreshes, Supabase needs a moment to restore the
  // existing login session.
  //
  // IMPORTANT:
  // We do NOT allow the recipe loader to run until this process
  // has finished. This prevents a temporary user === null state
  // from wiping the recipe list during startup.

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        // Restore the existing signed-in user.
        setUser(session?.user ?? null);

        // Supabase has finished checking the saved login session.
        setAuthLoading(false);
      } catch (error) {
        console.error("Error restoring Supabase session:", error);

        if (!mounted) return;

        setUser(null);
        setAuthLoading(false);
      }
    };

    restoreSession();

    // Keep the user state synchronized after startup.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      // Update the user whenever the authentication session changes.
      setUser(session?.user ?? null);

      // DO NOT change authLoading here.
      //
      // getSession() above is responsible for telling the app
      // that the initial login restoration is finished.
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  // Store references to recipe ingredient inputs so other code can access those DOM elements.
  const inputRefs = useRef([]);
  // Prevent duplicate startup recipe loads from turning
  // the loading message back on after recipes are already loaded.
  const recipeLoadStarted = useRef(false);

  // ============================== State ==============================
  // ===== STATE ===== //
  const [user, setUser] = useState(null);
  // Tracks whether Supabase has finished restoring the user's login session.
  // This prevents the app from treating a temporary "no user yet" state
  // as if the person is actually logged out.
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [groceryAdded, setGroceryAdded] = useState(false);
  const [recipeAdded, setRecipeAdded] = useState(false);
  // Tracks the New Recipe save result.
  // "" = no message
  // "success" = recipe saved
  // "duplicate" = recipe already exists
  const [recipeSaveStatus, setRecipeSaveStatus] = useState("");
  const [plannerSearch, setPlannerSearch] = useState("");
  const [plannerFeedback, setPlannerFeedback] = useState("");
  const [openDay, setOpenDay] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const instructionRefs = useRef([]);
  const [pageCount, setPageCount] = useState(1);
  // API key used when requesting recipes from Spoonacular.
  const SPOON_KEY = "83d56aebeba044838de5cc0e187d0850";
  const [fullRecipePaste, setFullRecipePaste] = useState("");
  // ============================== Recipe Organization ==============================
  // Controls the meal-time filter in the Recipe Book.
  const [mealTimeFilter, setMealTimeFilter] = useState("All");
  // Controls the food-type filter in the Recipe Book.
  const [foodTypeFilter, setFoodTypeFilter] = useState("All");
  const [addedRecipes, setAddedRecipes] = useState({});
  // Store the recipe currently being displayed in the recipe popup.
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [recipeZoom, setRecipeZoom] = useState(1);
  const recipeModalRef = useRef(null);
  const recipeZoomAreaRef = useRef(null);
  const pinchDistanceRef = useRef(null);
  const pinchZoomRef = useRef(1);
  const recipeZoomValueRef = useRef(1);
  const [popupOpen, setPopupOpen] = useState(false);
  useEffect(() => {
    if (!activeRecipe) {
      setPlannerSearch("");
    }
  }, [activeRecipe]);
  useEffect(() => {
    if (!activeRecipe) return;

    const handleOutsideClick = (event) => {
      if (recipeModalRef.current && !recipeModalRef.current.contains(event.target)) {
        setActiveRecipe(null);
        setPlannerSearch("");
        setRecipeZoom(1);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [activeRecipe]);

  // ============================== Recipe Zoom ==============================
  // Zoom is active only while a recipe card is open.
  // PC: Ctrl + mouse wheel or the on-card +/- buttons.
  // Touchscreen/phone/tablet: pinch with two fingers.
  useEffect(() => {
    recipeZoomValueRef.current = recipeZoom;
  }, [recipeZoom]);

  useEffect(() => {
    const element = recipeZoomAreaRef.current;

    if (!activeRecipe || !element) return;

    const getTouchDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();

      const change = event.deltaY < 0 ? 0.1 : -0.1;

      setRecipeZoom((zoom) => Math.min(2, Math.max(1, Number((zoom + change).toFixed(2)))));
    };

    const handleTouchStart = (event) => {
      if (event.touches.length === 2) {
        pinchDistanceRef.current = getTouchDistance(event.touches);
        pinchZoomRef.current = recipeZoomValueRef.current;
      }
    };

    const handleTouchMove = (event) => {
      if (event.touches.length !== 2 || pinchDistanceRef.current === null) return;

      event.preventDefault();

      const currentDistance = getTouchDistance(event.touches);
      const scale = currentDistance / pinchDistanceRef.current;

      setRecipeZoom(Math.min(2, Math.max(1, Number((pinchZoomRef.current * scale).toFixed(2)))));
    };

    const handleTouchEnd = () => {
      pinchDistanceRef.current = null;
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    element.addEventListener("touchstart", handleTouchStart, { passive: false });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      element.removeEventListener("wheel", handleWheel);
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [activeRecipe]);
  const [showImages, setShowImages] = useState({});
  const [ingredientPaste, setIngredientPaste] = useState("");
  const [instructionPaste, setInstructionPaste] = useState("");
  // Controls which main page is currently displayed.
  const [page, setPage] = useState("home");
  // Controls which wallpaper is currently selected.
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem("wallpaper") || "/images/cozy_kitchen.png");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "strawberry");
  const currentTheme = themes.find((item) => item.id === theme) || themes[0];
  const [visibleRecipes, setVisibleRecipes] = useState(50);
  // Controls whether the sidebar is open. Start open on wider screens.
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1000);
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 1000);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const [manualGroceryItem, setManualGroceryItem] = useState("");
  // Load the saved grocery list from the browser when the app starts.
  const [groceryList, setGroceryList] = useState(() => {
    const saved = localStorage.getItem("groceryList");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedItems, setSelectedItems] = useState({});
  const [checkedItems, setCheckedItems] = useState({});

  // loads recipes from supabase sql
  const [recipes, setRecipes] = useState([]);

  // Tracks whether the user's recipes are still loading.
  // This lets the Recipe Book show a loading message instead
  // of looking empty during the refresh.
  const [recipesLoading, setRecipesLoading] = useState(true);

  // ============================== Supabase Recipes ==============================
  // Convert a Supabase recipe row into the format used by the app.
  const formatSavedRecipe = (recipe) => ({
    ...recipe,
    ingredients:
      typeof recipe.ingredients === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(recipe.ingredients);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return recipe.ingredients ? recipe.ingredients.split("\n").filter(Boolean) : [];
            }
          })()
        : Array.isArray(recipe.ingredients)
          ? recipe.ingredients
          : [],
    instructions:
      typeof recipe.instructions === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(recipe.instructions);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return recipe.instructions ? recipe.instructions.split("\n").filter(Boolean) : [];
            }
          })()
        : Array.isArray(recipe.instructions)
          ? recipe.instructions
          : [],
    image: recipe.image || "",
  });

  // ============================== Load Recipe Images ==============================
  //
  // Images are loaded separately from the main recipe data.
  // This prevents large image data from slowing down or timing out
  // the initial recipe refresh.
  //
  // A broken blob: URL is ignored because blob URLs are temporary
  // and cannot reliably survive a page refresh.

  const loadRecipeImages = async (recipeList) => {
    for (const recipe of recipeList) {
      try {
        // Skip recipes that do not have an image value.
        if (!recipe?.image) continue;

        // Blob URLs are temporary browser URLs.
        // They are not useful after a refresh, so ignore them.
        if (recipe.image.startsWith("blob:")) continue;

        // Add the image to the browser cache.
        // The recipe itself is already displayed, so this happens
        // separately after the main recipe list has loaded.
        const image = new Image();

        image.onload = () => {
          setRecipes((currentRecipes) =>
            currentRecipes.map((currentRecipe) => (currentRecipe.id === recipe.id ? { ...currentRecipe, image: recipe.image } : currentRecipe)),
          );
        };

        image.onerror = () => {
          console.warn(`Could not load image for recipe: ${recipe.name}`);
        };

        image.src = recipe.image;
      } catch (error) {
        console.warn(`Could not load image for recipe: ${recipe.name}`, error);
      }
    }
  };
  // Load only the recipes belonging to the currently signed-in user.
  const loadUserRecipes = async (currentUser) => {
    // Start showing the Recipe Book loading message.
    setRecipesLoading(true);

    if (!currentUser) {
      setRecipes([]);
      setRecipesLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("recipes")
      .select("id, created_at, user_id, name, ingredients, instructions, category, favorite, image")
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Error loading recipes:", error);
      setRecipesLoading(false);
      return;
    }

    const formattedRecipes = (data || []).map(formatSavedRecipe);

    // Load the recipes immediately.
    // We are NOT waiting for the images before displaying the recipes.
    setRecipes(formattedRecipes);

    // Load saved images separately.
    loadRecipeImages(formattedRecipes);

    // The recipe data itself has loaded.
    // The images can continue loading in the background.
    setRecipesLoading(false);
  };

  // ============================== Load User Recipes ==============================
  //
  // IMPORTANT:
  // Do not attempt to load recipes while Supabase is still restoring
  // the login session.
  //
  // This prevents the temporary user === null startup state from
  // clearing the recipe list.

  // ============================== Load User Recipes ==============================
  //
  // Wait for Supabase to finish restoring the login session.
  // Once we know who the user is, immediately load that user's recipes.
  //
  // This prevents a page refresh from temporarily seeing user === null
  // and clearing the recipe list before Supabase restores the session.

  useEffect(() => {
    // Supabase is still restoring the login session.
    // Do nothing yet.
    if (authLoading) return;

    // Supabase finished checking the session and there is no logged-in user.
    // This is a real signed-out state, so clear the recipes.
    if (!user) {
      setRecipes([]);
      return;
    }

    // We have the logged-in user.
    // Load their recipes immediately from Supabase.
    loadUserRecipes(user);
  }, [user, authLoading]);

  // Make a sorted copy of the recipes so the original array is not changed.
  // ============================== Recipe Organization ==============================
  //
  // Figure out useful categories from the recipe itself.
  //
  // We look at:
  // - recipe name
  // - ingredients
  // - existing category
  //
  // This means older recipes can still be organized even if
  // they do not have perfect category information saved in Supabase.
  //

  const getRecipeCategoryText = (recipe) => {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.join(" ") : recipe.ingredients || "";

    return `${recipe.name || ""} ${ingredients} ${recipe.category || ""}`.toLowerCase();
  };

  // ============================== Meal Time Detection ==============================

  const getMealTime = (recipe) => {
    const text = getRecipeCategoryText(recipe);

    // Breakfast foods.
    if (
      /breakfast|pancake|waffle|french toast|omelet|omelette|scrambled egg|fried egg|egg sandwich|breakfast burrito|hash browns|cereal|oatmeal|muffin|bagel|toast/.test(
        text,
      )
    ) {
      return "Breakfast";
    }

    // Desserts and sweets.
    if (/dessert|cake|cookie|brownie|cupcake|pie|pudding|cheesecake|ice cream|candy|fudge|sweet treat|donut|doughnut|chocolate cake/.test(text)) {
      return "Dessert";
    }

    // Snacks.
    if (/snack|chips|dip|nachos|popcorn|trail mix|appetizer|appetiser|finger food/.test(text)) {
      return "Snack";
    }

    // Lunch foods.
    if (/sandwich|wrap|sub |submarine|panini|salad|soup|quesadilla|taco|burrito/.test(text)) {
      return "Lunch";
    }

    // Most remaining savory recipes are dinner recipes.
    return "Dinner";
  };

  // ============================== Food Type Detection ==============================

  const getFoodType = (recipe) => {
    const text = getRecipeCategoryText(recipe);

    if (/chicken|chickpea/.test(text)) return "Chicken";
    if (/beef|steak|ground beef|sirloin|roast beef/.test(text)) return "Beef";
    if (/pork|ham|bacon|sausage/.test(text)) return "Pork";
    if (/shrimp|prawn|salmon|tuna|fish|seafood|crab|lobster/.test(text)) return "Seafood";
    if (/pasta|spaghetti|macaroni|linguine|fettuccine|lasagna|lasagne|penne|ravioli/.test(text)) return "Pasta";
    if (/vegetarian|vegetable|vegan|tofu|lentil|bean/.test(text)) return "Vegetarian";
    if (/cake|cookie|brownie|cupcake|pie|pudding|cheesecake|ice cream|chocolate|dessert/.test(text)) return "Dessert";

    return "Other";
  };

  // ============================== Recipe Book List ==============================
  //
  // Search is still handled inside RecipeBook.jsx.
  // Here we only determine the categories and preserve
  // favorites-first ordering.
  //

  const filtered = [...recipes]
    .map((recipe) => ({
      ...recipe,
      detectedMealTime: getMealTime(recipe),
      detectedFoodType: getFoodType(recipe),
    }))
    .filter((recipe) => {
      if (mealTimeFilter !== "All" && recipe.detectedMealTime !== mealTimeFilter) {
        return false;
      }

      if (foodTypeFilter !== "All" && recipe.detectedFoodType !== foodTypeFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Favorites remain first.
      if (a.favorite !== b.favorite) {
        return a.favorite ? -1 : 1;
      }

      // Keep a predictable order inside each category.
      return a.name.localeCompare(b.name);
    });

  const [apiRecipes, setApiRecipes] = useState([]);
  const [search, setSearch] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");

  // ============================== Recipe API Formatting ==============================
  // Convert an API recipe into the format our app uses.
  const formatMeal = (meal) => {
    const ingredients = [];

    // Check each possible ingredient slot supplied by the API.
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (ingredient && ingredient.trim() !== "") {
        ingredients.push(`${measure ? measure : ""} ${ingredient}`.trim());
      }
    }

    return {
      name: meal.strMeal || "Unknown",
      category: meal.strCategory || "",
      ingredients,
      instructions: meal.strInstructions ? meal.strInstructions.split("\n") : [],
      image: meal.strMealThumb || "",
    };
  };

  // ============================== API Fetching ==============================
  useEffect(() => {
    const fetchMealDB = () => {
      if (search && search.trim() !== "") {
        return fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${search}`)
          .then((res) => res.json())
          .then((data) => (data.meals || []).map(formatMeal));
      }

      // For Discover, use targeted categories instead of completely random meals.
      const preferredCategories = ["Chicken", "Beef", "Pork", "Pasta", "Breakfast", "Vegetarian", "Dessert"];

      const category = preferredCategories[Math.floor(Math.random() * preferredCategories.length)];

      return fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`)
        .then((res) => res.json())
        .then((data) => {
          const meals = data.meals || [];

          // Pick several meals from the selected category.
          const shuffled = [...meals].sort(() => Math.random() - 0.5);

          return Promise.all(
            shuffled.slice(0, pageCount === 1 ? 12 : 4).map((meal) =>
              fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
                .then((res) => res.json())
                .then((data) => (data.meals && data.meals[0] ? formatMeal(data.meals[0]) : null)),
            ),
          ).then((meals) => meals.filter(Boolean));
        });
    };

    const fetchSpoonacular = () => {
      // For normal Discover browsing, use a more useful everyday-food query.
      const discoverQueries = [
        "chicken dinner",
        "beef dinner",
        "pasta",
        "casserole",
        "tacos",
        "burgers",
        "comfort food",
        "breakfast",
        "breakfast dinner",
        "tex mex",
        "southern food",
        "easy family dinner",
      ];

      const query = search && search.trim() !== "" ? search : discoverQueries[Math.floor(Math.random() * discoverQueries.length)];

      return fetch(
        `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(
          query,
        )}&number=${pageCount === 1 ? 20 : 8}&addRecipeInformation=true&fillIngredients=true&apiKey=${SPOON_KEY}`,
      )
        .then((res) => res.json())
        .then((data) =>
          (data.results || []).map((meal) => ({
            name: meal.title || "Unknown",
            category: meal.dishTypes?.[0] || "",
            ingredients: (meal.extendedIngredients || []).map((ingredient) => ingredient.original),
            instructions:
              typeof meal.instructions === "string"
                ? meal.instructions
                    .replace(/<[^>]*>/g, "")
                    .split(/\r?\n/)
                    .filter(Boolean)
                : [],
            image: meal.image || "",
          })),
        )
        .catch(() => []);
    };

    // Fetch both recipe sources, then combine them.
    Promise.all([fetchMealDB(), fetchSpoonacular()])
      .then(([mealDB, spoon]) => {
        const combined = [...mealDB, ...spoon];

        const unique = Array.from(new Map(combined.map((recipe) => [recipe.name.toLowerCase(), recipe])).values());

        if (search && search.trim() !== "") {
          setApiRecipes(unique);
        } else {
          setApiRecipes((prev) => {
            const combinedRecipes = [...prev, ...unique];

            return Array.from(new Map(combinedRecipes.map((recipe) => [recipe.name.toLowerCase(), recipe])).values());
          });
        }
      })
      .catch(() => setApiRecipes([]));
  }, [search, pageCount]);

  // ============================== Planner State ==============================
  const [plannerRecipe, setPlannerRecipe] = useState(null);

  const [weeklyPlan, setWeeklyPlan] = useState(() => {
    try {
      const saved = localStorage.getItem("weeklyPlan");
      const parsed = saved ? JSON.parse(saved) : {};

      const safePlan = {
        Monday: Array.isArray(parsed?.Monday) ? parsed.Monday : [],
        Tuesday: Array.isArray(parsed?.Tuesday) ? parsed.Tuesday : [],
        Wednesday: Array.isArray(parsed?.Wednesday) ? parsed.Wednesday : [],
        Thursday: Array.isArray(parsed?.Thursday) ? parsed.Thursday : [],
        Friday: Array.isArray(parsed?.Friday) ? parsed.Friday : [],
        Saturday: Array.isArray(parsed?.Saturday) ? parsed.Saturday : [],
        Sunday: Array.isArray(parsed?.Sunday) ? parsed.Sunday : [],
      };

      return safePlan;
    } catch (e) {
      console.log("Resetting weeklyPlan");

      return {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: [],
      };
    }
  });

  const [showPlanner, setShowPlanner] = useState(null);
  const [openRecipe, setOpenRecipe] = useState(null);

  // ============================== New Recipe State ==============================
  const [zoomImage, setZoomImage] = useState(null);
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    ingredients: [""],
    instructions: [""],
    imageIngredients: [],
    imageInstructions: [],
    favorite: false,
    category: "",
    image: "",
  });

  // ============================== Recipe Parser ==============================
  // Turn pasted recipe text into separate recipe fields.
  const autoParseRecipe = () => {
    const text = fullRecipePaste;

    if (!text) return;

    const normalizedText = text;
    const lower = normalizedText.toLowerCase();

    // detect sections
    const ingredientKeywords = ["ingredients", "what you need", "you will need", "supplies"];

    const instructionKeywords = [
      "instructions",
      "directions",
      "steps",
      "method",
      "how to make",
      "preparation",
      "alternative method",
      "alternate method",
      "cooking method",
      "oven method",
      "air fryer method",
    ];

    let ingredientIndex = -1;
    let instructionIndex = -1;

    ingredientKeywords.forEach((key) => {
      const idx = lower.indexOf(key);
      if (idx !== -1 && (ingredientIndex === -1 || idx < ingredientIndex)) {
        ingredientIndex = idx;
      }
    });

    instructionKeywords.forEach((key) => {
      const idx = lower.indexOf(key);
      if (idx !== -1 && (instructionIndex === -1 || idx < instructionIndex)) {
        instructionIndex = idx;
      }
    });

    let ingredientsText = "";
    let instructionsText = "";

    // split sections
    if (ingredientIndex !== -1 && instructionIndex !== -1) {
      ingredientsText = normalizedText.slice(ingredientIndex, instructionIndex);
      instructionsText = normalizedText.slice(instructionIndex);
    } else {
      // fallback: split in half
      const midpoint = Math.floor(text.length / 2);
      ingredientsText = text.slice(0, midpoint);
      instructionsText = text.slice(midpoint);
    }

    // clean ingredients
    const ingredients = ingredientsText
      .replace(/ingredients:?/gi, "")
      .split(/\n|(?<=\S)\s+(?=[0-9]+\s)/)
      .map((line) => line.trim())
      .filter((line) => line);

    const safeIngredients = ingredients.length > 0 ? ingredients : [""];

    // clean instructions

    const instructions = (() => {
      let steps = [];

      if (instructionsText.includes(".")) {
        // ✅ split by sentences
        steps = instructionsText
          .replace(/\n/g, " ")
          .replace(/instructions:?/gi, "") // remove line breaks
          .split(".")
          .map((s) => s.trim())
          .filter((s) => s.length > 20); // remove junk
      } else {
        // fallback to lines
        steps = instructionsText
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 10);
      }

      return steps;
    })();

    // set values into your app
    setNewRecipe((prev) => ({
      ...prev,
      name: extractRecipeName(text),
      ingredients: safeIngredients,
      instructions,
    }));

    setIngredientPaste("");
    setInstructionPaste("");
    setFullRecipePaste("");
  };

  // ============================== Send Scanned Recipe to New Recipe ==============================

  // ============================== Send Scanned Recipe to New Recipe ==============================

  // ============================== Send Scanned Recipe to New Recipe ==============================
  //
  // Take the recipe information AND the cropped recipe image from
  // Recipe Scanner and place everything directly into New Recipe.
  //
  // This avoids sending the scanned recipe through the Auto Fill parser
  // again, which could interfere with the image handoff.

  const handleScannerSaveRecipe = (recipe, recipeImage) => {
    if (!recipe) return;

    // Build the text version so the original scanned recipe
    // is still available in the "Paste full recipe here..." box.
    const recipeText = [
      recipe.recipeName || "",

      recipe.ingredients?.length ? `Ingredients:\n${recipe.ingredients.join("\n")}` : "",

      recipe.instructions?.length
        ? `Instructions:\n${recipe.instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // Put EVERYTHING into New Recipe at once.
    //
    // Most importantly:
    // recipeImage is the cropped image coming directly
    // from Recipe Scanner.
    setNewRecipe((prev) => ({
      ...prev,

      name: recipe.recipeName || "",
      ingredients: recipe.ingredients?.length ? recipe.ingredients : [""],
      instructions: recipe.instructions?.length ? recipe.instructions : [],
      image: recipeImage || "",

      // Keep these fields ready for the normal New Recipe form.
      imageIngredients: [],
      imageInstructions: [],
      favorite: false,
      category: "",
    }));

    // Keep the scanned text available in the paste box too.
    setFullRecipePaste(recipeText);

    // Open New Recipe.
    setPage("new");

    // Start the New Recipe page at the top.
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const extractRecipeName = (text) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 3);

    return lines[0] || "";
  };

  // ============================== Images ==============================
  // ===== IMAGE =====
  // Read selected image files and store their data in the recipe.
  const handleImage = (e, type) => {
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        setNewRecipe((prev) => ({
          ...prev,
          [type]: [...(prev[type] || []), reader.result].slice(0, 4),
        }));
      };

      reader.readAsDataURL(file);
    });
  };

  // ============================== Categories ==============================
  // ===== CATEGORY =====
  // Look at recipe text and choose a basic category from matching keywords.
  const detectCategory = (text) => {
    const lowerText = text.toLowerCase();

    const categories = [];

    // Meat categories
    if (lowerText.includes("chicken")) categories.push("chicken");
    if (lowerText.includes("beef")) categories.push("beef");
    if (lowerText.includes("pork")) categories.push("pork");
    if (lowerText.includes("bacon")) categories.push("bacon");
    if (lowerText.includes("sausage")) categories.push("sausage");
    if (lowerText.includes("turkey")) categories.push("turkey");
    if (lowerText.includes("seafood")) categories.push("seafood");
    if (lowerText.includes("shrimp")) categories.push("seafood");
    if (lowerText.includes("salmon")) categories.push("seafood");
    if (lowerText.includes("fish")) categories.push("seafood");

    // Other useful recipe categories
    if (lowerText.includes("pasta")) categories.push("pasta");
    if (lowerText.includes("casserole")) categories.push("casserole");
    if (lowerText.includes("rice")) categories.push("rice");
    if (lowerText.includes("potato")) categories.push("potato");
    if (lowerText.includes("vegetarian")) categories.push("vegetarian");
    if (lowerText.includes("chocolate") || lowerText.includes("sugar")) categories.push("dessert");

    if (
      lowerText.includes("dough") ||
      lowerText.includes("bread") ||
      lowerText.includes("roll") ||
      lowerText.includes("biscuit") ||
      lowerText.includes("croissant") ||
      lowerText.includes("muffin") ||
      lowerText.includes("bagel") ||
      lowerText.includes("donut") ||
      lowerText.includes("pastry")
    ) {
      categories.push("bakery");
    }

    // If nothing matched, keep the recipe searchable as "other".
    if (categories.length === 0) {
      categories.push("other");
    }

    // Remove duplicates before saving.
    return [...new Set(categories)].join(", ");
  };

  // ============================== Clear Recipe Form ==============================
  // ============================== Clear Recipe Form ==============================
  // Resets the New Recipe form back to a completely blank recipe.
  // This is used when the user leaves the New Recipe page.
  const clearRecipeForm = () => {
    setNewRecipe({
      name: "",
      ingredients: [""],
      instructions: [""],
      imageIngredients: [],
      imageInstructions: [],
      favorite: false,
      category: "",
      image: "",
    });

    setIngredientPaste("");
    setInstructionPaste("");
    setFullRecipePaste("");

    // Leaving New Recipe also means we are no longer editing a recipe.
    setEditIndex(null);
  };

  // ============================== Clear New Recipe When Leaving Page ==============================
  // If the user leaves the New Recipe page without saving,
  // clear anything they typed so it will be blank the next
  // time they open New Recipe.
  useEffect(() => {
    if (page !== "new") {
      clearRecipeForm();
    }
  }, [page]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ============================== Save Recipe ==============================
  const saveRecipe = async () => {
    if (!user) {
      alert("Please sign in before saving a recipe.");
      return;
    }

    const recipeText = [newRecipe.name, ...(newRecipe.ingredients || [])].join(" ");

    const detectedCategories = detectCategory(recipeText);

    const recipeToSave = {
      user_id: user.id,
      name: newRecipe.name,
      ingredients: JSON.stringify(newRecipe.ingredients || []),
      instructions: JSON.stringify(newRecipe.instructions || []),
      category: detectedCategories,
      favorite: newRecipe.favorite || false,
      image: newRecipe.image || "",
    };

    let data;
    let error;

    if (editIndex !== null && recipes[editIndex]?.id) {
      // ============================== Update Existing Recipe ==============================

      const result = await supabase.from("recipes").update(recipeToSave).eq("id", recipes[editIndex].id).eq("user_id", user.id).select().single();

      data = result.data;
      error = result.error;
    } else {
      // ============================== Check For Duplicate Recipe ==============================

      // Look for another recipe belonging to this user
      // with the same recipe name.
      const { data: existingRecipe, error: duplicateCheckError } = await supabase
        .from("recipes")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", newRecipe.name.trim())
        .limit(1)
        .maybeSingle();

      if (duplicateCheckError) {
        console.error("Error checking for duplicate recipe:", duplicateCheckError);
        alert("There was a problem checking for duplicate recipes.");
        return;
      }

      // Stop the save if this recipe name already exists.
      if (existingRecipe) {
        setRecipeSaveStatus("duplicate");

        setTimeout(() => {
          setRecipeSaveStatus("");
        }, 2000);

        return;
      }

      // ============================== Save New Recipe ==============================

      const result = await supabase.from("recipes").insert([recipeToSave]).select().single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error saving recipe:", error);
      alert("There was a problem saving your recipe.");
      return;
    }

    // Clear the New Recipe form after a successful save.
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

    // Clear the full recipe text box as well.
    setFullRecipePaste("");

    const savedRecipe = formatSavedRecipe(data);

    setRecipes((prev) => {
      if (editIndex !== null && recipes[editIndex]?.id) {
        return prev.map((recipe) => (recipe.id === savedRecipe.id ? savedRecipe : recipe));
      }

      return [...prev, savedRecipe];
    });

    setEditIndex(null);

    setRecipeSaveStatus("success");

    setTimeout(() => {
      setRecipeSaveStatus("");
    }, 2000);
  };

  // Update a recipe in Supabase and React state.
  const updateRecipeInSupabase = async (recipe) => {
    if (!user || !recipe?.id) return false;

    const recipeText = [recipe.name, ...(recipe.ingredients || [])].join(" ");

    const detectedCategories = detectCategory(recipeText);

    const recipeToSave = {
      user_id: user.id,
      name: recipe.name,
      ingredients: JSON.stringify(recipe.ingredients || []),
      instructions: JSON.stringify(recipe.instructions || []),
      category: detectedCategories,
      favorite: recipe.favorite || false,
      image: recipe.image || "",
    };

    const { data, error } = await supabase.from("recipes").update(recipeToSave).eq("id", recipe.id).eq("user_id", user.id).select().single();

    if (error) {
      console.error("Error updating recipe:", error);
      return false;
    }

    const updatedRecipe = formatSavedRecipe(data);
    setRecipes((prev) => prev.map((item) => (item.id === updatedRecipe.id ? updatedRecipe : item)));
    return true;
  };

  // Delete a recipe from Supabase and React state.
  const deleteRecipe = async (recipe) => {
    if (!user || !recipe?.id) return;

    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id).eq("user_id", user.id);

    if (error) {
      console.error("Error deleting recipe:", error);
      alert("There was a problem deleting your recipe.");
      return;
    }

    setRecipes((prev) => prev.filter((item) => item.id !== recipe.id));

    if (activeRecipe?.id === recipe.id) {
      setActiveRecipe(null);
    }
  };

  // Update a recipe's favorite status in Supabase.
  const toggleFavorite = async (recipe) => {
    if (!user || !recipe?.id) return;

    const updatedFavorite = !recipe.favorite;

    const { data, error } = await supabase
      .from("recipes")
      .update({ favorite: updatedFavorite })
      .eq("id", recipe.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating favorite:", error);
      return;
    }

    const updatedRecipe = formatSavedRecipe(data);
    setRecipes((prev) => prev.map((item) => (item.id === updatedRecipe.id ? updatedRecipe : item)));

    if (activeRecipe?.id === updatedRecipe.id) {
      setActiveRecipe(updatedRecipe);
    }
  };

  // ============================== Grocery ==============================
  // Add the ingredients the user selected to the grocery list.
  const addSelectedToGrocery = () => {
    const items = Object.keys(selectedItems).filter((item) => selectedItems[item]);

    const updated = [...new Set([...groceryList, ...items])];

    setGroceryList(updated);
    localStorage.setItem("groceryList", JSON.stringify(updated));

    setSelectedItems({});
  };

  // ============================== Planner ==============================
  // ===== PLANNER =====
  // Add a recipe to a selected day in the weekly planner.
  const assignToDay = (day, recipe) => {
    const currentDay = weeklyPlan[day] || [];

    const alreadyAdded = currentDay.some((r) => r.name === recipe.name);

    if (alreadyAdded) {
      return;
    }

    const updated = {
      ...weeklyPlan,
      [day]: [...currentDay, recipe],
    };

    setWeeklyPlan(updated);

    localStorage.setItem("weeklyPlan", JSON.stringify(updated));
  };

  // ============================== Sample Recipes ==============================
  const sampleRecipes = [
    {
      name: "Spaghetti Bolognese",
      category: "Dinner",
      ingredients: ["Ground beef", "Tomato sauce", "Spaghetti", "Onion", "Garlic"],
      instructions: "Cook beef\nAdd sauce\nBoil pasta\nCombine and serve",
    },
    {
      name: "Pancakes",
      category: "Breakfast",
      ingredients: ["Flour", "Milk", "Eggs", "Sugar", "Baking powder"],
      instructions: "Mix ingredients\nPour batter\nFlip pancake\nServe",
    },
  ];

  // ============================== Page Background ==============================
  // Apply the currently selected wallpaper to the entire app background.
  useEffect(() => {
    // Apply the wallpaper selected in Settings to the entire page.
    document.body.style.backgroundImage = `url("${wallpaper}")`;

    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundRepeat = "no-repeat";
  }, [wallpaper]);

  // ============================== Authentication ==============================
  // Create a new Supabase account using the entered email and password.
  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Account created successfully!");
    }
  }

  // Sign the user into the existing Supabase account.
  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    }
  }

  // ============================== Forgot Password ==============================
  // Send a password reset email through Supabase.
  async function resetPassword() {
    if (!email.trim()) {
      alert("Please enter your email address first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Password reset instructions have been sent to your email.");
    }
  }

  // ============================== Sign In Check ==============================
  // Until a user is signed in, show only the Sign In page.
  if (!user) {
    return (
      <SignIn
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        signIn={signIn}
        signUp={signUp}
        resetPassword={resetPassword}
      />
    );
  }

  // ============================== Sign Out ==============================
  // Sign the current user out of Supabase.
  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
    }
  }

  // ============================== Main App Layout ==============================
  return (
    <div
      className="app-shell"
      style={{
        "--theme-sidebar": currentTheme.sidebar,
        "--theme-accent": currentTheme.accent,
        "--theme-hover": currentTheme.hover,
        "--theme-text": currentTheme.text,
      }}
    >
      {popupOpen && <div onClick={() => setPopupOpen(false)} className="app-popup-overlay" style={{ left: sidebarOpen ? 270 : 0 }} />}
      {/* <header className="app-header">
        <h1 className="app-title">🍓 Cozy Recipe Book</h1>
      </header> */}
      <div className="app-layout">
        {/* ============================== Sidebar / Navigation ============================== */}
        {/* NAV */}
        <nav
          className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}
          aria-label="Main navigation"
          style={{ background: "var(--theme-sidebar)" }}
        >
          <button className="sidebar-brand" onClick={() => setSidebarOpen((prev) => !prev)}>
            <span className="sidebar-brand-text">My Recipes</span>
            <span className="sidebar-brand-icon">{currentTheme.fruit}</span>
          </button>

          <button
            className="sidebar-button"
            onClick={() => setPage("home")}
            style={{
              background: page === "home" ? "var(--theme-accent)" : "#ffffff",
              padding: page === "home" ? "14px 18px" : "12px 16px",
            }}
          >
            <span className="sidebar-icon">🏠</span>
            <span className="sidebar-label">Home</span>
          </button>

          <button
            className="sidebar-button"
            onClick={() => setPage("discover")}
            style={{
              background: page === "discover" ? "var(--theme-accent)" : "#ffffff",
              padding: page === "discover" ? "14px 18px" : "12px 16px",
            }}
          >
            <span className="sidebar-icon">🔍</span>
            <span className="sidebar-label">Discover</span>
          </button>

          <button
            className="sidebar-button"
            onClick={() => setPage("scanner")}
            style={{
              background: page === "scanner" ? "var(--theme-accent)" : "#ffffff",
              padding: page === "scanner" ? "14px 18px" : "12px 16px",
            }}
          >
            <span className="sidebar-icon">📷</span>
            <span className="sidebar-label">Recipe Scanner</span>
          </button>

          <button
            className="sidebar-button"
            onClick={() => setPage("new")}
            style={{
              background: page === "new" ? "var(--theme-accent)" : "#ffffff",
              padding: page === "new" ? "14px 18px" : "12px 16px",
            }}
          >
            <span className="sidebar-icon">➕</span>
            <span className="sidebar-label">New Recipe</span>
          </button>

          <button
            className="sidebar-button"
            onClick={() => setPage("book")}
            style={{
              background: page === "book" ? "var(--theme-accent)" : "#ffffff",
              padding: page === "book" ? "14px 18px" : "12px 16px",
            }}
          >
            <span className="sidebar-icon">📖</span>
            <span className="sidebar-label">Recipe Book</span>
          </button>

          <button
            className="sidebar-button"
            onClick={() => setPage("favorites")}
            style={{
              background: page === "favorites" ? "var(--theme-accent)" : "#ffffff",
              padding: page === "favorites" ? "14px 18px" : "12px 16px",
            }}
          >
            <span className="sidebar-icon">⭐</span>
            <span className="sidebar-label">Favorites</span>
          </button>

          <button
            className="sidebar-button"
            onClick={() => setPage("planner")}
            style={{
              background: page === "planner" ? "var(--theme-accent)" : "#ffffff",
              padding: page === "planner" ? "14px 18px" : "12px 16px",
            }}
          >
            <span className="sidebar-icon">📅</span>
            <span className="sidebar-label">Planner</span>
          </button>

          <button
            className="sidebar-button"
            onClick={() => setPage("grocery")}
            style={{
              background: page === "grocery" ? "var(--theme-accent)" : "#ffffff",
              padding: page === "grocery" ? "14px 18px" : "12px 16px",
            }}
          >
            <span className="sidebar-icon">🛒</span>
            <span className="sidebar-label">Grocery</span>
          </button>

          {/* SIDEBAR - SIGN OUT */}
          <button className="sidebar-button sidebar-signout" onClick={signOut}>
            <span className="sidebar-icon sidebar-signout-icon">↪</span>
            <span className="sidebar-label">Sign Out</span>
          </button>

          <button
            className="sidebar-button"
            onClick={() => setPage("settings")}
            style={{
              background: page === "settings" ? "var(--theme-accent)" : "#ffffff",
              padding: page === "settings" ? "14px 18px" : "12px 16px",
            }}
          >
            <span className="sidebar-icon">⚙️</span>
            <span className="sidebar-label">Settings</span>
          </button>
        </nav>
        {/* TOP INPUT */}

        {/* ============================== Page Content ============================== */}
        {/* PAGES WRAPPER */}
        <main className={`page-wrapper ${page === "book" ? "recipe-book-wrapper" : ""}`}>
          {/* HOME */}

          {/* ============================== Home ============================== */}
          {page === "home" && (
            <Home
              recipes={recipes}
              groceryList={groceryList}
              apiRecipes={apiRecipes}
              weeklyPlan={weeklyPlan}
              setActiveRecipe={setActiveRecipe}
              themeFruit={currentTheme.fruit}
            />
          )}
          {/* ============================== Recipe Scanner ============================== */}
          {page === "scanner" && <RecipeScanner onSaveRecipe={handleScannerSaveRecipe} />}
          {/* ============================== New Recipe ============================== */}
          {/* NEW RECIPE */}
          {page === "new" && (
            <NewRecipe
              fullRecipePaste={fullRecipePaste}
              setFullRecipePaste={setFullRecipePaste}
              autoParseRecipe={autoParseRecipe}
              newRecipe={newRecipe}
              setNewRecipe={setNewRecipe}
              saveRecipe={saveRecipe}
              recipeSaveStatus={recipeSaveStatus}
              instructionRefs={instructionRefs}
              inputRefs={inputRefs}
            />
          )}

          {/* ============================== Recipe Book ============================== */}
          {/* RECIPE BOOK */}
          {page === "book" && (
            <RecipeBook
              recipeSearch={recipeSearch}
              setRecipeSearch={setRecipeSearch}
              filtered={filtered}
              scrollToTop={scrollToTop}
              recipes={recipes}
              setRecipes={setRecipes}
              setActiveRecipe={setActiveRecipe}
              recipesLoading={recipesLoading}
              mealTimeFilter={mealTimeFilter}
              setMealTimeFilter={setMealTimeFilter}
              foodTypeFilter={foodTypeFilter}
              setFoodTypeFilter={setFoodTypeFilter}
            />
          )}

          {/* ============================== Favorites ============================== */}
          {/* FAVORITES */}
          {page === "favorites" && <Favorites recipes={recipes} setActiveRecipe={setActiveRecipe} recipesLoading={recipesLoading} />}

          {/* ============================== Planner ============================== */}
          {/* PLANNER */}
          {page === "planner" && (
            <Planner
              weeklyPlan={weeklyPlan}
              openDay={openDay}
              setOpenDay={setOpenDay}
              plannerSearch={plannerSearch}
              setPlannerSearch={setPlannerSearch}
              recipes={recipes}
              assignToDay={assignToDay}
              setActiveRecipe={setActiveRecipe}
              setWeeklyPlan={setWeeklyPlan}
            />
          )}

          {/* ============================== Grocery ============================== */}
          {/* GROCERY */}
          {page === "grocery" && (
            <GroceryList
              manualGroceryItem={manualGroceryItem}
              setManualGroceryItem={setManualGroceryItem}
              groceryList={groceryList}
              setGroceryList={setGroceryList}
              checkedItems={checkedItems}
              setCheckedItems={setCheckedItems}
              setPopupOpen={setPopupOpen}
            />
          )}

          {/* ============================== Settings ============================== */}
          {page === "settings" && <Settings wallpaper={wallpaper} setWallpaper={setWallpaper} theme={theme} setTheme={setTheme} />}

          {/* ============================== Discover ============================== */}
          {/* DISCOVER */}
          {page === "discover" && (
            <Discover
              search={search}
              setSearch={setSearch}
              apiRecipes={apiRecipes}
              scrollToTop={scrollToTop}
              setPageCount={setPageCount}
              setActiveRecipe={setActiveRecipe}
            />
          )}
        </main>
      </div>
      {/* ============================== Recipe Popup ============================== */}
      {activeRecipe && (
        <div
          className="recipe-modal-overlay"
          onClick={() => {
            setActiveRecipe(null);
            setPlannerSearch("");
            setRecipeZoom(1);
          }}
        >
          <article
            ref={recipeModalRef}
            className="recipe-modal"
            onClick={(e) => {
              e.stopPropagation();

              if (e.target === e.currentTarget || e.target === recipeZoomAreaRef.current) {
                setActiveRecipe(null);
                setPlannerSearch("");
                setRecipeZoom(1);
              }
            }}
          >
            <button
              className="recipe-modal-close"
              onClick={() => {
                setActiveRecipe(null);
                setPlannerSearch("");
                setRecipeZoom(1);
              }}
            >
              ✖
            </button>

            <div className="recipe-zoom-controls">
              <button type="button" onClick={() => setRecipeZoom((zoom) => Math.max(1, Number((zoom - 0.1).toFixed(2))))} aria-label="Zoom out">
                −
              </button>

              <span>{Math.round(recipeZoom * 100)}%</span>

              <button type="button" onClick={() => setRecipeZoom((zoom) => Math.min(2, Number((zoom + 0.1).toFixed(2))))} aria-label="Zoom in">
                +
              </button>
            </div>

            <div ref={recipeZoomAreaRef} className="recipe-modal-content" style={{ zoom: recipeZoom }}>
              <button className="recipe-action recipe-action-delete" onClick={() => deleteRecipe(activeRecipe)}>
                🗑 Delete Recipe
              </button>

              <button
                className="recipe-action recipe-action-edit"
                onClick={() => {
                  const safeRecipe = {
                    name: activeRecipe.name || "",
                    image: activeRecipe.image || "",
                    category: activeRecipe.category || "",
                    favorite: activeRecipe.favorite || false,

                    ingredients: Array.isArray(activeRecipe.ingredients)
                      ? [...activeRecipe.ingredients]
                      : typeof activeRecipe.ingredients === "string"
                        ? activeRecipe.ingredients.split("\n").filter(Boolean)
                        : [""],

                    instructions: Array.isArray(activeRecipe.instructions)
                      ? [...activeRecipe.instructions]
                      : typeof activeRecipe.instructions === "string"
                        ? activeRecipe.instructions.split("\n").filter(Boolean)
                        : [""],

                    imageIngredients: activeRecipe.imageIngredients || [],

                    imageInstructions: activeRecipe.imageInstructions || [],
                  };

                  setNewRecipe(safeRecipe);

                  const index = recipes.findIndex((r) => r.id === activeRecipe.id);

                  setEditIndex(index);

                  setActiveRecipe(null);

                  setTimeout(() => {
                    setPage("new");
                  }, 0);
                }}
              >
                ✏️ Edit
              </button>

              {/* ============================== Favorite ============================== */}
              {/* 
                  This button works for saved recipes from Recipe Book
                  and saved recipes opened from Discover.

                  The existing toggleFavorite function already saves the
                  favorite value to Supabase and updates React state.
              */}
              {activeRecipe?.id && (
                <button className="recipe-action recipe-action-favorite" onClick={() => toggleFavorite(activeRecipe)}>
                  {activeRecipe.favorite ? "💛 Remove from Favorites" : "⭐ Add to Favorites"}
                </button>
              )}

              <h2 className="recipe-modal-title">{activeRecipe.name}</h2>

              {activeRecipe.image && (
                <div className="recipe-modal-image">
                  <img src={activeRecipe.image} alt={activeRecipe.name} />
                </div>
              )}

              <p className="recipe-zoom-note">
                <strong>
                  🔍 Need to read this recipe better? PC: hold Ctrl and scroll to zoom. Touchscreen, phone, or tablet: pinch with two fingers. You can
                  also use + and − above.
                </strong>
              </p>

              <section className="recipe-planner-section">
                <strong>📅 Add to Planner:</strong>

                <div className="planner-day-buttons">
                  {Object.keys(weeklyPlan || {}).map((day) => {
                    const alreadyAdded = (weeklyPlan[day] || []).some((r) => r.name === activeRecipe.name);

                    return (
                      <button
                        key={day}
                        onClick={() => {
                          assignToDay(day, activeRecipe);

                          setPlannerFeedback(day);

                          window.clearTimeout(window.plannerTimeout);

                          window.plannerTimeout = setTimeout(() => {
                            setPlannerFeedback("");
                          }, 2000);
                        }}
                        className="planner-day-button"
                      >
                        {plannerFeedback === day ? `✔ ${day}` : day}
                      </button>
                    );
                  })}
                </div>
              </section>

              {!activeRecipe?.id && !recipes.some((recipe) => recipe.name === activeRecipe.name) && (
                <button
                  className="recipe-action recipe-action-save"
                  onClick={async () => {
                    if (!user) return;

                    const recipeToSave = {
                      user_id: user.id,
                      name: activeRecipe.name || "",
                      ingredients: JSON.stringify(activeRecipe.ingredients || []),
                      instructions: JSON.stringify(activeRecipe.instructions || []),
                      category: activeRecipe.category || "",
                      favorite: activeRecipe.favorite || false,
                      image: activeRecipe.image || "",
                    };

                    const { data, error } = await supabase.from("recipes").insert([recipeToSave]).select().single();

                    if (error) {
                      console.error("Error adding recipe:", error);
                      alert("There was a problem saving this recipe.");
                      return;
                    }

                    const savedRecipe = formatSavedRecipe(data);
                    setRecipes((prev) => [...prev, savedRecipe]);
                    setActiveRecipe(savedRecipe);
                    setRecipeAdded(true);

                    setTimeout(() => {
                      setRecipeAdded(false);
                    }, 2000);
                  }}
                >
                  {recipeAdded ? "✅ Added to My Recipes!" : "➕ Add to My Recipes"}
                </button>
              )}

              <button
                className="recipe-action recipe-action-grocery"
                onClick={() => {
                  const selected = Object.keys(selectedItems).filter((item) => selectedItems[item]);

                  const updated = [...new Set([...groceryList, ...selected])];

                  setGroceryList(updated);
                  localStorage.setItem("groceryList", JSON.stringify(updated));

                  setSelectedItems({});
                  setGroceryAdded(true);

                  setTimeout(() => {
                    setGroceryAdded(false);
                  }, 2000);
                }}
              >
                {groceryAdded ? "✅ Added to Grocery List!" : "➕ Add Selected Ingredients"}
              </button>

              <section className="recipe-ingredients">
                <strong>Ingredients:</strong>
                {(Array.isArray(activeRecipe.ingredients) ? activeRecipe.ingredients : []).map((item, i) => (
                  <div key={i}>
                    <input
                      type="checkbox"
                      checked={selectedItems[item] || false}
                      onChange={() =>
                        setSelectedItems((prev) => ({
                          ...prev,
                          [item]: !prev[item],
                        }))
                      }
                    />

                    <span>• {item}</span>
                  </div>
                ))}
              </section>

              <section className="recipe-instructions">
                <strong>Instructions:</strong>
                {(Array.isArray(activeRecipe.instructions) ? activeRecipe.instructions : activeRecipe.instructions?.split("\n") || []).map(
                  (step, i) => (
                    <div key={i}>{step}</div>
                  ),
                )}
              </section>
            </div>
          </article>
        </div>
      )}
      <Footer />
    </div>
  );
}
