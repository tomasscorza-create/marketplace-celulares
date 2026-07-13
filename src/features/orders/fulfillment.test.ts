import { describe, expect, it } from "vitest";

import {
  getFulfillmentSummary,
  getNextFulfillmentStatus,
  isOpenFulfillmentStatus,
} from "./fulfillment";

describe("fulfillment", () => {
  it("avanza únicamente por la secuencia operativa permitida", () => {
    expect(getNextFulfillmentStatus("pending")).toBe("preparing");
    expect(getNextFulfillmentStatus("preparing")).toBe("ready");
    expect(getNextFulfillmentStatus("ready")).toBe("delivered");
    expect(getNextFulfillmentStatus("delivered")).toBeNull();
    expect(getNextFulfillmentStatus("cancelled")).toBeNull();
  });

  it("distingue estados abiertos de estados finales", () => {
    expect(isOpenFulfillmentStatus("pending")).toBe(true);
    expect(isOpenFulfillmentStatus("ready")).toBe(true);
    expect(isOpenFulfillmentStatus("delivered")).toBe(false);
    expect(isOpenFulfillmentStatus("cancelled")).toBe(false);
  });

  it("resume una orden mixta sin marcarla como completada", () => {
    const summary = getFulfillmentSummary([
      { fulfillment_status: "delivered" },
      { fulfillment_status: "ready" },
      { fulfillment_status: "pending" },
    ]);

    expect(summary).toMatchObject({
      actionCount: 2,
      doneItems: 1,
      isMixed: true,
      openItems: 2,
      status: "preparing",
      totalItems: 3,
    });
  });

  it("usa el estado de la orden cuando todavía no hay ítems", () => {
    expect(getFulfillmentSummary([], "cancelled")).toMatchObject({
      actionCount: 0,
      detail: "Completado",
      status: "cancelled",
    });
  });
});
