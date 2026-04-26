import { useCallback, useState } from "react";

// Wraps an async action with shared loading/error/success state so the
// individual views don't have to repeat the same try/catch/finally pattern.
export function useUiFeedback() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const run = useCallback(async (action, successMessage = "") => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await action();
      if (successMessage) setSuccess(successMessage);
    } catch (err) {
      setError(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  return { loading, error, success, run, reset, setError, setSuccess };
}
