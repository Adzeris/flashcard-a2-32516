import { useEffect, useState } from "react";
import { authRequest } from "../api";
import { formatDate } from "../utils/format";

// Admin-only view. Two columns: list of users on the left, the selected
// user's history on the right. Role toggle and delete live next to each user.
function AdminTab({ token, currentUser, ui }) {
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedHistory, setSelectedHistory] = useState([]);

  async function loadUsers() {
    const list = await authRequest("/api/users", token);
    setUsers(list);
  }

  useEffect(() => {
    loadUsers().catch((err) => ui.setError(err.message || "Failed to load users"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleToggleRole(target) {
    const nextRole = target.role === "admin" ? "user" : "admin";
    const message =
      nextRole === "admin"
        ? `${target.username} turned into admin`
        : `${target.username} changed back to user`;

    await ui.run(async () => {
      await authRequest(`/api/users/${target.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ role: nextRole }),
      });
      await loadUsers();
    }, message);
  }

  async function handleDelete(userId) {
    if (!window.confirm("Delete this user account?")) return;
    await ui.run(async () => {
      await authRequest(`/api/users/${userId}`, token, { method: "DELETE" });
      await loadUsers();
      if (String(userId) === selectedId) {
        setSelectedId("");
        setSelectedHistory([]);
      }
    }, "User deleted");
  }

  async function handleViewHistory(userId) {
    setSelectedId(String(userId));
    await ui.run(async () => {
      const data = await authRequest(`/api/users/${userId}/history`, token);
      setSelectedHistory(data);
    });
  }

  return (
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
                <button type="button" onClick={() => handleToggleRole(item)}>
                  {item.role === "admin" ? "Change to User" : "Change to Admin"}
                </button>
                <button type="button" onClick={() => handleViewHistory(item.id)}>
                  View History
                </button>
                {item.id !== currentUser.id && (
                  <button type="button" onClick={() => handleDelete(item.id)}>
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
        {!selectedId && <p>Pick a user from the left panel.</p>}
        {selectedId && selectedHistory.length === 0 && <p>No records.</p>}
        <div className="list">
          {selectedHistory.map((item) => (
            <article key={item.id} className="list-item">
              <h3>{item.flashcard_test || "Unassigned Test"}</h3>
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
  );
}

export default AdminTab;
