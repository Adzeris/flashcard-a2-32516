import { useEffect, useMemo, useState } from "react";
import { apiRequest, authRequest, loginRequest } from "./api";

const initialFlashcardForm = {
  question: "",
  answer: "",
  category: "General",
  difficulty: 1,
};

const initialHistoryForm = {
  flashcard_id: "",
  notes: "",
  was_correct: "",
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("flashcards");
  const [globalError, setGlobalError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ username: "", email: "", password: "" });

  const [search, setSearch] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardForm, setFlashcardForm] = useState(initialFlashcardForm);
  const [editingFlashcardId, setEditingFlashcardId] = useState(null);

  const [histories, setHistories] = useState([]);
  const [historyForm, setHistoryForm] = useState(initialHistoryForm);

  const [profileForm, setProfileForm] = useState({ username: "", email: "", password: "" });

  const [users, setUsers] = useState([]);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState("");
  const [selectedUserHistory, setSelectedUserHistory] = useState([]);

  const isAdmin = user?.role === "admin";

  const availableTabs = useMemo(() => {
    const baseTabs = ["flashcards", "history", "profile"];
    if (isAdmin) baseTabs.push("admin");
    return baseTabs;
  }, [isAdmin]);

  useEffect(() => {
    if (!token) return;
    localStorage.setItem("token", token);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    fetchCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    const timer = setTimeout(() => {
      loadFlashcards(search);
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, token, user]);

  useEffect(() => {
    if (!token || !user) return;
    loadFlashcards();
    loadHistories();
    if (isAdmin) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, isAdmin]);

  async function withUiFeedback(action, successMessage = "") {
    setLoading(true);
    setGlobalError("");
    setSuccess("");
    try {
      await action();
      if (successMessage) setSuccess(successMessage);
    } catch (error) {
      setGlobalError(error.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrentUser() {
    await withUiFeedback(async () => {
      const me = await authRequest("/api/auth/me", token);
      setUser(me);
      setProfileForm({ username: me.username, email: me.email, password: "" });
    });
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (authMode === "login") {
      await withUiFeedback(async () => {
        const payload = await loginRequest(authForm.username.trim(), authForm.password);
        setToken(payload.access_token);
      }, "Logged in successfully");
      return;
    }

    await withUiFeedback(async () => {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: authForm.username.trim(),
          email: authForm.email.trim(),
          password: authForm.password,
        }),
      });
      const payload = await loginRequest(authForm.username.trim(), authForm.password);
      setToken(payload.access_token);
    }, "Account created and logged in");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setFlashcards([]);
    setHistories([]);
    setUsers([]);
    setSelectedAdminUserId("");
    setSelectedUserHistory([]);
    setAuthForm({ username: "", email: "", password: "" });
    setSearch("");
    setFlashcardForm(initialFlashcardForm);
    setEditingFlashcardId(null);
    setHistoryForm(initialHistoryForm);
    setGlobalError("");
    setSuccess("");
  }

  async function loadFlashcards(searchTerm = "") {
    const query = searchTerm.trim()
      ? `/api/flashcards?search=${encodeURIComponent(searchTerm.trim())}`
      : "/api/flashcards";
    const list = await authRequest(query, token);
    setFlashcards(list);
  }

  async function loadHistories() {
    const list = await authRequest("/api/histories", token);
    setHistories(list);
  }

  async function loadUsers() {
    const list = await authRequest("/api/users", token);
    setUsers(list);
  }

  async function handleFlashcardSubmit(event) {
    event.preventDefault();
    await withUiFeedback(async () => {
      if (editingFlashcardId) {
        await authRequest(`/api/flashcards/${editingFlashcardId}`, token, {
          method: "PUT",
          body: JSON.stringify({
            question: flashcardForm.question.trim(),
            answer: flashcardForm.answer.trim(),
            category: flashcardForm.category.trim(),
            difficulty: Number(flashcardForm.difficulty),
          }),
        });
      } else {
        await authRequest("/api/flashcards", token, {
          method: "POST",
          body: JSON.stringify({
            question: flashcardForm.question.trim(),
            answer: flashcardForm.answer.trim(),
            category: flashcardForm.category.trim(),
            difficulty: Number(flashcardForm.difficulty),
          }),
        });
      }
      setFlashcardForm(initialFlashcardForm);
      setEditingFlashcardId(null);
      await loadFlashcards(search);
    }, editingFlashcardId ? "Flashcard updated" : "Flashcard created");
  }

  function handleFlashcardEdit(card) {
    setEditingFlashcardId(card.id);
    setFlashcardForm({
      question: card.question,
      answer: card.answer,
      category: card.category,
      difficulty: card.difficulty,
    });
  }

  async function handleDeleteFlashcard(cardId) {
    if (!window.confirm("Delete this flashcard?")) return;
    await withUiFeedback(async () => {
      await authRequest(`/api/flashcards/${cardId}`, token, { method: "DELETE" });
      await loadFlashcards(search);
      await loadHistories();
    }, "Flashcard deleted");
  }

  async function handleHistorySubmit(event) {
    event.preventDefault();
    await withUiFeedback(async () => {
      await authRequest("/api/histories", token, {
        method: "POST",
        body: JSON.stringify({
          flashcard_id: Number(historyForm.flashcard_id),
          notes: historyForm.notes.trim() || null,
          was_correct:
            historyForm.was_correct === ""
              ? null
              : historyForm.was_correct === "true",
        }),
      });
      setHistoryForm(initialHistoryForm);
      await loadHistories();
    }, "Learning history added");
  }

  async function toggleHistoryAccuracy(item) {
    await withUiFeedback(async () => {
      await authRequest(`/api/histories/${item.id}`, token, {
        method: "PUT",
        body: JSON.stringify({
          notes: item.notes,
          was_correct: item.was_correct === null ? true : !item.was_correct,
        }),
      });
      await loadHistories();
    }, "History updated");
  }

  async function handleDeleteHistory(historyId) {
    if (!window.confirm("Delete this history record?")) return;
    await withUiFeedback(async () => {
      await authRequest(`/api/histories/${historyId}`, token, { method: "DELETE" });
      await loadHistories();
    }, "History record deleted");
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    await withUiFeedback(async () => {
      const payload = {
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
      };
      if (profileForm.password.trim()) {
        payload.password = profileForm.password.trim();
      }

      await authRequest("/api/users/me", token, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      await fetchCurrentUser();
      setProfileForm((prev) => ({ ...prev, password: "" }));
    }, "Profile updated");
  }

  async function handleChangeRole(userId, role) {
    await withUiFeedback(async () => {
      await authRequest(`/api/users/${userId}`, token, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      await loadUsers();
    }, "User role updated");
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("Delete this user account?")) return;
    await withUiFeedback(async () => {
      await authRequest(`/api/users/${userId}`, token, { method: "DELETE" });
      await loadUsers();
      if (String(userId) === selectedAdminUserId) {
        setSelectedAdminUserId("");
        setSelectedUserHistory([]);
      }
    }, "User deleted");
  }

  async function handleLoadSelectedUserHistory(userId) {
    setSelectedAdminUserId(String(userId));
    await withUiFeedback(async () => {
      const data = await authRequest(`/api/users/${userId}/history`, token);
      setSelectedUserHistory(data);
    });
  }

  if (!token || !user) {
    return (
      <div className="page page-auth">
        <div className="card auth-card">
          <h1>Flashcard Learning App v2</h1>
          <p>Assignment 2: JWT auth + CRUD for Users, Flashcards, and View History.</p>

          <div className="switch-row">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="form-grid">
            <label>
              Username
              <input
                value={authForm.username}
                onChange={(e) => setAuthForm((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
            </label>
            {authMode === "register" && (
              <label>
                Email
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </label>
            )}
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Please wait..." : authMode === "login" ? "Login" : "Create account"}
            </button>
          </form>

          <p className="hint">
            Default admin: <code>admin</code> / <code>admin123</code>
          </p>
          {globalError && <p className="error">{globalError}</p>}
          {success && <p className="success">{success}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <h1>Flashcard Learning App v2</h1>
          <p>
            Logged in as <strong>{user.username}</strong> ({user.role})
          </p>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <nav className="tab-row">
        {availableTabs.map((name) => (
          <button
            key={name}
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      {globalError && <p className="error">{globalError}</p>}
      {success && <p className="success">{success}</p>}

      {tab === "flashcards" && (
        <section className="panel-grid">
          <div className="card">
            <h2>{editingFlashcardId ? "Edit Flashcard" : "Create Flashcard"}</h2>
            <form onSubmit={handleFlashcardSubmit} className="form-grid">
              <label>
                Question
                <textarea
                  value={flashcardForm.question}
                  onChange={(e) =>
                    setFlashcardForm((prev) => ({ ...prev, question: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Answer
                <textarea
                  value={flashcardForm.answer}
                  onChange={(e) =>
                    setFlashcardForm((prev) => ({ ...prev, answer: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Category
                <input
                  value={flashcardForm.category}
                  onChange={(e) =>
                    setFlashcardForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Difficulty (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={flashcardForm.difficulty}
                  onChange={(e) =>
                    setFlashcardForm((prev) => ({
                      ...prev,
                      difficulty: Number(e.target.value),
                    }))
                  }
                  required
                />
              </label>
              <div className="row">
                <button type="submit" disabled={loading}>
                  {editingFlashcardId ? "Update" : "Create"}
                </button>
                {editingFlashcardId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFlashcardId(null);
                      setFlashcardForm(initialFlashcardForm);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="card">
            <h2>Flashcards</h2>
            <input
              placeholder="Live search by question, answer, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="list">
              {flashcards.length === 0 && <p>No flashcards found.</p>}
              {flashcards.map((card) => (
                <article key={card.id} className="list-item">
                  <h3>{card.question}</h3>
                  <p>{card.answer}</p>
                  <p className="meta">
                    {card.category} | Difficulty {card.difficulty} | Owner:{" "}
                    {card.owner_username || card.user_id}
                  </p>
                  <div className="row">
                    <button type="button" onClick={() => handleFlashcardEdit(card)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteFlashcard(card.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "history" && (
        <section className="panel-grid">
          <div className="card">
            <h2>Add Learning Record</h2>
            <form onSubmit={handleHistorySubmit} className="form-grid">
              <label>
                Flashcard
                <select
                  value={historyForm.flashcard_id}
                  onChange={(e) =>
                    setHistoryForm((prev) => ({ ...prev, flashcard_id: e.target.value }))
                  }
                  required
                >
                  <option value="">Select flashcard</option>
                  {flashcards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.question}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <textarea
                  value={historyForm.notes}
                  onChange={(e) => setHistoryForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>
              <label>
                Correct?
                <select
                  value={historyForm.was_correct}
                  onChange={(e) =>
                    setHistoryForm((prev) => ({ ...prev, was_correct: e.target.value }))
                  }
                >
                  <option value="">Not set</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <button type="submit" disabled={loading}>
                Save record
              </button>
            </form>
          </div>

          <div className="card">
            <h2>My View History</h2>
            <div className="list">
              {histories.length === 0 && <p>No history records yet.</p>}
              {histories.map((item) => (
                <article key={item.id} className="list-item">
                  <h3>{item.flashcard_question || `Flashcard #${item.flashcard_id}`}</h3>
                  <p>{item.notes || "No notes"}</p>
                  <p className="meta">
                    Correct:{" "}
                    {item.was_correct === null ? "Unknown" : item.was_correct ? "Yes" : "No"} |{" "}
                    {formatDate(item.viewed_at)}
                  </p>
                  <div className="row">
                    <button type="button" onClick={() => toggleHistoryAccuracy(item)}>
                      Toggle Correct
                    </button>
                    <button type="button" onClick={() => handleDeleteHistory(item.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "profile" && (
        <section className="panel-grid">
          <div className="card">
            <h2>My Profile</h2>
            <form onSubmit={handleProfileSave} className="form-grid">
              <label>
                Username
                <input
                  value={profileForm.username}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                New Password (optional)
                <input
                  type="password"
                  value={profileForm.password}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </label>
              <button type="submit" disabled={loading}>
                Save Profile
              </button>
            </form>
          </div>
        </section>
      )}

      {tab === "admin" && isAdmin && (
        <section className="panel-grid">
          <div className="card">
            <h2>Users (Admin)</h2>
            <div className="list">
              {users.map((item) => (
                <article key={item.id} className="list-item">
                  <h3>{item.username}</h3>
                  <p>{item.email}</p>
                  <p className="meta">Role: {item.role}</p>
                  <div className="row">
                    <button
                      type="button"
                      onClick={() =>
                        handleChangeRole(item.id, item.role === "admin" ? "user" : "admin")
                      }
                    >
                      Toggle Role
                    </button>
                    <button type="button" onClick={() => handleLoadSelectedUserHistory(item.id)}>
                      View History
                    </button>
                    {item.id !== user.id && (
                      <button type="button" onClick={() => handleDeleteUser(item.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Selected User History</h2>
            {!selectedAdminUserId && <p>Pick a user from the left panel.</p>}
            {selectedAdminUserId && selectedUserHistory.length === 0 && <p>No records.</p>}
            <div className="list">
              {selectedUserHistory.map((item) => (
                <article key={item.id} className="list-item">
                  <h3>{item.flashcard_question || `Flashcard #${item.flashcard_id}`}</h3>
                  <p>{item.notes || "No notes"}</p>
                  <p className="meta">
                    Correct:{" "}
                    {item.was_correct === null ? "Unknown" : item.was_correct ? "Yes" : "No"} |{" "}
                    {formatDate(item.viewed_at)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
