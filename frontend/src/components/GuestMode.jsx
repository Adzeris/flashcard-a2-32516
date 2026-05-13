import { useEffect, useState, useRef } from "react";
import DifficultyPicker from "./DifficultyPicker";
import StudyPanel from "./StudyPanel";
import { apiRequest } from "../api";
import { writeGuestTokenToUrl } from "../utils/url";
import { formatDate } from "../utils/format";

const emptyForm = { question: "", answer: "", difficulty: 1 };

function scrollDeckListToBottom(el) {
  if (!el) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  });
}

// Whole guest experience: a temporary shared deck that anyone with the
// ?guest=<token> link can edit until the session expires. No saved history.
function GuestMode({ token, session, setSession, onLeave, ui }) {
  const cards = session?.flashcards || [];
  const shareUrl = `${window.location.origin}${window.location.pathname}?guest=${token}`;
  const deckListRef = useRef(null);
  const pendingScrollBottomRef = useRef(false);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");

  useEffect(() => {
    writeGuestTokenToUrl(token);
  }, [token]);

  useEffect(() => {
    if (!pendingScrollBottomRef.current) return;
    pendingScrollBottomRef.current = false;
    scrollDeckListToBottom(deckListRef.current);
  }, [cards]);

  // Single PUT replaces the entire flashcards JSON for this session - keeps
  // the backend dumb and avoids per-card endpoints just for guest mode.
  async function saveCards(nextCards, successMessage = "") {
    await ui.run(async () => {
      const updated = await apiRequest(`/api/guest/sessions/${token}`, {
        method: "PUT",
        body: JSON.stringify({
          title: session?.title || "Guest Session",
          flashcards: nextCards,
        }),
      });
      setSession(updated);
    }, successMessage);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const isCreate = !editingId;
    const payload = {
      id: editingId || crypto.randomUUID(),
      question: form.question.trim(),
      answer: form.answer.trim(),
      difficulty: Number(form.difficulty),
    };
    const nextCards = editingId
      ? cards.map((card) => (card.id === editingId ? payload : card))
      : [...cards, payload];

    await saveCards(nextCards, editingId ? "Guest card updated" : "Guest card created");
    setForm(emptyForm);
    setEditingId("");
    if (isCreate) {
      pendingScrollBottomRef.current = true;
    }
  }

  function startEdit(card) {
    setEditingId(card.id);
    setForm({
      question: card.question,
      answer: card.answer,
      difficulty: card.difficulty,
    });
  }

  async function handleDelete(cardId) {
    if (!window.confirm("Delete this guest flashcard?")) return;
    await saveCards(cards.filter((card) => card.id !== cardId), "Guest card deleted");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      ui.setSuccess("Guest link copied");
      ui.setError("");
    } catch (_error) {
      ui.setError("Unable to copy link automatically. Copy it manually.");
      ui.setSuccess("");
    }
  }

  return (
    <div className="page guest-layout">
      <header className="app-header">
        <div>
          <h1>Guest Study Session</h1>
          <p>
            Temporary mode. No saved account history. Expires at{" "}
            <strong>{formatDate(session?.expires_at)}</strong>.
          </p>
        </div>
        <div className="row">
          <button type="button" onClick={handleCopy}>Copy Share Link</button>
          <button type="button" onClick={onLeave}>Back to Login</button>
        </div>
      </header>

      <section className="card">
        <p className="hint">
          Share link: <code>{shareUrl}</code>
        </p>
      </section>

      {ui.error && <p className="error">{ui.error}</p>}
      {ui.success && <p className="success">{ui.success}</p>}

      <section className="card deck-workspace-study">
        <StudyPanel panelTitle="Guest Practice and Exam" sourceCards={cards} isGuestMode />
      </section>

      <section className="card deck-workspace-create">
        <h2>{editingId ? "Edit Guest Flashcard" : "Create Guest Flashcard"}</h2>
        <form onSubmit={handleSubmit} className="deck-create-form">
          <div className="deck-create-pair">
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
          </div>
          <label className="deck-create-difficulty">
            Difficulty (1-5)
            <DifficultyPicker
              value={form.difficulty}
              onChange={(level) => setForm((prev) => ({ ...prev, difficulty: level }))}
              name="guest-form"
            />
          </label>
          <div className="row deck-create-actions">
            <button type="submit" disabled={ui.loading}>
              {editingId ? "Update" : "Create"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId("");
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card deck-workspace-deck">
        <h2>Questions</h2>
        <div ref={deckListRef} className="list list-scroll deck-workspace-list">
          {cards.length === 0 && <p>No Cards Created ....... Yet</p>}
          {cards.map((card) => (
            <article key={card.id} className="list-item">
              <h3>{card.question}</h3>
              <p>{card.answer}</p>
              <p className="meta">Difficulty {card.difficulty}</p>
              <div className="row">
                <button type="button" onClick={() => startEdit(card)}>Edit</button>
                <button type="button" onClick={() => handleDelete(card.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default GuestMode;
