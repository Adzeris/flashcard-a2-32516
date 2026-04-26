import { useEffect, useState } from "react";
import DifficultyPicker from "./DifficultyPicker";
import StudyPanel from "./StudyPanel";
import { authRequest } from "../api";

const emptyForm = { question: "", answer: "", difficulty: 1 };

// CRUD form + live-search list + study panel for a single test.
// Live search is debounced 200ms so we don't hammer the backend on every keystroke.
// preselectCard: optional card to open in the editor (e.g. jumped from global search).
function TestWorkspace({ token, test, onBack, onChanged, ui, preselectCard, onPreselectConsumed }) {
  const [search, setSearch] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // Debounced fetch on search change. Cleared whenever the test switches
  // so we never display stale results from another test briefly.
  useEffect(() => {
    if (!test) return undefined;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ test: test.name });
      if (search.trim()) params.set("search", search.trim());
      authRequest(`/api/flashcards?${params.toString()}`, token)
        .then(setFlashcards)
        .catch((err) => ui.setError(err.message || "Failed to load flashcards"));
    }, 200);
    return () => clearTimeout(timer);
  }, [search, test, token, ui]);

  // Reset form when switching tests so an in-progress edit doesn't leak across.
  useEffect(() => {
    setEditingId(null);
    setForm(emptyForm);
    setSearch("");
  }, [test?.id]);

  async function reload() {
    const params = new URLSearchParams({ test: test.name });
    if (search.trim()) params.set("search", search.trim());
    const list = await authRequest(`/api/flashcards?${params.toString()}`, token);
    setFlashcards(list);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: test.name,
      difficulty: Number(form.difficulty),
    };

    await ui.run(async () => {
      if (editingId) {
        await authRequest(`/api/flashcards/${editingId}`, token, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await authRequest("/api/flashcards", token, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setForm(emptyForm);
      setEditingId(null);
      await reload();
      onChanged?.();
    }, editingId ? "Flashcard updated" : "Flashcard created");
  }

  function startEdit(card) {
    setEditingId(card.id);
    setForm({
      question: card.question,
      answer: card.answer,
      difficulty: card.difficulty,
    });
  }

  // After cards load for this test, apply a one-off jump from the "search all tests" list.
  useEffect(() => {
    if (!preselectCard) return;
    const match = flashcards.find((c) => c.id === preselectCard.id);
    if (!match) return;
    setEditingId(match.id);
    setForm({
      question: match.question,
      answer: match.answer,
      difficulty: match.difficulty,
    });
    onPreselectConsumed?.();
  }, [flashcards, preselectCard, onPreselectConsumed]);

  async function handleDelete(cardId) {
    if (!window.confirm("Delete this flashcard?")) return;
    await ui.run(async () => {
      await authRequest(`/api/flashcards/${cardId}`, token, { method: "DELETE" });
      await reload();
      onChanged?.();
    }, "Flashcard deleted");
  }

  // Posting an exam result is what creates view_history rows for graded answers.
  async function markExamAnswer(card, wasCorrect) {
    await authRequest("/api/histories", token, {
      method: "POST",
      body: JSON.stringify({
        flashcard_id: card.id,
        notes: "Exam mode result",
        was_correct: wasCorrect,
      }),
    });
    onChanged?.();
  }

  return (
    <>
      <section className="card test-workspace-header">
        <div>
          <h2>{test.name}</h2>
          <p className="hint">Create questions and run practice/exam for this test.</p>
        </div>
        <button type="button" onClick={onBack}>Back to Test List</button>
      </section>

      <section className="panel-grid">
        <div className="card">
          <h2>{editingId ? `Edit ${test.name}` : `Create in ${test.name}`}</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Question
              <textarea
                value={form.question}
                onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                required
              />
            </label>
            <label>
              Answer
              <textarea
                value={form.answer}
                onChange={(e) => setForm((prev) => ({ ...prev, answer: e.target.value }))}
                required
              />
            </label>
            <label>
              Difficulty (1-5)
              <DifficultyPicker
                value={form.difficulty}
                onChange={(level) => setForm((prev) => ({ ...prev, difficulty: level }))}
                name="user-form"
              />
            </label>
            <div className="row">
              <button type="submit" disabled={ui.loading}>
                {editingId ? "Update" : "Create"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <h2>{test.name} Questions</h2>
          <input
            placeholder="Live search by question or answer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="list list-scroll">
            {flashcards.length === 0 && <p>No flashcards found.</p>}
            {flashcards.map((card) => (
              <article key={card.id} className="list-item">
                <h3>{card.question}</h3>
                <p>{card.answer}</p>
                <p className="meta">
                  Difficulty {card.difficulty} | Owner: {card.owner_username || card.user_id}
                </p>
                <div className="row">
                  <button type="button" onClick={() => startEdit(card)}>Edit</button>
                  <button type="button" onClick={() => handleDelete(card.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <StudyPanel
          panelTitle="Practice and Exam"
          sourceCards={flashcards}
          onMarkAnswer={markExamAnswer}
        />
      </section>
    </>
  );
}

export default TestWorkspace;
