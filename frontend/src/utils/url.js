// Read/write the ?guest=<token> query param without reloading the page.
// We use replaceState so the SPA stays on the same history entry.

export function readGuestTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("guest") || "";
}

export function writeGuestTokenToUrl(token) {
  const url = new URL(window.location.href);
  if (token) {
    url.searchParams.set("guest", token);
  } else {
    url.searchParams.delete("guest");
  }
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}
