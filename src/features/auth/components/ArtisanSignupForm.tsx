import type { FormEvent } from "react";

import { getActionButtonClassName } from "../../../components/ActionButton";
import {
  fieldErrorClassName,
  fieldHintClassName,
  fieldMetaClassName,
  getTextInputClassName,
} from "../../../lib/forms/fieldStyles";
import type { FieldErrors } from "../../../lib/forms/validation";

export type ArtisanSignupField =
  | "fullName"
  | "email"
  | "password"
  | "passwordConfirm"
  | "accessPassword";

export type ArtisanSignupErrors = FieldErrors<ArtisanSignupField>;

type ArtisanSignupFormProps = {
  accessPassword: string;
  email: string;
  fieldErrors: ArtisanSignupErrors;
  fullName: string;
  isSubmitting: boolean;
  onAccessPasswordChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onFieldBlur: (field: ArtisanSignupField) => void;
  onFullNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  password: string;
  passwordConfirm: string;
};

export function ArtisanSignupForm({
  accessPassword,
  email,
  fieldErrors,
  fullName,
  isSubmitting,
  onAccessPasswordChange,
  onEmailChange,
  onFieldBlur,
  onFullNameChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onSubmit,
  password,
  passwordConfirm,
}: ArtisanSignupFormProps) {
  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Nombre completo
          <span className={fieldMetaClassName}>Obligatorio</span>
        </span>
        <input
          aria-describedby={fieldErrors.fullName ? "artisan-full-name-error" : undefined}
          aria-invalid={Boolean(fieldErrors.fullName)}
          className={getTextInputClassName(Boolean(fieldErrors.fullName))}
          onBlur={() => {
            onFieldBlur("fullName");
          }}
          onChange={(event) => {
            onFullNameChange(event.target.value);
          }}
          placeholder="Nombre del vendedor o taller"
          type="text"
          value={fullName}
        />
        {fieldErrors.fullName ? (
          <span className={fieldErrorClassName} id="artisan-full-name-error">
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
          aria-describedby={fieldErrors.email ? "artisan-email-error" : undefined}
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
          placeholder="vendedor@ejemplo.com"
          type="email"
          value={email}
        />
        {fieldErrors.email ? (
          <span className={fieldErrorClassName} id="artisan-email-error">
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
          aria-describedby={fieldErrors.password ? "artisan-password-error" : "artisan-password-hint"}
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
          <span className={fieldErrorClassName} id="artisan-password-error">
            {fieldErrors.password}
          </span>
        ) : (
          <span className={fieldHintClassName} id="artisan-password-hint">
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
          aria-describedby={fieldErrors.passwordConfirm ? "artisan-password-confirm-error" : undefined}
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
          <span className={fieldErrorClassName} id="artisan-password-confirm-error">
            {fieldErrors.passwordConfirm}
          </span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span className="flex items-center gap-2">
          Clave de alta de vendedor
          <span className={fieldMetaClassName}>Obligatorio</span>
        </span>
        <input
          aria-describedby={fieldErrors.accessPassword ? "artisan-access-password-error" : "artisan-access-password-hint"}
          aria-invalid={Boolean(fieldErrors.accessPassword)}
          className={getTextInputClassName(Boolean(fieldErrors.accessPassword))}
          onBlur={() => {
            onFieldBlur("accessPassword");
          }}
          onChange={(event) => {
            onAccessPasswordChange(event.target.value);
          }}
          placeholder="Clave entregada por administracion"
          type="password"
          value={accessPassword}
        />
        {fieldErrors.accessPassword ? (
          <span className={fieldErrorClassName} id="artisan-access-password-error">
            {fieldErrors.accessPassword}
          </span>
        ) : (
          <span className={fieldHintClassName} id="artisan-access-password-hint">
            La entrega administracion para habilitar nuevas cuentas vendedoras.
          </span>
        )}
      </label>

      <button
        className={`${getActionButtonClassName({ fullWidth: true, variant: "primary" })} mt-2 sm:w-fit`}
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta de vendedor"}
      </button>
    </form>
  );
}
