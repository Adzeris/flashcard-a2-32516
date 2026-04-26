import { useEffect, useState } from "react";
import { authRequest } from "../api";

// Profile edit form. Password is optional - we only send it if the user
// actually typed a new one, otherwise the backend leaves the hash alone.
function ProfileTab({ token, user, ui, onSaved }) {
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  useEffect(() => {
    setForm({ username: user.username, email: user.email, password: "" });
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    await ui.run(async () => {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }
      await authRequest("/api/users/me", token, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      await onSaved?.();
      setForm((prev) => ({ ...prev, password: "" }));
    }, "Profile updated");
  }

  return (
    <section className="panel-grid">
      <div className="card">
        <h2>My Profile</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Username
            <input
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </label>
          <label>
            New Password (optional)
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </label>
          <button type="submit" disabled={ui.loading}>Save Profile</button>
        </form>
      </div>
    </section>
  );
}

export default ProfileTab;
