import { useState } from "react";

// Login + register live in the same form because the only difference is
// whether the email field is shown. Keeps the auth surface tiny.
function AuthScreen({ loading, error, success, onLogin, onRegister, onGuest }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const username = form.username.trim();
    const email = form.email.trim();
    if (mode === "login") {
      onLogin(username, form.password);
    } else {
      onRegister(username, email, form.password);
    }
  }

  return (
    <div className="page page-auth">
      <div className="card auth-card">
        <h1>Flashcard Learning App v2</h1>

        <div className="auth-switch-bar">
          <div className="switch-row">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>
          <button type="button" className="auth-guest-button" onClick={onGuest}>
            Guest Mode
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Username
            <input
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              required
            />
          </label>
          {mode === "register" && (
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    </div>
  );
}

export default AuthScreen;
