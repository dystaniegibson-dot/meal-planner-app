// ============================== Footer ==============================

export default function Footer() {
  // Automatically gets the current year
  // so you never have to manually update it.
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <p>© {currentYear} Meal Planner. All rights reserved.</p>
    </footer>
  );
}
