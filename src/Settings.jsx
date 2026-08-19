// ==============================
// Settings Page
// ==============================

import { useState } from "react";

const wallpapers = [
  { name: "Animated", file: "/images/animated.png" },
  { name: "Bread", file: "/images/Bread.png" },
  { name: "Breakfast", file: "/images/breakfast.png" },
  { name: "Cat Chef", file: "/images/cat_chef.png" },
  { name: "Cookies", file: "/images/cookies.png" },
  { name: "Cozy Kitchen", file: "/images/cozy_kitchen.png" },
  { name: "Doggy", file: "/images/doggy.png" },
  { name: "Elegant Evening", file: "/images/elegant_evening.png" },
  { name: "Fruit", file: "/images/fruit.png" },
  { name: "Good Boy", file: "/images/good_boy.png" },
  { name: "Herbs", file: "/images/herbs.png" },
  { name: "Hungry Cat", file: "/images/hungry_cat.png" },
  { name: "Kitchen", file: "/images/kitchen.png" },
  { name: "Pink", file: "/images/pink.png" },
  { name: "Pizza", file: "/images/pizza.png" },
  { name: "Ruppies", file: "/images/ruppies.png" },
  { name: "Soup", file: "/images/soup.png" },
  { name: "Veggies", file: "/images/veggies.png" },
  { name: "Whimsicle", file: "/images/whimsicle.png" },
];

export const themes = [
  {
    id: "strawberry",
    name: "🍓 Strawberry Cozy",
    sidebar: "#f4d9d4",
    accent: "#e58b88",
    hover: "#f6d7d2",
    text: "#5f4039",
    fruit: "🍓",
  },
  {
    id: "blueberry",
    name: "🫐 Blueberry",
    sidebar: "#dceaf5",
    accent: "#79a9d1",
    hover: "#c9dfef",
    text: "#38566d",
    fruit: "🫐",
  },
  {
    id: "purple",
    name: "💜 Purple Berry",
    sidebar: "#e9def2",
    accent: "#a985c4",
    hover: "#dcc9e8",
    text: "#60456f",
    fruit: "🍇",
  },
  {
    id: "garden",
    name: "🌿 Garden Green",
    sidebar: "#dfead9",
    accent: "#82a878",
    hover: "#cfe1c8",
    text: "#4d6547",
    fruit: "🌿",
  },
  {
    id: "peach",
    name: "🍑 Peach",
    sidebar: "#f7dfcf",
    accent: "#e8a17f",
    hover: "#f2d0bd",
    text: "#704b3b",
    fruit: "🍑",
  },
  {
    id: "sunshine",
    name: "🌻 Sunshine",
    sidebar: "#f5edc9",
    accent: "#d9b84c",
    hover: "#eee3ad",
    text: "#66562b",
    fruit: "🌻",
  },
  {
    id: "rose",
    name: "🌸 Rose",
    sidebar: "#ead7df",
    accent: "#c4869c",
    hover: "#dfc3cf",
    text: "#684957",
    fruit: "🌸",
  },
];

