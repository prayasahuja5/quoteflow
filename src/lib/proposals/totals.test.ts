import { describe, expect, it } from "vitest";
import { computeTotals } from "./totals";

describe("computeTotals", () => {
  it("applies discount before tax and rounds each step", () => {
    const result = computeTotals(
      [
        { quantity: 2, unit_price: 100 },
        { quantity: 1, unit_price: 50.5 },
      ],
      10,
      18,
    );

    expect(result).toEqual({
      subtotal: 250.5,
      discountAmount: 25.05,
      taxableAmount: 225.45,
      taxAmount: 40.58,
      total: 266.03,
    });
  });

  it("returns zeros when there are no line items", () => {
    expect(computeTotals([], 10, 18)).toEqual({
      subtotal: 0,
      discountAmount: 0,
      taxableAmount: 0,
      taxAmount: 0,
      total: 0,
    });
  });

  it("keeps a free line item at zero", () => {
    expect(computeTotals([{ quantity: 3, unit_price: 0 }], 0, 18).total).toBe(0);
  });
});
