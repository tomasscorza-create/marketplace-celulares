import type { FormEvent } from "react";

import { getActionButtonClassName } from "../../../components/ActionButton";
import {
  fieldErrorClassName,
  fieldHintClassName,
  fieldMetaClassName,
  getTextInputClassName,
} from "../../../lib/forms/fieldStyles";
import type { FieldErrors } from "../../../lib/forms/validation";

export type BuyerSignupField = "fullName" | "email" | "password" | "passwordConfirm";
export type BuyerSignupErrors = FieldErrors<BuyerSignupField>;

type BuyerSignupFormProps = {
  email: string;
  fieldErrors: BuyerSignupErrors;
  fullName: string;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onFieldBlur: (field: BuyerSignupField) => void;
  onFullNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  password: string;
  passwordConfirm: string;
};

export function BuyerSignupForm({
  email,
  fieldErrors,
  fullName,
  isSubmitting,
  onEmailChange,
  onFieldBlur,
  onFullNameChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onSubmit,
  password,
  passwordConfirm,
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
