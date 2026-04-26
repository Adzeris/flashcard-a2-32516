// Tiny formatting helpers shared across views.

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}
