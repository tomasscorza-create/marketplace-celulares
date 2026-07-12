import type { FormEvent } from "react";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { isValidEmail, type FieldErrors } from "../lib/forms/validation";
import { signUpArtisan } from "../features/auth/authClient";
import {
  ArtisanSignupForm,
  type ArtisanSignupErrors,
  type ArtisanSignupField,
} from "../features/auth/components/ArtisanSignupForm";

function validateArtisanField(
  field: ArtisanSignupField,
  values: {
    accessPassword: string;
    email: string;
    fullName: string;
    password: string;
    passwordConfirm: string;
  },
) {
  if (field === "fullName" && values.fullName.trim().length < 2) {
    return "Ingresa un nombre valido.";
  }

  if (field === "email") {
    if (!values.email.trim()) {
      return "Ingresa un email.";
    }

    if (!isValidEmail(values.email)) {
      return "Ingresa un email valido.";
    }
  }

  if (field === "password") {
    if (!values.password.trim()) {
      return "Ingresa una contrasena.";
    }

    if (values.password.trim().length < 6) {
      return "La contrasena debe tener al menos 6 caracteres.";
    }
  }

  if (field === "passwordConfirm") {
    if (!values.passwordConfirm.trim()) {
      return "Repite la contrasena.";
    }

    if (values.password !== values.passwordConfirm) {
      return "Las contrasenas no coinciden.";
    }
  }

  if (field === "accessPassword" && !values.accessPassword.trim()) {
    return "Ingresa la clave de alta de vendedor.";
  }

  return undefined;
}

function buildArtisanErrors(values: {
  accessPassword: string;
  email: string;
  fullName: string;
  password: string;
  passwordConfirm: string;
}): ArtisanSignupErrors {
  const errors: FieldErrors<ArtisanSignupField> = {};

  (
    ["fullName", "email", "password", "passwordConfirm", "accessPassword"] as const
  ).forEach((field) => {
    const error = validateArtisanField(field, values);

    if (error) {
      errors[field] = error;
    }
  });

  return errors;
}

export function RegistroVendedorPage() {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ArtisanSignupErrors>({});

  const updateFieldError = (field: ArtisanSignupField, nextError?: string) => {
    setFieldErrors((currentValue) => {
      const nextValue = { ...currentValue };

      if (nextError) {
        nextValue[field] = nextError;
      } else {
        delete nextValue[field];
      }

      return nextValue;
    });
  };

  const validateField = (field: ArtisanSignupField) => {
    updateFieldError(
      field,
      validateArtisanField(field, {
        accessPassword,
        email,
        fullName,
        password,
        passwordConfirm,
      }),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const nextErrors = buildArtisanErrors({
      accessPassword,
      email,
      fullName,
      password,
      passwordConfirm,
    });
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await signUpArtisan({
        email: email.trim(),
        fullName: fullName.trim(),
        password,
        sellerPassword: accessPassword.trim(),
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      setStatusMessage(
        data.session
          ? "Cuenta de vendedor creada correctamente. Ya podes iniciar sesion."
          : "Cuenta creada. Revisa tu email para confirmar antes de iniciar sesion.",
      );
      setFullName("");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      setAccessPassword("");
      setFieldErrors({});

      if (data.session) {
        navigate("/catalogo", { replace: true });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No pudimos crear la cuenta.",
      );
    }

    setIsSubmitting(false);
  };

  return (
    <PagePlaceholder
      badge="Registro"
      description="Completa tus datos para habilitar tu cuenta de vendedor."
      title="Crear cuenta para vender"
    >
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-ocean-100 bg-ocean-50 p-5 sm:p-6">
          <ArtisanSignupForm
            accessPassword={accessPassword}
            email={email}
            fieldErrors={fieldErrors}
            fullName={fullName}
            isSubmitting={isSubmitting}
            onAccessPasswordChange={(value) => {
              setAccessPassword(value);
              setErrorMessage(null);
              setStatusMessage(null);

              if (fieldErrors.accessPassword) {
                updateFieldError(
                  "accessPassword",
                  validateArtisanField("accessPassword", {
                    accessPassword: value,
                    email,
                    fullName,
                    password,
                    passwordConfirm,
                  }),
                );
              }
            }}
            onEmailChange={(value) => {
              setEmail(value);
              setErrorMessage(null);
              setStatusMessage(null);

              if (fieldErrors.email) {
                updateFieldError(
                  "email",
                  validateArtisanField("email", {
                    accessPassword,
                    email: value,
                    fullName,
                    password,
                    passwordConfirm,
                  }),
                );
              }
            }}
            onFieldBlur={validateField}
            onFullNameChange={(value) => {
              setFullName(value);
              setErrorMessage(null);
              setStatusMessage(null);

              if (fieldErrors.fullName) {
                updateFieldError(
                  "fullName",
                  validateArtisanField("fullName", {
                    accessPassword,
                    email,
                    fullName: value,
                    password,
                    passwordConfirm,
                  }),
                );
              }
            }}
            onPasswordChange={(value) => {
              setPassword(value);
              setErrorMessage(null);
              setStatusMessage(null);

              if (fieldErrors.password) {
                updateFieldError(
                  "password",
                  validateArtisanField("password", {
                    accessPassword,
                    email,
                    fullName,
                    password: value,
                    passwordConfirm,
                  }),
                );
              }

              if (fieldErrors.passwordConfirm) {
                updateFieldError(
                  "passwordConfirm",
                  validateArtisanField("passwordConfirm", {
                    accessPassword,
                    email,
                    fullName,
                    password: value,
                    passwordConfirm,
                  }),
                );
              }
            }}
            onPasswordConfirmChange={(value) => {
              setPasswordConfirm(value);
              setErrorMessage(null);
              setStatusMessage(null);

              if (fieldErrors.passwordConfirm) {
                updateFieldError(
                  "passwordConfirm",
                  validateArtisanField("passwordConfirm", {
                    accessPassword,
                    email,
                    fullName,
                    password,
                    passwordConfirm: value,
                  }),
                );
              }
            }}
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            password={password}
            passwordConfirm={passwordConfirm}
          />

          {statusMessage ? (
            <p className="mt-4 rounded-2xl border border-sun-300 bg-sun-50 px-4 py-3 text-sm text-brand-700">
              {statusMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-stone-500">
          <Link className="hover:text-brand-500 hover:underline" to="/registro">
            Volver a opciones
          </Link>
          <span className="text-stone-300">|</span>
          <span>Ya tenes cuenta?</span>
          <Link
            className="rounded-full border border-ocean-500 bg-ocean-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-ocean-600"
            to="/login"
          >
            Iniciar sesion
          </Link>
        </div>
      </div>
    </PagePlaceholder>
  );
}
