import type { FormEvent } from "react";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { isValidEmail, type FieldErrors } from "../lib/forms/validation";
import { resetPasswordForEmail, signInWithPassword, signOut } from "../features/auth/authClient";
import { ActiveSessionCard } from "../features/auth/components/ActiveSessionCard";
import {
  LoginForm,
  type LoginFormErrors,
  type LoginFormField,
} from "../features/auth/components/LoginForm";
import { useAuth } from "../features/auth/useAuth";

function validateLoginField(
  field: LoginFormField,
  values: { email: string; password: string },
) {
  if (field === "email") {
    if (!values.email.trim()) {
      return "Ingresa tu email.";
    }

    if (!isValidEmail(values.email)) {
      return "Ingresa un email valido.";
    }
  }

  if (field === "password" && !values.password.trim()) {
    return "Ingresa tu contrasena.";
  }

  return undefined;
}

function buildLoginErrors(values: { email: string; password: string }): LoginFormErrors {
  const errors: FieldErrors<LoginFormField> = {};

  (["email", "password"] as const).forEach((field) => {
    const error = validateLoginField(field, values);

    if (error) {
      errors[field] = error;
    }
  });

  return errors;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { isConfigured, isLoading, profile, profileError, role, user } = useAuth();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});

  const roleLabel =
    role === "admin"
      ? "Administracion"
      : role === "artisan"
        ? "Vendedor"
        : role === "buyer"
          ? "Comprador"
          : "Pendiente de validacion";

  const sessionAction =
    role === "admin"
      ? { label: "Ir al catálogo", to: "/catalogo" }
      : role === "artisan"
        ? { label: "Ir al catálogo", to: "/catalogo" }
        : { label: "Ir al catálogo", to: "/catalogo" };

  const resetFeedback = () => {
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const updateFieldError = (field: LoginFormField, nextError?: string) => {
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

  const handleFieldBlur = (field: LoginFormField) => {
    updateFieldError(
      field,
      validateLoginField(field, { email: loginEmail, password: loginPassword }),
    );
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    const nextErrors = buildLoginErrors({ email: loginEmail, password: loginPassword });
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signInWithPassword({ email: loginEmail.trim(), password: loginPassword });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      setLoginPassword("");
      navigate("/catalogo", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No pudimos iniciar sesion.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  const handleForgotPassword = async (email: string) => {
    resetFeedback();
    const nextError = validateLoginField("email", { email, password: loginPassword });
    updateFieldError("email", nextError);

    if (nextError) {
      setErrorMessage("Ingresa un email valido antes de solicitar la recuperacion.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await resetPasswordForEmail(email.trim());

      if (error) {
        setErrorMessage(error.message);
      } else {
        setStatusMessage(
          "Si el email esta registrado recibiras un enlace para restablecer tu contrasena.",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No pudimos procesar la solicitud.",
      );
    }

    setIsSubmitting(false);
  };

  const handleSignOut = async () => {
    resetFeedback();
    setIsSubmitting(true);

    try {
      const { error } = await signOut();

      if (error) {
        setErrorMessage(error.message);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No pudimos cerrar la sesion.");
    }

    setIsSubmitting(false);
  };

  return (
    <PagePlaceholder
      badge="Acceso"
      description="Ingresa con tu email y contrasena para continuar."
      title="Iniciar sesion"
    >
      {!isConfigured ? (
        <div className="rounded-2xl border border-sun-100 bg-sun-50 p-6 text-sm leading-6 text-brand-700">
          El acceso no esta disponible en este momento. Intenta nuevamente en unos minutos.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-600">
          Cargando sesion actual...
        </div>
      ) : null}

      {!isLoading && isConfigured && !user ? (
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-sun-100 bg-[#f8fafc] p-5 sm:p-6">
            <LoginForm
              email={loginEmail}
              fieldErrors={fieldErrors}
              isSubmitting={isSubmitting}
              onEmailBlur={() => {
                handleFieldBlur("email");
              }}
              onEmailChange={(value) => {
                setLoginEmail(value);
                resetFeedback();

                if (fieldErrors.email) {
                  updateFieldError(
                    "email",
                    validateLoginField("email", { email: value, password: loginPassword }),
                  );
                }
              }}
              onForgotPassword={(email) => {
                void handleForgotPassword(email);
              }}
              onPasswordBlur={() => {
                handleFieldBlur("password");
              }}
              onPasswordChange={(value) => {
                setLoginPassword(value);
                resetFeedback();

                if (fieldErrors.password) {
                  updateFieldError(
                    "password",
                    validateLoginField("password", { email: loginEmail, password: value }),
                  );
                }
              }}
              onSubmit={(event) => {
                void handleLoginSubmit(event);
              }}
              password={loginPassword}
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

          <div className="mt-5 flex flex-col items-center justify-center gap-3 text-sm text-stone-500 sm:flex-row">
            <span>No tenes cuenta aun?</span>
            <Link
              className="rounded-full border border-ocean-500 bg-ocean-500 px-5 py-2 font-semibold text-white transition-colors hover:bg-ocean-600"
              to="/registro"
            >
              Registrate
            </Link>
          </div>
        </div>
      ) : null}

      {!isLoading && isConfigured && user ? (
        <ActiveSessionCard
          errorMessage={errorMessage}
          isSubmitting={isSubmitting}
          onSignOut={() => {
            void handleSignOut();
          }}
          profileError={profileError}
          profileFullName={profile?.full_name ?? null}
          roleLabel={roleLabel}
          sessionAction={sessionAction}
          userEmail={user.email}
        />
      ) : null}
    </PagePlaceholder>
  );
}
