import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest, authRequest, loginRequest } from "./api";

const initialFlashcardForm = {
  question: "",
  answer: "",
  difficulty: 1,
};

const initialGuestFlashcardForm = {
  question: "",
  answer: "",
  difficulty: 1,
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function readGuestTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("guest") || "";
}

function writeGuestTokenToUrl(token) {
  const url = new URL(window.location.href);
  if (token) {
    url.searchParams.set("guest", token);
  } else {
    url.searchParams.delete("guest");
  }
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

function shuffleCards(cards) {
  const list = [...cards];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function DifficultyPicker({ value, onChange, disabled = false, name = "difficulty" }) {
  return (
    <div className={`difficulty-picker ${disabled ? "is-disabled" : ""}`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={`${name}-${level}`}
          type="button"
          className={`difficulty-chip ${Number(value) === level ? "active" : ""}`}
          onClick={() => onChange(level)}
          disabled={disabled}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

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
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [isTestWorkspaceOpen, setIsTestWorkspaceOpen] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [editingTestId, setEditingTestId] = useState(null);
  const [editingTestName, setEditingTestName] = useState("");

  const [histories, setHistories] = useState([]);

  const [profileForm, setProfileForm] = useState({ username: "", email: "", password: "" });

  const [users, setUsers] = useState([]);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState("");
  const [selectedUserHistory, setSelectedUserHistory] = useState([]);

  const [guestToken, setGuestToken] = useState(() => readGuestTokenFromUrl());
  const [guestSession, setGuestSession] = useState(null);
  const [guestFlashcardForm, setGuestFlashcardForm] = useState(initialGuestFlashcardForm);
  const [guestEditingId, setGuestEditingId] = useState("");

  const isAdmin = user?.role === "admin";
  const isGuestMode = Boolean(guestToken && guestSession);

  const availableTabs = useMemo(() => {
    const baseTabs = ["flashcards", "history", "profile"];
    if (isAdmin) baseTabs.push("admin");
    return baseTabs;
  }, [isAdmin]);

  const guestShareUrl = guestToken
    ? `${window.location.origin}${window.location.pathname}?guest=${guestToken}`
    : "";
  const guestCards = guestSession?.flashcards || [];
  const selectedTest = tests.find((item) => item.id === selectedTestId) || null;
  const selectedTestName = selectedTest?.name || "";
  const historyByTest = useMemo(() => {
    const grouped = {};
    const testNames = new Set(tests.map((test) => test.name));

    for (const test of tests) {
      grouped[test.name] = {
        testName: test.name,
        attempts: 0,
        correct: 0,
        wrong: 0,
        latestViewedAt: null,
      };
    }

    for (const item of histories) {
      const testName = item.flashcard_test || "Unassigned Test";
      if (!testNames.has(testName)) continue;

      grouped[testName].attempts += 1;
      if (item.was_correct === true) grouped[testName].correct += 1;
      else if (item.was_correct === false) grouped[testName].wrong += 1;

      if (
        grouped[testName].latestViewedAt === null ||
        new Date(item.viewed_at).getTime() >
          new Date(grouped[testName].latestViewedAt).getTime()
      ) {
        grouped[testName].latestViewedAt = item.viewed_at;
      }
    }

    return Object.values(grouped).sort((a, b) => a.testName.localeCompare(b.testName));
  }, [histories, tests]);

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
    if (token || !guestToken) return;
    loadGuestSessionByToken(guestToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestToken, token]);

  useEffect(() => {
    if (!token || !user) return;
    const timer = setTimeout(() => {
      loadFlashcards(search);
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedTestName, token, user]);

  useEffect(() => {
    if (!token || !user) return;
    loadTests();
    loadHistories();
    if (isAdmin) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, isAdmin]);

  useEffect(() => {
    setEditingFlashcardId(null);
    setFlashcardForm(initialFlashcardForm);
  }, [selectedTestId]);

  useEffect(() => {
    if (!selectedTestId) {
      setIsTestWorkspaceOpen(false);
    }
  }, [selectedTestId]);

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

  async function loadGuestSessionByToken(tokenValue) {
    await withUiFeedback(async () => {
      const session = await apiRequest(`/api/guest/sessions/${tokenValue}`);
      setGuestToken(session.token);
      setGuestSession(session);
      writeGuestTokenToUrl(session.token);
    });
  }

  function leaveGuestMode() {
    setGuestToken("");
    setGuestSession(null);
    setGuestFlashcardForm(initialGuestFlashcardForm);
    setGuestEditingId("");
    writeGuestTokenToUrl("");
  }

  async function enterNewGuestMode() {
    await withUiFeedback(async () => {
      const session = await apiRequest("/api/guest/sessions", {
        method: "POST",
        body: JSON.stringify({
          title: "Guest Session",
          expires_in_hours: 12,
        }),
      });
      setGuestToken(session.token);
      setGuestSession(session);
      setGuestFlashcardForm(initialGuestFlashcardForm);
      setGuestEditingId("");
      writeGuestTokenToUrl(session.token);
    }, "Guest session created. Share the link to collaborate.");
  }

  async function saveGuestCards(nextCards, successMessage = "") {
    await withUiFeedback(async () => {
      const session = await apiRequest(`/api/guest/sessions/${guestToken}`, {
        method: "PUT",
        body: JSON.stringify({
          title: guestSession?.title || "Guest Session",
          flashcards: nextCards,
        }),
      });
      setGuestSession(session);
    }, successMessage);
  }

  async function handleGuestFlashcardSubmit(event) {
    event.preventDefault();
    if (!guestToken) return;

    const cardPayload = {
      id: guestEditingId || crypto.randomUUID(),
      question: guestFlashcardForm.question.trim(),
      answer: guestFlashcardForm.answer.trim(),
      difficulty: Number(guestFlashcardForm.difficulty),
    };

    const nextCards = guestEditingId
      ? guestCards.map((card) => (card.id === guestEditingId ? cardPayload : card))
      : [...guestCards, cardPayload];

    await saveGuestCards(nextCards, guestEditingId ? "Guest card updated" : "Guest card created");
    setGuestFlashcardForm(initialGuestFlashcardForm);
    setGuestEditingId("");
  }

  function handleGuestEdit(card) {
    setGuestEditingId(card.id);
    setGuestFlashcardForm({
      question: card.question,
      answer: card.answer,
      difficulty: card.difficulty,
    });
  }

  async function handleGuestDelete(cardId) {
    if (!window.confirm("Delete this guest flashcard?")) return;
    const nextCards = guestCards.filter((card) => card.id !== cardId);
    await saveGuestCards(nextCards, "Guest card deleted");
  }

  async function handleCopyGuestLink() {
    try {
      await navigator.clipboard.writeText(guestShareUrl);
      setSuccess("Guest link copied");
      setGlobalError("");
    } catch (_error) {
      setGlobalError("Unable to copy link automatically. Copy it manually.");
      setSuccess("");
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (authMode === "login") {
      await withUiFeedback(async () => {
        const payload = await loginRequest(authForm.username.trim(), authForm.password);
        leaveGuestMode();
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
      leaveGuestMode();
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
    setTests([]);
    setSelectedTestId(null);
    setIsTestWorkspaceOpen(false);
    setNewTestName("");
    setEditingTestId(null);
    setEditingTestName("");
    setGlobalError("");
    setSuccess("");
  }

  async function loadFlashcards(searchTerm = "") {
    if (!selectedTestName) {
      setFlashcards([]);
      return;
    }
    const params = new URLSearchParams();
    params.set("test", selectedTestName);
    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }
    const query = `/api/flashcards?${params.toString()}`;
    const list = await authRequest(query, token);
    setFlashcards(list);
  }

  async function loadTests(keepSelection = true) {
    const list = await authRequest("/api/tests", token);
    setTests(list);
    setSelectedTestId((current) => {
      if (keepSelection && current && list.some((item) => item.id === current)) {
        return current;
      }
      return list.length > 0 ? list[0].id : null;
    });
    if (list.length === 0) {
      setIsTestWorkspaceOpen(false);
    }
  }

  async function loadHistories() {
    const list = await authRequest("/api/histories", token);
    setHistories(list);
  }

  async function loadUsers() {
    const list = await authRequest("/api/users", token);
    setUsers(list);
  }

  async function handleCreateTest(event) {
    event.preventDefault();
    const name = newTestName.trim();
    if (!name) return;

    await withUiFeedback(async () => {
      const created = await authRequest("/api/tests", token, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await loadTests(false);
      setSelectedTestId(created.id);
      setIsTestWorkspaceOpen(false);
      setNewTestName("");
    }, "Test created");
  }

  function openTestWorkspace(testId) {
    setSelectedTestId(testId);
    setIsTestWorkspaceOpen(true);
  }

  async function renameTest(testId, name) {
    await authRequest(`/api/tests/${testId}`, token, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  async function handleSaveTestRename(testId) {
    const name = editingTestName.trim();
    if (!name) return;
    await withUiFeedback(async () => {
      await renameTest(testId, name);
      await loadTests(true);
      await loadHistories();
      setEditingTestId(null);
      setEditingTestName("");
    }, "Test renamed");
  }

  async function handleDeleteTest(testId, testName) {
    if (!window.confirm(`Delete ${testName}? This will remove its flashcards and related history.`)) {
      return;
    }
    await withUiFeedback(async () => {
      await authRequest(`/api/tests/${testId}`, token, { method: "DELETE" });
      await loadTests(false);
      await loadHistories();
    }, "Test deleted");
  }

  async function handleRenameFromHistory(testName) {
    const matched = tests.find((item) => item.name === testName);
    if (!matched) return;
    const nextName = window.prompt("Rename test", matched.name);
    if (!nextName) return;
    await withUiFeedback(async () => {
      await renameTest(matched.id, nextName.trim());
      await loadTests(true);
      await loadHistories();
    }, "Test renamed");
  }

  async function handleFlashcardSubmit(event) {
    event.preventDefault();
    if (!selectedTestName) {
      setGlobalError("Create or select a test first.");
      return;
    }
    await withUiFeedback(async () => {
      if (editingFlashcardId) {
        await authRequest(`/api/flashcards/${editingFlashcardId}`, token, {
          method: "PUT",
          body: JSON.stringify({
            question: flashcardForm.question.trim(),
            answer: flashcardForm.answer.trim(),
            category: selectedTestName,
            difficulty: Number(flashcardForm.difficulty),
          }),
        });
      } else {
        await authRequest("/api/flashcards", token, {
          method: "POST",
          body: JSON.stringify({
            question: flashcardForm.question.trim(),
            answer: flashcardForm.answer.trim(),
            category: selectedTestName,
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
    if (card.category && card.category !== selectedTestName) {
      const matched = tests.find((item) => item.name === card.category);
      if (matched) {
        setSelectedTestId(matched.id);
      }
    }
    setEditingFlashcardId(card.id);
    setFlashcardForm({
      question: card.question,
      answer: card.answer,
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

  async function handleChangeRole(targetUser) {
    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    const successMessage =
      nextRole === "admin"
        ? `${targetUser.username} turned into admin`
        : `${targetUser.username} changed back to user`;

    await withUiFeedback(async () => {
      await authRequest(`/api/users/${targetUser.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ role: nextRole }),
      });
      await loadUsers();
    }, successMessage);
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

  async function markExamAnswerForUser(card, wasCorrect) {
    await authRequest("/api/histories", token, {
      method: "POST",
      body: JSON.stringify({
        flashcard_id: card.id,
        notes: "Exam mode result",
        was_correct: wasCorrect,
      }),
    });
    await loadHistories();
  }

  if (isGuestMode && !token) {
    return (
      <div className="page">
        <header className="app-header">
          <div>
            <h1>Guest Study Session</h1>
            <p>
              Temporary mode. No saved user history, no admin access. Expires at{" "}
              <strong>{formatDate(guestSession.expires_at)}</strong>.
            </p>
          </div>
          <div className="row">
            <button type="button" onClick={handleCopyGuestLink}>
              Copy Share Link
            </button>
            <button type="button" onClick={leaveGuestMode}>
              Back to Login
            </button>
          </div>
        </header>

        <section className="card">
          <p className="hint">
            Share link: <code>{guestShareUrl}</code>
          </p>
        </section>

        {globalError && <p className="error">{globalError}</p>}
        {success && <p className="success">{success}</p>}

        <section className="panel-grid">
          <div className="card">
            <h2>{guestEditingId ? "Edit Guest Flashcard" : "Create Guest Flashcard"}</h2>
            <form onSubmit={handleGuestFlashcardSubmit} className="form-grid">
              <label>
                Question
                <textarea
                  value={guestFlashcardForm.question}
                  onChange={(e) =>
                    setGuestFlashcardForm((prev) => ({ ...prev, question: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Answer
                <textarea
                  value={guestFlashcardForm.answer}
                  onChange={(e) =>
                    setGuestFlashcardForm((prev) => ({ ...prev, answer: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Difficulty (1-5)
                <DifficultyPicker
                  value={guestFlashcardForm.difficulty}
                  onChange={(level) =>
                    setGuestFlashcardForm((prev) => ({
                      ...prev,
                      difficulty: level,
                    }))
                  }
                  name="guest-form"
                />
              </label>
              <div className="row">
                <button type="submit" disabled={loading}>
                  {guestEditingId ? "Update" : "Create"}
                </button>
                {guestEditingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setGuestEditingId("");
                      setGuestFlashcardForm(initialGuestFlashcardForm);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="card">
            <h2>Guest Flashcards</h2>
            <div className="list">
              {guestCards.length === 0 && <p>No guest cards yet.</p>}
              {guestCards.map((card) => (
                <article key={card.id} className="list-item">
                  <h3>{card.question}</h3>
                  <p>{card.answer}</p>
                  <p className="meta">Difficulty {card.difficulty}</p>
                  <div className="row">
                    <button type="button" onClick={() => handleGuestEdit(card)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleGuestDelete(card.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <StudyPanel panelTitle="Guest Practice and Exam" sourceCards={guestCards} isGuestMode />
        </section>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="page page-auth">
        <div className="card auth-card">
          <h1>Flashcard Learning App v2</h1>

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
            <button type="button" onClick={enterNewGuestMode}>
              Continue as Guest
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
        <>
          {!isTestWorkspaceOpen && (
            <section className="card">
              <h2>Flashcards</h2>
              <form onSubmit={handleCreateTest} className="test-form-row">
                <input
                  placeholder="New test name"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                />
                <button type="submit" disabled={loading}>
                  Add Test
                </button>
              </form>

              <div className="list">
                {tests.length === 0 && (
                  <p className="hint">No tests yet. Add one to start creating flashcards.</p>
                )}
                {tests.map((testItem) => (
                  <article key={testItem.id} className="list-item">
                    {editingTestId === testItem.id ? (
                      <div className="form-grid">
                        <input
                          value={editingTestName}
                          onChange={(e) => setEditingTestName(e.target.value)}
                          placeholder="Test name"
                        />
                        <div className="row">
                          <button type="button" onClick={() => handleSaveTestRename(testItem.id)}>
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTestId(null);
                              setEditingTestName("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3>{testItem.name}</h3>
                        <p className="meta">{testItem.flashcard_count} flashcards</p>
                        <div className="row">
                          <button
                            type="button"
                            className={`test-chip ${selectedTestId === testItem.id ? "active" : ""}`}
                            onClick={() => openTestWorkspace(testItem.id)}
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTestId(testItem.id);
                              setEditingTestName(testItem.name);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTest(testItem.id, testItem.name)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {isTestWorkspaceOpen && selectedTestName && (
            <>
              <section className="card test-workspace-header">
                <div>
                  <h2>{selectedTestName}</h2>
                  <p className="hint">Create questions and run practice/exam for this test.</p>
                </div>
                <button type="button" onClick={() => setIsTestWorkspaceOpen(false)}>
                  Back to Test List
                </button>
              </section>

              <section className="panel-grid">
                <div className="card">
                  <h2>
                    {editingFlashcardId
                      ? `Edit ${selectedTestName}`
                      : `Create in ${selectedTestName}`}
                  </h2>
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
                      Difficulty (1-5)
                      <DifficultyPicker
                        value={flashcardForm.difficulty}
                        onChange={(level) =>
                          setFlashcardForm((prev) => ({
                            ...prev,
                            difficulty: level,
                          }))
                        }
                        name="user-form"
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
                  <h2>{selectedTestName} Questions</h2>
                  <input
                    placeholder="Live search by question or answer..."
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
                          Difficulty {card.difficulty} | Owner: {card.owner_username || card.user_id}
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

              <section className="card">
                <StudyPanel
                  panelTitle="Practice and Exam"
                  sourceCards={flashcards}
                  onMarkAnswer={markExamAnswerForUser}
                />
              </section>
            </>
          )}
        </>
      )}

      {tab === "history" && (
        <section className="card">
          <h2>My Test History</h2>
          <p className="hint">Shows summary by test only.</p>
          <div className="list">
            {historyByTest.length === 0 && <p>No history records yet.</p>}
            {historyByTest.map((item) => {
              const graded = item.correct + item.wrong;
              const accuracy = graded > 0 ? Math.round((item.correct / graded) * 100) : null;

              return (
                <article key={item.testName} className="list-item">
                  <h3>{item.testName}</h3>
                  <p className="meta">
                    Attempts: {item.attempts} | Latest: {formatDate(item.latestViewedAt)}
                  </p>
                  <p className="meta">
                    Correct: {item.correct} | Wrong: {item.wrong}
                  </p>
                  <p className="meta">
                    Accuracy: {accuracy === null ? "No graded answers yet" : `${accuracy}%`}
                  </p>
                  {tests.some((testItem) => testItem.name === item.testName) && (
                    <div className="row">
                      <button type="button" onClick={() => handleRenameFromHistory(item.testName)}>
                        Rename Test
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const matched = tests.find((t) => t.name === item.testName);
                          if (matched) {
                            handleDeleteTest(matched.id, matched.name);
                          }
                        }}
                      >
                        Delete Test
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
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
                      onClick={() => handleChangeRole(item)}
                    >
                      {item.role === "admin" ? "Change to User" : "Change to Admin"}
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
      )}
    </div>
  );
}

export default App;
