import { useEffect, useState } from "react";

// ============================== Grocery List ==============================

export default function GroceryList({ manualGroceryItem, setManualGroceryItem, groceryList, setGroceryList, checkedItems, setCheckedItems }) {
  // ============================== Grocery Frequency ==============================

  const [groceryFrequency, setGroceryFrequency] = useState(() => {
    const saved = localStorage.getItem("groceryFrequency");
    return saved ? JSON.parse(saved) : {};
  });

  // ============================== Duplicate Message ==============================

  const [duplicateMessage, setDuplicateMessage] = useState("");

  // ============================== Category Overrides ==============================

  const [categoryOverrides, setCategoryOverrides] = useState(() => {
    const saved = localStorage.getItem("groceryCategoryOverrides");
    return saved ? JSON.parse(saved) : {};
  });

  // ============================== Don't Forget Overrides ==============================

  const [dontForgetOverrides, setDontForgetOverrides] = useState(() => {
    const saved = localStorage.getItem("groceryDontForget");
    return saved ? JSON.parse(saved) : {};
  });

  // ============================== Menus / Confirmation ==============================

  const [openMenu, setOpenMenu] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // ============================== Close Menu When Clicking Outside ==============================

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".grocery-item-row")) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  // ============================== Duplicate Message ==============================

  const showDuplicateMessage = (itemName) => {
    setDuplicateMessage(`🛒 ${itemName} is already on your list!`);

    setTimeout(() => {
      setDuplicateMessage("");
    }, 4000);
  };

  // ============================== Add Grocery Item ==============================

  const addGroceryItem = () => {
    const item = manualGroceryItem.trim();

    if (!item) return;

    const alreadyOnList = groceryList.some((existingItem) => existingItem.toLowerCase() === item.toLowerCase());

    if (alreadyOnList) {
      showDuplicateMessage(item);
      setManualGroceryItem("");
      return;
    }

    const updated = [...groceryList, item];

    setGroceryList(updated);
    localStorage.setItem("groceryList", JSON.stringify(updated));

    const key = item.toLowerCase();

    const updatedFrequency = {
      ...groceryFrequency,
      [key]: {
        name: groceryFrequency[key]?.name || item,
        count: (groceryFrequency[key]?.count || 0) + 1,
      },
    };

    setGroceryFrequency(updatedFrequency);

    localStorage.setItem("groceryFrequency", JSON.stringify(updatedFrequency));

    setManualGroceryItem("");
  };

  // ============================== Add From Don't Forget ==============================

  const addFromDontForget = (item) => {
    const alreadyOnList = groceryList.some((existingItem) => existingItem.toLowerCase() === item.name.toLowerCase());

    if (alreadyOnList) {
      showDuplicateMessage(item.name);
      return;
    }

    const updated = [...groceryList, item.name];

    setGroceryList(updated);
    localStorage.setItem("groceryList", JSON.stringify(updated));

    const key = item.name.toLowerCase();

    const updatedFrequency = {
      ...groceryFrequency,
      [key]: {
        name: groceryFrequency[key]?.name || item.name,
        count: (groceryFrequency[key]?.count || 0) + 1,
      },
    };

    setGroceryFrequency(updatedFrequency);

    localStorage.setItem("groceryFrequency", JSON.stringify(updatedFrequency));
  };

  // ============================== Add To Don't Forget ==============================

  const addToDontForget = (item) => {
    const key = item.toLowerCase().trim();

    const updated = {
      ...dontForgetOverrides,
      [key]: {
        name: item,
      },
    };

    setDontForgetOverrides(updated);

    localStorage.setItem("groceryDontForget", JSON.stringify(updated));

    setOpenMenu(null);
  };

  // ============================== Don't Forget Items ==============================

  const dontForgetItems = Object.values({
    ...Object.fromEntries(
      Object.values(groceryFrequency)
        .filter((item) => item.count >= 2)
        .map((item) => [
          item.name.toLowerCase(),
          {
            name: item.name,
            count: item.count,
          },
        ]),
    ),

    ...Object.fromEntries(
      Object.values(dontForgetOverrides).map((item) => [
        item.name.toLowerCase(),
        {
          name: item.name,
          count: groceryFrequency[item.name.toLowerCase()]?.count || 0,
        },
      ]),
    ),
  }).sort((a, b) => b.count - a.count);

  // ============================== Food Detection ==============================

  const isFoodItem = (item) => {
    const foodWords = [
      "milk",
      "egg",
      "eggs",
      "bread",
      "butter",
      "cheese",
      "chicken",
      "beef",
      "steak",
      "pork",
      "bacon",
      "sausage",
      "turkey",
      "ham",
      "fish",
      "salmon",
      "shrimp",
      "rice",
      "pasta",
      "flour",
      "sugar",
      "salt",
      "pepper",
      "oil",
      "vinegar",
      "sauce",
      "ketchup",
      "mustard",
      "mayonnaise",
      "fruit",
      "apple",
      "apples",
      "banana",
      "bananas",
      "orange",
      "oranges",
      "lemon",
      "lemons",
      "lime",
      "limes",
      "strawberry",
      "strawberries",
      "blueberry",
      "blueberries",
      "grape",
      "grapes",
      "potato",
      "potatoes",
      "tomato",
      "tomatoes",
      "onion",
      "onions",
      "garlic",
      "lettuce",
      "spinach",
      "carrot",
      "carrots",
      "cucumber",
      "cucumbers",
      "cereal",
      "oatmeal",
      "yogurt",
      "coffee",
      "tea",
      "juice",
      "soda",
      "water",
      "snack",
      "chips",
      "cookies",
      "crackers",
      "candy",
      "chocolate",
    ];

    const lowerItem = item.toLowerCase().trim();

    if (categoryOverrides[lowerItem] === "food") {
      return true;
    }

    if (categoryOverrides[lowerItem] === "household") {
      return false;
    }

    return foodWords.some((word) => lowerItem.includes(word));
  };

  // ============================== Change Category ==============================

  const changeItemCategory = (item, category) => {
    const key = item.toLowerCase().trim();

    const updatedOverrides = {
      ...categoryOverrides,
      [key]: category,
    };

    setCategoryOverrides(updatedOverrides);

    localStorage.setItem("groceryCategoryOverrides", JSON.stringify(updatedOverrides));

    setOpenMenu(null);
  };

  // ============================== Toggle Bought ==============================

  const toggleBought = (item) => {
    setCheckedItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));

    setOpenMenu(null);
  };

  // ============================== Remove Item ==============================

  const removeItem = (item) => {
    const updated = groceryList.filter((existingItem) => existingItem !== item);

    setGroceryList(updated);
    localStorage.setItem("groceryList", JSON.stringify(updated));

    setOpenMenu(null);
  };

  // ============================== Sort Items ==============================

  const foodItems = groceryList.filter(isFoodItem).sort((a, b) => Number(checkedItems[a] || false) - Number(checkedItems[b] || false));

  const nonFoodItems = groceryList
    .filter((item) => !isFoodItem(item))
    .sort((a, b) => Number(checkedItems[a] || false) - Number(checkedItems[b] || false));

  // ============================== Grocery Item Row ==============================

  const renderItem = (item, category) => {
    const isChecked = checkedItems[item] || false;
    const menuIsOpen = openMenu === item;

    return (
      <div key={`${category}-${item}`} className={`grocery-item-row ${isChecked ? "grocery-item-checked" : ""}`}>
        {/* ITEM NAME */}

        <span
          className={`grocery-item-name ${isChecked ? "grocery-item-name-checked" : ""}`}
          onClick={() => toggleBought(item)}
          title={isChecked ? "Click to mark as needed again" : "Click when you have bought this"}
        >
          {item}
        </span>

        {/* THREE DOTS */}

        <button
          className="grocery-menu-button"
          onClick={() => setOpenMenu(menuIsOpen ? null : item)}
          title="More options"
          aria-label={`More options for ${item}`}
        >
          ⋮
        </button>

        {/* OPTIONS MENU */}

        {menuIsOpen && (
          <div className="grocery-options-menu">
            <button className="grocery-option-button" onClick={() => addToDontForget(item)}>
              {dontForgetOverrides[item.toLowerCase()] || groceryFrequency[item.toLowerCase()]?.count >= 2
                ? "✓ Already in Don't Forget"
                : "🧠 Add to Don't Forget"}
            </button>

            <button className="grocery-option-button" onClick={() => changeItemCategory(item, category === "food" ? "household" : "food")}>
              {category === "food" ? "🏠 Move to Household" : "🍎 Move to Food"}
            </button>

            <button className="grocery-option-button grocery-option-remove" onClick={() => removeItem(item)}>
              ✖ Remove from List
            </button>
          </div>
        )}
      </div>
    );
  };

  // ============================== Page ==============================

  return (
    <main className="grocery-page">
      {/* PAGE TITLE */}

      <h2 className="grocery-title">🛒 Grocery</h2>

      {/* ADD ITEM */}

      <div className="grocery-add-area">
        <input
          className="grocery-add-input"
          type="text"
          placeholder="What do you need?"
          value={manualGroceryItem}
          onChange={(e) => setManualGroceryItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addGroceryItem();
            }
          }}
        />

        <button className="grocery-add-button" onClick={addGroceryItem}>
          ➕ Add
        </button>
      </div>

      {/* DUPLICATE MESSAGE */}

      {duplicateMessage && <div className="grocery-duplicate-message">{duplicateMessage}</div>}

      {/* SHOPPING LIST */}

      <div className="grocery-list-container">
        <h3 className="grocery-section-title">🛒 Shopping List</h3>

        <p className="grocery-tip">💡 Tap an item's name to scratch it off when you've picked it up. Tap ⋮ for more options.</p>

        {groceryList.length === 0 ? (
          <p className="grocery-empty-message">Your shopping list is empty.</p>
        ) : (
          <>
            {/* FOOD */}

            {foodItems.length > 0 && (
              <section className="grocery-category-section">
                <h4 className="grocery-category-title">🍎 Food</h4>

                {foodItems.map((item) => renderItem(item, "food"))}
              </section>
            )}

            {/* HOUSEHOLD */}

            {nonFoodItems.length > 0 && (
              <section className="grocery-category-section grocery-household-section">
                <h4 className="grocery-category-title">🏠 Household & Other</h4>

                {nonFoodItems.map((item) => renderItem(item, "household"))}
              </section>
            )}

            {/* CLEAR LIST */}

            <button className="grocery-clear-button" onClick={() => setShowClearConfirm(true)}>
              🧹 Clear Shopping List
            </button>
          </>
        )}
      </div>

      {/* DON'T FORGET */}

      {dontForgetItems.length > 0 && (
        <div className="grocery-dont-forget">
          <h3 className="grocery-section-title">🧠 Don't Forget</h3>

          <p className="grocery-dont-forget-description">Things you seem to buy often.</p>

          {dontForgetItems.map((item) => (
            <div key={item.name} className="grocery-dont-forget-item">
              <div>
                <span className="grocery-dont-forget-name">{item.name}</span>

                <div className="grocery-frequency">{item.count > 0 ? `Added ${item.count >= 5 ? "5+" : item.count} times` : "Added manually"}</div>
              </div>

              <button className="grocery-dont-forget-add" onClick={() => addFromDontForget(item)} title={`Add ${item.name}`}>
                ＋
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CLEAR LIST CONFIRMATION */}

      {showClearConfirm && (
        <div className="grocery-confirm-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="grocery-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="grocery-confirm-icon">🧹</div>

            <h3 className="grocery-confirm-title">Clear your shopping list?</h3>

            <p className="grocery-confirm-text">
              This will remove all of the items from your current shopping list. Your Don't Forget items and learned categories will stay safe.
            </p>

            <div className="grocery-confirm-buttons">
              <button className="grocery-cancel-button" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>

              <button
                className="grocery-confirm-clear-button"
                onClick={() => {
                  setGroceryList([]);
                  localStorage.setItem("groceryList", JSON.stringify([]));
                  setCheckedItems({});
                  setShowClearConfirm(false);
                  setOpenMenu(null);
                }}
              >
                Clear List
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
