import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "../../types/auth";

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "./useAuth";

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(),
}));

const user = { id: "user-1" } as User;
const buyerProfile: UserProfile = {
  created_at: "2026-07-13T00:00:00.000Z",
  email: "buyer@example.com",
  full_name: "Comprador",
  id: user.id,
  profile_image_url: null,
  role: "buyer",
  store_description: null,
  store_name: null,
  storefront_theme_color: null,
};

type AuthValue = ReturnType<typeof useAuth>;

const baseAuth: AuthValue = {
  isConfigured: true,
  isLoading: false,
  profile: null,
  profileError: null,
  refreshProfile: async () => undefined,
  role: null,
  session: null,
  user: null,
};

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/privado"]}>
      <Routes>
        <Route element={<div>Acceso público</div>} path="/login" />
        <Route
          path="/privado"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <div>Panel comprador</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(baseAuth);
  });

  it("muestra configuración pendiente cuando Supabase Auth está deshabilitado", () => {
    vi.mocked(useAuth).mockReturnValue({ ...baseAuth, isConfigured: false });

    renderProtectedRoute();

    expect(screen.getByRole("heading", { name: "Configuracion pendiente" })).toBeInTheDocument();
  });

  it("redirige al login cuando no existe una sesión", () => {
    renderProtectedRoute();

    expect(screen.getByText("Acceso público")).toBeInTheDocument();
  });

  it("bloquea un rol no autorizado", () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      profile: { ...buyerProfile, role: "artisan" },
      role: "artisan",
      user,
    });

    renderProtectedRoute();

    expect(screen.getByRole("heading", { name: "Acceso denegado" })).toBeInTheDocument();
  });

  it("permite entrar al rol autorizado", () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      profile: buyerProfile,
      role: "buyer",
      user,
    });

    renderProtectedRoute();

    expect(screen.getByText("Panel comprador")).toBeInTheDocument();
  });

  it("explica cuando la sesión existe pero falta el perfil", () => {
    vi.mocked(useAuth).mockReturnValue({ ...baseAuth, user });

    renderProtectedRoute();

    expect(screen.getByRole("heading", { name: "Perfil no disponible" })).toBeInTheDocument();
  });
});
