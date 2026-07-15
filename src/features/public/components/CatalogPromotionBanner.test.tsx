import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/catalogo", search: "" }),
  useNavigate: () => navigateMock,
}));

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/features/catalogPromotions/catalogPromotionQueries", () => ({
  useClaimCatalogPromotion: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePublicCatalogPromotions: () => ({
    data: {
      claimedPromotionIds: [],
      promotions: [
        {
          action_label: null,
          action_type: "none",
          action_url: null,
          benefit_type: null,
          benefit_value: null,
          body: "Primera campaña",
          created_at: "2026-07-15T00:00:00.000Z",
          created_by: null,
          ends_at: null,
          id: "promotion-1",
          image_path: null,
          image_url: null,
          is_active: true,
          kind: "message",
          max_claims: null,
          minimum_order_amount: null,
          product_id: null,
          sort_order: 0,
          starts_at: null,
          title: "Primera",
          updated_at: "2026-07-15T00:00:00.000Z",
        },
        {
          action_label: null,
          action_type: "none",
          action_url: null,
          benefit_type: null,
          benefit_value: null,
          body: "Segunda campaña",
          created_at: "2026-07-15T00:00:00.000Z",
          created_by: null,
          ends_at: null,
          id: "promotion-2",
          image_path: null,
          image_url: null,
          is_active: true,
          kind: "message",
          max_claims: null,
          minimum_order_amount: null,
          product_id: null,
          sort_order: 10,
          starts_at: null,
          title: "Segunda",
          updated_at: "2026-07-15T00:00:00.000Z",
        },
      ],
    },
    isError: false,
    isLoading: false,
  }),
}));

import { CatalogPromotionBanner } from "./CatalogPromotionBanner";

describe("CatalogPromotionBanner controls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("activa el panel con el primer clic y vuelve al reposo a los tres segundos", () => {
    render(<CatalogPromotionBanner />);

    const activationLayer = screen.getByTitle("Activar controles del banner");
    const controls = activationLayer.parentElement;
    expect(controls).toHaveClass("scale-90", "opacity-35");

    fireEvent.click(activationLayer);
    expect(controls).toHaveClass("scale-100", "opacity-100");
    expect(screen.getByText("Primera")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(controls).toHaveClass("scale-100");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(controls).toHaveClass("scale-90", "opacity-35");
    expect(screen.getByText("Primera")).toBeInTheDocument();
  });
});
