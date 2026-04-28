import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";
import { useAuth } from "./hooks/useAuth";
import { useUiFeedback } from "./hooks/useUiFeedback";
import { readGuestTokenFromUrl, writeGuestTokenToUrl } from "./utils/url";
import AuthScreen from "./components/AuthScreen";
import GuestMode from "./components/GuestMode";
import Layout from "./components/Layout";
import FlashcardsTab from "./components/FlashcardsTab";
import HistoryTab from "./components/HistoryTab";
import ProfileTab from "./components/ProfileTab";
import AdminTab from "./components/AdminTab";

// Top-level shell: decides whether to show auth, guest mode, or the
// logged-in app, then routes the active tab to the matching component.
function App() {
  const auth = useAuth();
  const ui = useUiFeedback();

  const [tab, setTab] = useState("flashcards");
  const [tests, setTests] = useState([]);

  const [guestToken, setGuestToken] = useState(() => readGuestTokenFromUrl());
  const [guestSession, setGuestSession] = useState(null);

  const isGuestMode = Boolean(guestToken && guestSession && !auth.token);

  const tabs = useMemo(() => {
    const list = ["flashcards", "history", "profile"];
    if (auth.isAdmin) list.push("admin");
    return list;
  }, [auth.isAdmin]);

  // Resolve the guest token from the URL on first load (e.g. someone opened
  // a shared link). We skip if the user is already logged in.
  useEffect(() => {
    if (auth.token || !guestToken || guestSession) return;
    ui.run(async () => {
      const session = await apiRequest(`/api/guest/sessions/${guestToken}`);
      setGuestSession(session);
      setGuestToken(session.token);
    });
  }, [auth.token, guestToken, guestSession, ui]);

  function leaveGuest() {
    setGuestToken("");
    setGuestSession(null);
    writeGuestTokenToUrl("");
    ui.reset();
  }

  async function startGuestSession() {
    await ui.run(async () => {
      const session = await apiRequest("/api/guest/sessions", {
        method: "POST",
        body: JSON.stringify({ title: "Guest Session", expires_in_hours: 12 }),
      });
      setGuestSession(session);
      setGuestToken(session.token);
    });
  }

  async function handleLogin(username, password) {
    await ui.run(async () => {
      leaveGuest();
      await auth.login(username, password);
    }, "Logged in successfully");
  }

  async function handleRegister(username, email, password) {
    await ui.run(async () => {
      leaveGuest();
      await auth.register(username, email, password);
    }, "Account created and logged in");
  }

  function handleLogout() {
    auth.logout();
    setTests([]);
    setTab("flashcards");
    ui.reset();
  }

  if (isGuestMode) {
    return (
      <GuestMode
        token={guestToken}
        session={guestSession}
        setSession={setGuestSession}
        onLeave={leaveGuest}
        ui={ui}
      />
    );
  }

  if (!auth.token || !auth.user) {
    return (
      <AuthScreen
        loading={ui.loading || auth.checking}
        error={ui.error || auth.authError}
        success={ui.success}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onGuest={startGuestSession}
      />
    );
  }

  return (
    <Layout
      user={auth.user}
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      onLogout={handleLogout}
      error={ui.error}
      success={ui.success}
    >
      {tab === "flashcards" && (
        <FlashcardsTab token={auth.token} ui={ui} onTestsChanged={setTests} />
      )}
      {tab === "history" && <HistoryTab token={auth.token} tests={tests} ui={ui} />}
      {tab === "profile" && (
        <ProfileTab
          token={auth.token}
          user={auth.user}
          ui={ui}
          onSaved={auth.refreshUser}
        />
      )}
      {tab === "admin" && auth.isAdmin && (
        <AdminTab token={auth.token} currentUser={auth.user} ui={ui} />
      )}
    </Layout>
  );
}

export default App;
