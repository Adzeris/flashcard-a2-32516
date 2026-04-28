import { useCallback, useEffect, useRef, useState } from "react";

// Success banners auto-hide so they don’t sit on screen forever (2–5s range).
const SUCCESS_CLEAR_MS = 4000;

// Wraps an async action with shared loading/error/success state so the
// individual views don’t have to repeat the same try/catch/finally pattern.
export function useUiFeedback() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const successTimerRef = useRef(null);

  useEffect(() => {
    if (!success) return undefined;
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setSuccess("");
      successTimerRef.current = null;
    }, SUCCESS_CLEAR_MS);
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, [success]);

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
