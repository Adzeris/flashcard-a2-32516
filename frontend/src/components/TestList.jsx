import { useState } from "react";

// Shows all of the user's tests with create/rename/delete/open buttons.
// "Open" is what switches the parent into the per-test workspace view.
function TestList({ tests, loading, onCreate, onOpen, onRename, onDelete }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

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
      <form onSubmit={submitCreate} className="test-form-row">
        <input
          placeholder="New test name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" disabled={loading}>Add Test</button>
      </form>

      <div className="list">
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
