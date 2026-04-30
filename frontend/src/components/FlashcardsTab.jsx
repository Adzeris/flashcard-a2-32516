import { useEffect, useState } from "react";
import TestList from "./TestList";
import TestWorkspace from "./TestWorkspace";
import { authRequest } from "../api";

// Wrapper that owns the tests collection and which test (if any) is open.
// Splits cleanly between "list view" and "workspace view".
function FlashcardsTab({ token, ui, onTestsChanged }) {
  const [tests, setTests] = useState([]);
  const [openTestId, setOpenTestId] = useState(null);
  const [preselectCard, setPreselectCard] = useState(null);

  async function loadTests(keepOpen = true) {
    const list = await authRequest("/api/tests", token);
    setTests(list);
    if (!keepOpen || (openTestId && !list.some((t) => t.id === openTestId))) {
      setOpenTestId(null);
    }
    onTestsChanged?.(list);
  }

  useEffect(() => {
    loadTests(true).catch((err) => ui.setError(err.message || "Failed to load tests"));
    // We only want this on mount + token change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreate(name) {
    await ui.run(async () => {
      const created = await authRequest("/api/tests", token, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await loadTests(true);
      setOpenTestId(created.id);
    }, "Test created");
  }

  async function handleRename(testId, name) {
    await ui.run(async () => {
      await authRequest(`/api/tests/${testId}`, token, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      await loadTests(true);
    }, "Test renamed");
  }

  async function handleDelete(testId, testName) {
    if (!window.confirm(`Delete ${testName}? This will remove its flashcards and related history.`)) {
      return;
    }
    await ui.run(async () => {
      await authRequest(`/api/tests/${testId}`, token, { method: "DELETE" });
      await loadTests(false);
    }, "Test deleted");
  }

  const openTest = tests.find((t) => t.id === openTestId) || null;

  if (openTest) {
    return (
      <TestWorkspace
        token={token}
        test={openTest}
        ui={ui}
        preselectCard={preselectCard}
        onPreselectConsumed={() => setPreselectCard(null)}
        onBack={() => {
          setPreselectCard(null);
          setOpenTestId(null);
          loadTests(true).catch((err) =>
            ui.setError(err.message || "Failed to reload tests")
          );
        }}
        onChanged={() => loadTests(true)}
      />
    );
  }

  return (
    <TestList
      tests={tests}
      token={token}
      loading={ui.loading}
      onCreate={handleCreate}
      onOpen={(id) => {
        setPreselectCard(null);
        setOpenTestId(id);
      }}
      onOpenAndEdit={(testId, card) => {
        setOpenTestId(testId);
        setPreselectCard(card);
      }}
      onRename={handleRename}
      onDelete={handleDelete}
    />
  );
}

export default FlashcardsTab;
