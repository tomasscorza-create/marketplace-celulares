import type { FormEvent } from "react";

import { getActionButtonClassName } from "../../../components/ActionButton";
import {
  fieldErrorClassName,
  fieldHintClassName,
  fieldMetaClassName,
  getTextInputClassName,
} from "../../../lib/forms/fieldStyles";
import type { FieldErrors } from "../../../lib/forms/validation";

export type BuyerSignupField =
  | "fullName"
  | "email"
  | "password"
  | "passwordConfirm"
  | "termsAccepted";
export type BuyerSignupErrors = FieldErrors<BuyerSignupField>;

type BuyerSignupFormProps = {
  analyticsConsent: boolean;
  email: string;
  fieldErrors: BuyerSignupErrors;
  fullName: string;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onAnalyticsConsentChange: (value: boolean) => void;
  onFieldBlur: (field: BuyerSignupField) => void;
  onFullNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTermsAcceptedChange: (value: boolean) => void;
  password: string;
  passwordConfirm: string;
  termsAccepted: boolean;
};

export function BuyerSignupForm({
  analyticsConsent,
  email,
  fieldErrors,
  fullName,
  isSubmitting,
  onEmailChange,
  onAnalyticsConsentChange,
  onFieldBlur,
  onFullNameChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onSubmit,
  onTermsAcceptedChange,
  password,
  passwordConfirm,
  termsAccepted,
}: BuyerSignupFormProps) {
  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Nombre completo
          <span className={fieldMetaClassName}>Obligatorio</span>
        </span>
        <input
          aria-describedby={fieldErrors.fullName ? "buyer-full-name-error" : undefined}
          aria-invalid={Boolean(fieldErrors.fullName)}
          className={getTextInputClassName(Boolean(fieldErrors.fullName))}
          onBlur={() => {
            onFieldBlur("fullName");
          }}
          onChange={(event) => {
            onFullNameChange(event.target.value);
          }}
          placeholder="Tu nombre"
          type="text"
          value={fullName}
        />
        {fieldErrors.fullName ? (
          <span className={fieldErrorClassName} id="buyer-full-name-error">
            {fieldErrors.fullName}
          </span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Email
          <span className={fieldMetaClassName}>Obligatorio</span>
        </span>
        <input
          aria-describedby={fieldErrors.email ? "buyer-email-error" : undefined}
          aria-invalid={Boolean(fieldErrors.email)}
          autoComplete="email"
          className={getTextInputClassName(Boolean(fieldErrors.email))}
          inputMode="email"
          onBlur={() => {
            onFieldBlur("email");
          }}
          onChange={(event) => {
            onEmailChange(event.target.value);
          }}
          placeholder="comprador@ejemplo.com"
          type="email"
          value={email}
        />
        {fieldErrors.email ? (
          <span className={fieldErrorClassName} id="buyer-email-error">
            {fieldErrors.email}
          </span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Contrasena
          <span className={fieldMetaClassName}>Obligatorio</span>
        </span>
        <input
          aria-describedby={fieldErrors.password ? "buyer-password-error" : "buyer-password-hint"}
          aria-invalid={Boolean(fieldErrors.password)}
          autoComplete="new-password"
          className={getTextInputClassName(Boolean(fieldErrors.password))}
          onBlur={() => {
            onFieldBlur("password");
          }}
          onChange={(event) => {
            onPasswordChange(event.target.value);
          }}
          placeholder="Minimo 6 caracteres"
          type="password"
          value={password}
        />
        {fieldErrors.password ? (
          <span className={fieldErrorClassName} id="buyer-password-error">
            {fieldErrors.password}
          </span>
        ) : (
          <span className={fieldHintClassName} id="buyer-password-hint">
            Usa al menos 6 caracteres.
          </span>
        )}
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Repetir contrasena
          <span className={fieldMetaClassName}>Obligatorio</span>
        </span>
        <input
          aria-describedby={fieldErrors.passwordConfirm ? "buyer-password-confirm-error" : undefined}
          aria-invalid={Boolean(fieldErrors.passwordConfirm)}
          autoComplete="new-password"
          className={getTextInputClassName(Boolean(fieldErrors.passwordConfirm))}
          onBlur={() => {
            onFieldBlur("passwordConfirm");
          }}
          onChange={(event) => {
            onPasswordConfirmChange(event.target.value);
          }}
          placeholder="Repite tu contrasena"
          type="password"
          value={passwordConfirm}
        />
        {fieldErrors.passwordConfirm ? (
          <span className={fieldErrorClassName} id="buyer-password-confirm-error">
            {fieldErrors.passwordConfirm}
          </span>
        ) : null}
      </label>

      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <label className="flex items-start gap-3 text-sm text-stone-700">
          <input
            checked={termsAccepted}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
            onChange={(event) => onTermsAcceptedChange(event.target.checked)}
            type="checkbox"
          />
          <span>
            Acepto los términos de uso y la política de privacidad. Podés revisarlos en{" "}
            <a className="font-semibold text-ocean-600 hover:underline" href="/privacidad" rel="noreferrer" target="_blank">
              Privacidad
            </a>
            .
          </span>
        </label>
        {fieldErrors.termsAccepted ? (
          <span className={fieldErrorClassName}>{fieldErrors.termsAccepted}</span>
        ) : null}

        <label className="flex items-start gap-3 text-sm text-stone-700">
          <input
            checked={analyticsConsent}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
            onChange={(event) => onAnalyticsConsentChange(event.target.checked)}
            type="checkbox"
          />
          <span>
            Permito métricas internas vinculadas con mi cuenta. Es opcional, no usa fingerprinting
            y se puede revocar cuando quieras.
          </span>
        </label>
      </div>

      <button
        className={`${getActionButtonClassName({ fullWidth: true, variant: "primary" })} mt-2 sm:w-fit`}
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
