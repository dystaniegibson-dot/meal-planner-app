import { useState } from "react";

// ============================== Sign In ==============================

export default function SignIn({ email, setEmail, password, setPassword, signIn, signUp, resetPassword }) {
  // Controls whether we are showing the Sign In form
  // or the Create Account form.
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="signin-page">
      {/* ============================== Sign In Card ============================== */}

      <div className="signin-card">
        {/* ============================== Branding ============================== */}

        <div className="signin-brand">
          <div className="signin-logo">🍓</div>

          <h1 className="signin-title">Cozy Recipe Book</h1>

          <p className="signin-welcome">{isCreatingAccount ? "Create Your Account" : "Welcome back!"}</p>

          <p className="signin-subtitle">
            {isCreatingAccount
              ? "Enter your email and create a password to get started."
              : "Sign in to continue to your recipes, planner, and grocery list."}
          </p>
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

            {/* Forgot password only appears when signing in. */}
            {!isCreatingAccount && (
              <button type="button" className="signin-forgot-button" onClick={resetPassword}>
                Forgot password?
              </button>
            )}
          </div>

          <input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            placeholder={isCreatingAccount ? "Create a password" : "Enter your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (isCreatingAccount) {
                  signUp();
                } else {
                  signIn();
                }
              }
            }}
            autoComplete={isCreatingAccount ? "new-password" : "current-password"}
          />

          <label className="show-password-option">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            Show password
          </label>
        </div>

        {/* ============================== Main Action ============================== */}

        <button type="button" className="signin-button" onClick={isCreatingAccount ? signUp : signIn}>
          {isCreatingAccount ? "Create Account" : "Sign In"}
        </button>

        {/* ============================== Divider ============================== */}

        <div className="signin-divider">
          <span>or</span>
        </div>

        {/* ============================== Account Mode Switch ============================== */}

        {isCreatingAccount ? (
          <button
            type="button"
            className="signin-create-button"
            onClick={() => {
              setIsCreatingAccount(false);
              setShowPassword(false);
            }}
          >
            Already have an account? Sign In
          </button>
        ) : (
          <button
            type="button"
            className="signin-create-button"
            onClick={() => {
              setIsCreatingAccount(true);
              setShowPassword(false);
            }}
          >
            Create Account
          </button>
        )}

        {/* ============================== Footer ============================== */}

        <p className="signin-footer">Your recipes, your kitchen, your little cookbook. 🍪</p>
      </div>
    </main>
  );
}
