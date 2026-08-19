import { useState } from "react";
// ============================== Sign In ==============================

export default function SignIn({ email, setEmail, password, setPassword, signIn, signUp, resetPassword }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="signin-page">
      {/* ============================== Sign In Card ============================== */}

      <div className="signin-card">
        {/* ============================== Branding ============================== */}

        <div className="signin-brand">
          <div className="signin-logo">🍓</div>

          <h1 className="signin-title">Cozy Recipe Book</h1>

          <p className="signin-welcome">Welcome back!</p>

          <p className="signin-subtitle">Sign in to continue to your recipes, planner, and grocery list.</p>
        </div>

        {/* ============================== Email ============================== */}

        <div className="signin-field">
          <label htmlFor="signin-email">Email</label>

          <input
            id="signin-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        {/* ============================== Password ============================== */}

        <div className="signin-field">
          <div className="signin-password-label">
            <label htmlFor="signin-password">Password</label>

            <button type="button" className="signin-forgot-button" onClick={resetPassword}>
              Forgot password?
            </button>
          </div>

          <input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                signIn();
              }
            }}
            autoComplete="current-password"
          />
          <label className="show-password-option">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            Show password
          </label>
        </div>

        {/* ============================== Sign In ============================== */}

        <button type="button" className="signin-button" onClick={signIn}>
          Sign In
        </button>

        {/* ============================== Divider ============================== */}

        <div className="signin-divider">
          <span>or</span>
        </div>

        {/* ============================== Create Account ============================== */}

        <button type="button" className="signin-create-button" onClick={signUp}>
          Create Account
        </button>

        {/* ============================== Footer ============================== */}

        <p className="signin-footer">Your recipes, your kitchen, your little cookbook. 🍪</p>
      </div>
    </main>
  );
}
