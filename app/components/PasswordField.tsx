"use client";

import { useId, useState, KeyboardEvent } from "react";
import { VisibilityIcon, VisibilityOffIcon, WarningIcon } from "./icons";

type PasswordFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  describedBy?: string;
  hint?: string;
};

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  required,
  disabled,
  describedBy,
  hint,
}: PasswordFieldProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const capsId = `${inputId}-caps`;
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    // Only update when we can read the modifier (real key events).
    if (typeof e.getModifierState === "function") {
      setCapsLock(e.getModifierState("CapsLock"));
    }
  }

  const ariaDescribedBy =
    [describedBy, hintId, capsLock ? capsId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="auth-field">
      <label htmlFor={inputId} className="auth-label">
        {label}
      </label>
      <div className="auth-input-wrap">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className="auth-input auth-input-with-affix"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          onKeyUp={handleKey}
          onBlur={() => setCapsLock(false)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-describedby={ariaDescribedBy}
        />
        <button
          type="button"
          className="auth-input-affix"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          tabIndex={disabled ? -1 : 0}
          disabled={disabled}
        >
          {visible ? <VisibilityOffIcon size={18} /> : <VisibilityIcon size={18} />}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="auth-hint">
          {hint}
        </p>
      )}
      {capsLock && (
        <p id={capsId} className="auth-caps" role="status" aria-live="polite">
          <WarningIcon size={14} />
          <span>Caps Lock is on</span>
        </p>
      )}
    </div>
  );
}
