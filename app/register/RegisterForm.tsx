"use client";

import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import PasswordField from "../components/PasswordField";

type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string };

function scorePassword(pw: string): Strength {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.max(0, Math.min(4, score)) as Strength["score"];
  const label = ["Too short", "Weak", "Fair", "Good", "Strong"][clamped];
  return { score: clamped, label };
}

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number>(0);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const t = setInterval(() => setRetryAfter((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [retryAfter]);

  const strength = useMemo(() => scorePassword(password), [password]);
  const passwordTooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 8 &&
    confirm === password &&
    !loading &&
    retryAfter === 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.status === 429) {
        const retry = Number(res.headers.get("Retry-After")) || 60;
        setRetryAfter(retry);
        setError("Too many attempts. Please wait before trying again.");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
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
            <h1 className="auth-heading">Create account</h1>
            <p className="auth-sub">Use Vista to host your images</p>
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

          <div>
            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
              disabled={loading}
              describedBy="password-strength"
              hint={passwordTooShort ? "Use at least 8 characters." : undefined}
            />
            {password.length > 0 && (
              <div
                id="password-strength"
                className="auth-strength"
                aria-live="polite"
              >
                <div
                  className="auth-strength-bar"
                  data-score={strength.score}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={4}
                  aria-valuenow={strength.score}
                  aria-label={`Password strength: ${strength.label}`}
                >
                  <span style={{ width: `${(strength.score / 4) * 100}%` }} />
                </div>
                <span className="auth-strength-label">{strength.label}</span>
              </div>
            )}
          </div>

          <PasswordField
            id="confirm"
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            required
            disabled={loading}
            hint={mismatch ? "Passwords do not match." : undefined}
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
                <span>Creating account…</span>
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
