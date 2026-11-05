export type TotalsLineItem = {
  quantity: number;
  unit_price: number;
};

export type ProposalTotals = {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeTotals(
  lineItems: TotalsLineItem[],
  discountPercent: number,
  taxPercent: number,
): ProposalTotals {
  const subtotal = roundMoney(
    lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
  );
  const discountAmount = roundMoney((subtotal * discountPercent) / 100);
  const taxableAmount = roundMoney(subtotal - discountAmount);
  const taxAmount = roundMoney((taxableAmount * taxPercent) / 100);
  const total = roundMoney(taxableAmount + taxAmount);
  return { subtotal, discountAmount, taxableAmount, taxAmount, total };
}
