import type { FormEvent } from "react";

import { useState } from "react";

import { getActionButtonClassName } from "../../../components/ActionButton";
import {
  fieldErrorClassName,
  fieldMetaClassName,
  getTextInputClassName,
} from "../../../lib/forms/fieldStyles";
import type { FieldErrors } from "../../../lib/forms/validation";

export type LoginFormField = "email" | "password";
export type LoginFormErrors = FieldErrors<LoginFormField>;

type LoginFormProps = {
  email: string;
  fieldErrors: LoginFormErrors;
  isSubmitting: boolean;
  onEmailBlur: () => void;
  onEmailChange: (value: string) => void;
  onForgotPassword?: (email: string) => void;
  onPasswordBlur: () => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  password: string;
};

export function LoginForm({
  email,
  fieldErrors,
  isSubmitting,
  onEmailBlur,
  onEmailChange,
  onForgotPassword,
  onPasswordBlur,
  onPasswordChange,
  onSubmit,
  password,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Email
          <span className={fieldMetaClassName}>Obligatorio</span>
        </span>
        <input
          aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          aria-invalid={Boolean(fieldErrors.email)}
          autoComplete="email"
          className={getTextInputClassName(Boolean(fieldErrors.email))}
          inputMode="email"
          onBlur={onEmailBlur}
          onChange={(event) => {
            onEmailChange(event.target.value);
          }}
          placeholder="usuario@ejemplo.com"
          type="email"
          value={email}
        />
        {fieldErrors.email ? (
          <span className={fieldErrorClassName} id="login-email-error">
            {fieldErrors.email}
          </span>
        ) : null}
      </label>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
            Contrasena
            <span className={fieldMetaClassName}>Obligatorio</span>
          </span>
          {onForgotPassword ? (
            <button
              className="text-xs font-medium text-ocean-500 transition-colors hover:text-brand-500"
              onClick={() => {
                onForgotPassword(email);
              }}
              type="button"
            >
              Olvide mi contrasena
            </button>
          ) : null}
        </div>
        <div className="relative">
          <input
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
            aria-invalid={Boolean(fieldErrors.password)}
            autoComplete="current-password"
            className={`${getTextInputClassName(Boolean(fieldErrors.password))} w-full pr-12`}
            onBlur={onPasswordBlur}
            onChange={(event) => {
              onPasswordChange(event.target.value);
            }}
            placeholder="Ingresa tu contrasena"
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-700"
            onClick={() => {
              setShowPassword((value) => !value);
            }}
            type="button"
          >
            {showPassword ? (
              <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" strokeLinecap="round" strokeLinejoin="round" />
                <line strokeLinecap="round" strokeLinejoin="round" x1="1" x2="23" y1="1" y2="23" />
              </svg>
            ) : (
              <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        {fieldErrors.password ? (
          <span className={fieldErrorClassName} id="login-password-error">
            {fieldErrors.password}
          </span>
        ) : null}
      </div>

      <button
        className={`${getActionButtonClassName({ fullWidth: true, variant: "primary" })} mt-2 sm:w-fit`}
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Ingresando..." : "Acceder"}
      </button>
    </form>
  );
}
