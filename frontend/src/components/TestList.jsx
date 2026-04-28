import { useEffect, useState } from "react";
import { authRequest } from "../api";

// Shows all of the user's tests with create/rename/delete/open buttons.
// "Open" is what switches the parent into the per-test workspace view.
// Global search hits GET /api/flashcards?search=... with no test filter (all decks).
function TestList({
  tests,
  loading,
  token,
  onCreate,
  onOpen,
  onOpenAndEdit,
  onRename,
  onDelete,
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalHits, setGlobalHits] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  useEffect(() => {
    const q = globalQuery.trim();
    if (!q || !token) {
      setGlobalHits([]);
      setGlobalLoading(false);
      return undefined;
    }
    setGlobalLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("search", q);
      authRequest(`/api/flashcards?${params.toString()}`, token)
        .then((rows) => {
          setGlobalHits(rows);
          setGlobalLoading(false);
        })
        .catch(() => {
          setGlobalHits([]);
          setGlobalLoading(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [globalQuery, token]);

  function testIdForCard(card) {
    return tests.find((t) => t.name === card.category)?.id ?? null;
  }

  async function submitCreate(event) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await onCreate(name);
    setNewName("");
  }

  async function submitRename(testId) {
    const name = editingName.trim();
    if (!name) return;
    await onRename(testId, name);
    setEditingId(null);
    setEditingName("");
  }

  return (
    <section className="card">
      <h2>Flashcards</h2>
      <div className="test-list-search-section">
        <label>
          Universal search
          <input
            placeholder="Search every test for a question or answer..."
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
        {globalLoading && globalQuery.trim() && <p className="hint test-list-search-hint">Searching…</p>}
        {globalQuery.trim() && !globalLoading && (
          <div className="list list-scroll global-search-results">
          {globalHits.length === 0 && <p className="hint">No matches.</p>}
          {globalHits.map((card) => {
            const tid = testIdForCard(card);
            return (
              <article key={card.id} className="list-item">
                <h3>{card.question}</h3>
                <p>{card.answer}</p>
                <p className="meta">
                  Test: {card.category} · Difficulty {card.difficulty}
                  {card.owner_username ? ` · ${card.owner_username}` : ""}
                </p>
                <div className="row">
                  <button
                    type="button"
                    disabled={tid == null}
                    title={tid == null ? "No matching test in your list" : undefined}
                    onClick={() => tid != null && onOpen(tid)}
                  >
                    Open test
                  </button>
                  <button
                    type="button"
                    disabled={tid == null}
                    onClick={() => tid != null && onOpenAndEdit(tid, card)}
                  >
                    Edit
                  </button>
                </div>
              </article>
            );
          })}
          </div>
        )}
      </div>

      <form onSubmit={submitCreate} className="test-form-row test-list-add-form">
        <input
          placeholder="New test name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" disabled={loading}>Add Test</button>
      </form>

      <div className="list test-list-decks">
        {tests.length === 0 && (
          <p className="hint">No tests yet. Add one to start creating flashcards.</p>
        )}
        {tests.map((test) => (
          <article key={test.id} className="list-item">
            {editingId === test.id ? (
              <div className="form-grid">
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Test name"
                />
                <div className="row">
                  <button type="button" onClick={() => submitRename(test.id)}>Save</button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditingName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3>{test.name}</h3>
                <p className="meta">{test.flashcard_count} flashcards</p>
                <div className="row">
                  <button type="button" className="test-chip" onClick={() => onOpen(test.id)}>
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(test.id);
                      setEditingName(test.name);
                    }}
                  >
                    Rename
                  </button>
                  <button type="button" onClick={() => onDelete(test.id, test.name)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default TestList;
