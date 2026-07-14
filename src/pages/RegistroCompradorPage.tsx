import type { FormEvent } from "react";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PagePlaceholder } from "../components/PagePlaceholder";
import { isValidEmail, type FieldErrors } from "../lib/forms/validation";
import { signUpBuyer } from "../features/auth/authClient";
import {
  BuyerSignupForm,
  type BuyerSignupErrors,
  type BuyerSignupField,
} from "../features/auth/components/BuyerSignupForm";

const BUYER_SIGNUP_DRAFT_KEY = "buyer_signup_draft";

function validateBuyerField(
  field: BuyerSignupField,
  values: {
    analyticsConsent?: boolean;
    email: string;
    fullName: string;
    password: string;
    passwordConfirm: string;
    termsAccepted: boolean;
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

  if (field === "termsAccepted" && !values.termsAccepted) {
    return "Debés aceptar los términos y la política de privacidad.";
  }

  return undefined;
}

function buildBuyerErrors(values: {
  analyticsConsent?: boolean;
  email: string;
  fullName: string;
  password: string;
  passwordConfirm: string;
  termsAccepted: boolean;
}): BuyerSignupErrors {
  const errors: FieldErrors<BuyerSignupField> = {};

  (["fullName", "email", "password", "passwordConfirm", "termsAccepted"] as const).forEach((field) => {
    const error = validateBuyerField(field, values);

    if (error) {
      errors[field] = error;
    }
  });

  return errors;
}

export function RegistroCompradorPage() {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<BuyerSignupErrors>({});

  useEffect(() => {
    const savedDraft = localStorage.getItem(BUYER_SIGNUP_DRAFT_KEY);

    if (!savedDraft) {
      return;
    }

    try {
      const draft = JSON.parse(savedDraft) as Partial<{
        email: string;
        fullName: string;
        password: string;
        passwordConfirm: string;
      }>;

      setFullName(draft.fullName ?? "");
      setEmail(draft.email ?? "");
      setPassword(draft.password ?? "");
      setPasswordConfirm(draft.passwordConfirm ?? "");
    } catch {
      localStorage.removeItem(BUYER_SIGNUP_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const hasContent =
      fullName.trim().length > 0 ||
      email.trim().length > 0 ||
      password.trim().length > 0 ||
      passwordConfirm.trim().length > 0;

    if (!hasContent) {
      localStorage.removeItem(BUYER_SIGNUP_DRAFT_KEY);
      return;
    }

    localStorage.setItem(
      BUYER_SIGNUP_DRAFT_KEY,
      JSON.stringify({
        email,
        fullName,
        password,
        passwordConfirm,
      }),
    );
  }, [email, fullName, password, passwordConfirm]);

  const updateFieldError = (field: BuyerSignupField, nextError?: string) => {
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

  const validateField = (field: BuyerSignupField) => {
    updateFieldError(
      field,
      validateBuyerField(field, {
        email,
        fullName,
        password,
        passwordConfirm,
        termsAccepted,
      }),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const nextErrors = buildBuyerErrors({
      email,
      fullName,
      password,
      passwordConfirm,
      termsAccepted,
    });
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await signUpBuyer({
        analyticsConsent,
        email: email.trim(),
        fullName: fullName.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      setStatusMessage(
        data.session
          ? "Cuenta creada correctamente. Ya podes usar la plataforma."
          : "Cuenta creada. Revisa tu email para confirmar antes de iniciar sesion.",
      );
      setFullName("");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      setTermsAccepted(false);
      setAnalyticsConsent(false);
      setFieldErrors({});
      localStorage.removeItem(BUYER_SIGNUP_DRAFT_KEY);

      if (data.session) {
        navigate("/catalogo", { replace: true });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No pudimos crear la cuenta.");
    }

    setIsSubmitting(false);
  };

  return (
    <PagePlaceholder
      badge="Registro"
      description="Completa tus datos para crear tu cuenta."
      title="Crear cuenta"
    >
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-brand-100 bg-stone-50 p-5 sm:p-6">
          <BuyerSignupForm
            analyticsConsent={analyticsConsent}
            email={email}
            fieldErrors={fieldErrors}
            fullName={fullName}
            isSubmitting={isSubmitting}
            onEmailChange={(value) => {
              setEmail(value);
              setErrorMessage(null);
              setStatusMessage(null);

              if (fieldErrors.email) {
                updateFieldError(
                  "email",
                  validateBuyerField("email", {
                    email: value,
                    fullName,
                    password,
                    passwordConfirm,
                    termsAccepted,
                  }),
                );
              }
            }}
            onFieldBlur={validateField}
            onAnalyticsConsentChange={setAnalyticsConsent}
            onFullNameChange={(value) => {
              setFullName(value);
              setErrorMessage(null);
              setStatusMessage(null);

              if (fieldErrors.fullName) {
                updateFieldError(
                  "fullName",
                  validateBuyerField("fullName", {
                    email,
                    fullName: value,
                    password,
                    passwordConfirm,
                    termsAccepted,
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
                  validateBuyerField("password", {
                    email,
                    fullName,
                    password: value,
                    passwordConfirm,
                    termsAccepted,
                  }),
                );
              }

              if (fieldErrors.passwordConfirm) {
                updateFieldError(
                  "passwordConfirm",
                  validateBuyerField("passwordConfirm", {
                    email,
                    fullName,
                    password: value,
                    passwordConfirm,
                    termsAccepted,
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
                  validateBuyerField("passwordConfirm", {
                    email,
                    fullName,
                    password,
                    passwordConfirm: value,
                    termsAccepted,
                  }),
                );
              }
            }}
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            password={password}
            passwordConfirm={passwordConfirm}
            onTermsAcceptedChange={(value) => {
              setTermsAccepted(value);
              if (fieldErrors.termsAccepted) {
                updateFieldError("termsAccepted", value ? undefined : "Debés aceptar los términos y la política de privacidad.");
              }
            }}
            termsAccepted={termsAccepted}
          />

          {statusMessage ? (
            <p className="mt-4 rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-700">
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
          <Link className="hover:text-brand-600 hover:underline" to="/registro">
            Volver
          </Link>
          <span className="text-stone-300">|</span>
          <span>Ya tenes cuenta?</span>
          <Link
            className="rounded-full border border-ocean-500 bg-brand-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-600"
            to="/login"
          >
            Iniciar sesion
          </Link>
        </div>
      </div>
    </PagePlaceholder>
  );
}
