/**
 * Discount codes applied before payment.
 *
 * Validation is ALWAYS done server-side (the client only previews the total).
 * Codes are intentionally NOT exposed via NEXT_PUBLIC.
 *
 * To add/change codes, edit the DISCOUNTS map below:
 *   - kind "percent" → value is 1–100 (e.g. 10 = 10% off)
 *   - kind "amount"  → value is a peso amount off (e.g. 500 = ₱500 off)
 * (Later this can be moved to the database or an env var without changing callers.)
 */

export type DiscountKind = "percent" | "amount";

export type DiscountDefinition = {
  kind: DiscountKind;
  value: number;
  label: string;
};

// --- Edit your codes here ---
const DISCOUNTS: Record<string, DiscountDefinition> = {
  WELCOME10: { kind: "percent", value: 10, label: "10% off" },
  BETTER500: { kind: "amount", value: 500, label: "₱500 off" },
};

export function normalizeDiscountCode(input: string) {
  return input.trim().toUpperCase();
}

export function lookupDiscount(
  code: string | null | undefined,
): (DiscountDefinition & { code: string }) | null {
  if (!code || !code.trim()) return null;
  const key = normalizeDiscountCode(code);
  const def = DISCOUNTS[key];
  return def ? { code: key, ...def } : null;
}

export type AppliedDiscount = {
  code: string | null;
  label: string | null;
  discount: number; // pesos removed
  total: number; // pesos to charge
  invalidCode: boolean;
};

/** Apply a code to a base amount (in pesos). Never returns a negative total. */
export function applyDiscount(
  amount: number,
  code: string | null | undefined,
): AppliedDiscount {
  if (!code || !code.trim()) {
    return { code: null, label: null, discount: 0, total: amount, invalidCode: false };
  }
  const def = lookupDiscount(code);
  if (!def) {
    return { code: null, label: null, discount: 0, total: amount, invalidCode: true };
  }
  const raw = def.kind === "percent" ? Math.round((amount * def.value) / 100) : def.value;
  const discount = Math.max(0, Math.min(raw, amount));
  return {
    code: def.code,
    label: def.label,
    discount,
    total: Math.max(0, amount - discount),
    invalidCode: false,
  };
}
