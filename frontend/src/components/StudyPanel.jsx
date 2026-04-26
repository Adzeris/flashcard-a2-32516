import { useState } from "react";
import { createPortal } from "react-dom";
import DifficultyPicker from "./DifficultyPicker";
import { shuffleCards } from "../utils/array";

// Practice/Exam runner. Reused for both the logged-in and the guest views,
// which is why grading goes through an injected onMarkAnswer callback - guest
// mode just doesn't pass one and exam results stay client-side.
function StudyPanel({ panelTitle, sourceCards, onMarkAnswer, isGuestMode = false }) {
  const [mode, setMode] = useState("practice");
  const [maxDifficulty, setMaxDifficulty] = useState(5);
  const [shuffle, setShuffle] = useState(false);
  const [active, setActive] = useState(false);
  const [studyCards, setStudyCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [examAnswered, setExamAnswered] = useState(0);
  const [examCorrect, setExamCorrect] = useState(0);
  const [grading, setGrading] = useState(false);
  const [studyError, setStudyError] = useState("");

  const currentCard = studyCards[index] || null;
  const filteredCount = sourceCards.filter(
    (card) => Number(card.difficulty) <= Number(maxDifficulty)
  ).length;

  function startSession() {
    const filtered = sourceCards.filter(
      (card) => Number(card.difficulty) <= Number(maxDifficulty)
    );
    if (filtered.length === 0) {
      setStudyError("No flashcards match this difficulty range.");
      return;
    }

    const nextCards = shuffle ? shuffleCards(filtered) : filtered;
    setStudyCards(nextCards);
    setActive(true);
    setCompleted(false);
    setIndex(0);
    setRevealed(false);
    setExamAnswered(0);
    setExamCorrect(0);
    setStudyError("");
  }

  function nextPractice() {
    if (!active) return;
    if (index >= studyCards.length - 1) {
      setActive(false);
      setCompleted(true);
      setRevealed(false);
      return;
    }
    setIndex((prev) => prev + 1);
    setRevealed(false);
  }

  function previousPractice() {
    if (!active) return;
    setIndex((prev) => Math.max(prev - 1, 0));
    setRevealed(false);
  }

  async function handleExamResult(wasCorrect) {
    if (!active || mode !== "exam" || !currentCard) return;
    setGrading(true);
    try {
      if (onMarkAnswer) {
        await onMarkAnswer(currentCard, wasCorrect);
      }
      const answered = examAnswered + 1;
      const correct = examCorrect + (wasCorrect ? 1 : 0);
      setExamAnswered(answered);
      setExamCorrect(correct);

      if (index >= studyCards.length - 1) {
        setActive(false);
        setCompleted(true);
        setRevealed(false);
      } else {
        setIndex((prev) => prev + 1);
        setRevealed(false);
      }
    } catch (_error) {
      setStudyError("Unable to record this result right now.");
    } finally {
      setGrading(false);
    }
  }

  function closeSession() {
    setActive(false);
    setRevealed(false);
  }

  // Modal is portaled to document.body so it can sit on top of any page
  // without being clipped by parent overflow rules.
  const studyModal =
    active &&
    currentCard &&
    typeof document !== "undefined" &&
    createPortal(
      <div className="study-overlay" role="dialog" aria-modal="true">
        <div className="study-modal">
          <div className="study-modal-header">
            <h3>
              {mode === "exam" ? "Exam Session" : "Practice Session"}
              {isGuestMode ? " - Guest Mode" : ""}
            </h3>
            <button type="button" onClick={closeSession}>
              Close
            </button>
          </div>

          <p className="study-info">
            <span>
              Card {index + 1} / {studyCards.length}
            </span>
            <span className="study-difficulty">Difficulty {currentCard.difficulty}</span>
          </p>
          <button type="button" className="study-card" onClick={() => setRevealed((prev) => !prev)}>
            <span className="study-label">
              {revealed ? "Answer" : "Question"} (click to flip)
            </span>
            <span className="study-text">
              {revealed ? currentCard.answer : currentCard.question}
            </span>
          </button>

          {mode === "practice" && (
            <div className="row">
              <button type="button" onClick={previousPractice} disabled={index === 0}>
                Previous
              </button>
              <button type="button" onClick={nextPractice}>
                {index >= studyCards.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          )}

          {mode === "exam" && (
            <div className="exam-grade-actions">
              {!revealed && <p className="exam-grade-prompt">Reveal answer first, then grade it.</p>}
              {revealed && (
                <div className="row exam-grade-buttons">
                  <button
                    type="button"
                    className="exam-result-btn right"
                    onClick={() => handleExamResult(true)}
                    disabled={grading}
                  >
                    Right
                  </button>
                  <button
                    type="button"
                    className="exam-result-btn wrong"
                    onClick={() => handleExamResult(false)}
                    disabled={grading}
                  >
                    Wrong
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <h2>{panelTitle}</h2>
      <div className="study-controls">
        <label className="study-field">
          Difficulty up to
          <DifficultyPicker
            value={maxDifficulty}
            onChange={setMaxDifficulty}
            disabled={active}
            name={`${panelTitle}-max`}
          />
        </label>

        <div className={`study-mode-group ${active ? "is-disabled" : ""}`}>
          <span className="study-mode-heading">Mode</span>
          <label className="study-mode-option">
            <input
              type="radio"
              name={`${panelTitle}-study-mode`}
              checked={mode === "practice"}
              onChange={() => setMode("practice")}
              disabled={active}
            />
            Practice
          </label>
          <label className="study-mode-option">
            <input
              type="radio"
              name={`${panelTitle}-study-mode`}
              checked={mode === "exam"}
              onChange={() => setMode("exam")}
              disabled={active}
            />
            Exam
          </label>
        </div>

        <label className={`shuffle-option ${active ? "is-disabled" : ""}`}>
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
            disabled={active}
          />
          <span className="shuffle-option-text">Shuffle when starting</span>
        </label>

        <button type="button" className="btn-study-start" onClick={startSession}>
          {active ? "Restart Session" : "Start Session"}
        </button>
      </div>

      <p className="hint">{filteredCount} cards available for this difficulty range.</p>
      {studyError && <p className="error">{studyError}</p>}

      {studyModal}

      {completed && mode === "practice" && (
        <p className="success">Practice session complete. You can start another session anytime.</p>
      )}

      {completed && mode === "exam" && examAnswered > 0 && (
        <div className="exam-summary">
          <p className="exam-summary-score">{Math.round((examCorrect / examAnswered) * 100)}%</p>
          <p className="exam-summary-detail">
            {examCorrect} correct out of {examAnswered} answers.
          </p>
        </div>
      )}
    </>
  );
}

export default StudyPanel;
