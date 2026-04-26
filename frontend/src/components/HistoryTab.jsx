import { useEffect, useMemo, useState } from "react";
import { authRequest } from "../api";
import { formatDate } from "../utils/format";

// Per-test summary of the user's review history (attempts/correct/wrong).
// Built client-side from /api/histories so the backend stays simple - if this
// list ever gets huge we'd swap in a server-side aggregate endpoint.
function HistoryTab({ token, tests, ui }) {
  const [histories, setHistories] = useState([]);

  useEffect(() => {
    authRequest("/api/histories", token)
      .then(setHistories)
      .catch((err) => ui.setError(err.message || "Failed to load history"));
  }, [token, ui]);

  const summary = useMemo(() => {
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
      const bucket = grouped[testName];
      bucket.attempts += 1;
      if (item.was_correct === true) bucket.correct += 1;
      else if (item.was_correct === false) bucket.wrong += 1;
      if (
        bucket.latestViewedAt === null ||
        new Date(item.viewed_at).getTime() > new Date(bucket.latestViewedAt).getTime()
      ) {
        bucket.latestViewedAt = item.viewed_at;
      }
    }

    return Object.values(grouped).sort((a, b) => a.testName.localeCompare(b.testName));
  }, [histories, tests]);

  return (
    <section className="card">
      <h2>My Test History</h2>
      <p className="hint">Shows summary by test only.</p>
      <div className="list">
        {summary.length === 0 && <p>No history records yet.</p>}
        {summary.map((item) => {
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
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default HistoryTab;
