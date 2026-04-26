// Top bar (welcome + logout) and the tab nav. The actual tab content is
// rendered as children so this stays presentational.
function Layout({ user, tabs, activeTab, onTabChange, onLogout, error, success, children }) {
  return (
    <div className="page">
      <header className="app-header">
        <div>
          <h1>Flashcard Learning App v2</h1>
          <p>
            Logged in as <strong>{user.username}</strong> ({user.role})
          </p>
        </div>
        <button onClick={onLogout}>Logout</button>
      </header>

      <nav className="tab-row">
        {tabs.map((name) => (
          <button
            key={name}
            className={activeTab === name ? "active" : ""}
            onClick={() => onTabChange(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {children}
    </div>
  );
}

export default Layout;
