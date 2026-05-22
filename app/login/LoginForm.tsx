"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import PasswordField from "../components/PasswordField";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number>(0);
  const emailRef = useRef<HTMLInputElement>(null);

  // Auto-focus the email field on first render for keyboard users.
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Tick down the retry-after countdown after a 429.
  useEffect(() => {
    if (retryAfter <= 0) return;
    const t = setInterval(() => setRetryAfter((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [retryAfter]);

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !loading && retryAfter === 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.status === 429) {
        const retry = Number(res.headers.get("Retry-After")) || 30;
        setRetryAfter(retry);
        setError(
          `Too many attempts. Please wait before trying again.`,
        );
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't sign in. Please try again.");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card auth-card-enter">
        <div className="auth-header">
          <div className="auth-brand" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#1a73e8" />
              <path
                d="M7 23l5.5-7 4 5 4-6 4.5 8H7z"
                stroke="#ffffff"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle
                cx="11.5"
                cy="12"
                r="1.75"
                stroke="#ffffff"
                strokeWidth="1.75"
                fill="none"
              />
            </svg>
          </div>
          <div>
            <h1 className="auth-heading">Sign in</h1>
            <p className="auth-sub">to continue to Vista</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              Email
            </label>
            <input
              id="email"
              ref={emailRef}
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              required
              disabled={loading}
            />
          </div>

          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
            disabled={loading}
          />

          {error && (
            <div className="auth-error" role="alert">
              <span>{error}</span>
              {retryAfter > 0 && (
                <span className="auth-error-meta"> ({retryAfter}s)</span>
              )}
            </div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={!canSubmit}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="auth-spinner" aria-hidden="true" />
                <span>Signing in…</span>
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link href="/register">Create one</Link>
        </p>
      </div>
    </main>
  );
}