export default function Settings({ wallpaper, setWallpaper, theme, setTheme }) {
  const [selectedWallpaper, setSelectedWallpaper] = useState(null);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  // Theme that the user has actually confirmed/saved
  const [confirmedTheme, setConfirmedTheme] = useState(theme);

  // Theme currently being previewed
  const [selectedTheme, setSelectedTheme] = useState(null);

  const chooseWallpaper = (newWallpaper) => {
    setWallpaper(newWallpaper);
    localStorage.setItem("wallpaper", newWallpaper);
    setSelectedWallpaper(null);
  };

  // ==============================
  // THEME PREVIEW
  // ==============================

  const previewTheme = (newTheme) => {
    // Change the app visually so the user can preview it
    setTheme(newTheme);

    // Open confirmation modal
    setSelectedTheme(newTheme);
  };

  const chooseTheme = () => {
    if (!selectedTheme) return;

    // This is the point where the theme is officially saved
    setTheme(selectedTheme.id);
    setConfirmedTheme(selectedTheme.id);
    localStorage.setItem("theme", selectedTheme.id);

    // Close modal
    setSelectedTheme(null);
  };

  const cancelThemePreview = () => {
    // Restore the theme that was actually confirmed
    setTheme(confirmedTheme);

    // Close modal
    setSelectedTheme(null);
  };

  return (
    <section className="settings-page">
      {/* SETTINGS TITLE */}
      <h1 className="settings-title">⚙️ Settings</h1>

      {/* ==============================
          WALLPAPER
      ============================== */}

      <div className="settings-section">
        <button className="settings-dropdown" type="button" onClick={() => setWallpaperOpen((prev) => !prev)}>
          <span>🖼️ Wallpaper</span>
          <span>{wallpaperOpen ? "▲" : "▼"}</span>
        </button>

        {/* WALLPAPER OPTIONS */}
        {wallpaperOpen && (
          <div className="wallpaper-grid">
            {wallpapers.map((item) => (
              <button
                key={item.file}
                className={`wallpaper-card ${wallpaper === item.file ? "wallpaper-selected" : ""}`}
                type="button"
                onClick={() => setSelectedWallpaper(item)}
              >
                <img src={item.file} alt={item.name} className="wallpaper-thumbnail" />

                <span>{item.name}</span>

                {wallpaper === item.file && <small>Current wallpaper</small>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ==============================
          WALLPAPER PREVIEW MODAL
      ============================== */}

      {selectedWallpaper && (
        <div className="wallpaper-modal-overlay" onClick={() => setSelectedWallpaper(null)}>
          <div className="wallpaper-modal" onClick={(event) => event.stopPropagation()}>
            <h2>{selectedWallpaper.name}</h2>

            <img src={selectedWallpaper.file} alt={selectedWallpaper.name} className="wallpaper-preview" />

            <p>Would you like to make this your new wallpaper?</p>

            <div className="wallpaper-modal-buttons">
              <button type="button" className="wallpaper-cancel-button" onClick={() => setSelectedWallpaper(null)}>
                Cancel
              </button>

              <button type="button" className="wallpaper-confirm-button" onClick={() => chooseWallpaper(selectedWallpaper.file)}>
                ✓ Use This Wallpaper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================
          THEME
      ============================== */}

      <div className="settings-section">
        <button className="settings-dropdown" type="button" onClick={() => setThemeOpen((prev) => !prev)}>
          <span>🎨 Theme</span>
          <span>{themeOpen ? "▲" : "▼"}</span>
        </button>

        {themeOpen && (
          <div className="theme-grid">
            {themes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`theme-card ${theme === item.id ? "theme-selected" : ""}`}
                onClick={() => previewTheme(item)}
              >
                <div
                  className="theme-preview"
                  style={{
                    background: `linear-gradient(
                      135deg,
                      ${item.sidebar} 50%,
                      ${item.accent} 50%
                    )`,
                  }}
                />

                <span>{item.name}</span>

                {theme === item.id && <small>Current theme</small>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ==============================
          THEME PREVIEW MODAL
      ============================== */}

      {selectedTheme && (
        <div className="theme-modal-overlay" onClick={cancelThemePreview}>
          <div className="theme-modal" onClick={(event) => event.stopPropagation()}>
            <h2>{selectedTheme.name}</h2>

            <div
              className="theme-modal-preview"
              style={{
                background: `linear-gradient(
                  135deg,
                  ${selectedTheme.sidebar} 50%,
                  ${selectedTheme.accent} 50%
                )`,
              }}
            />

            <p>Would you like to keep this theme?</p>

            <div className="theme-modal-buttons">
              <button type="button" className="theme-cancel-button" onClick={cancelThemePreview}>
                Cancel
              </button>

              <button type="button" className="theme-confirm-button" onClick={chooseTheme}>
                ✓ Use This Theme
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
