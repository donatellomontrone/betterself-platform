import { NextRequest, NextResponse } from "next/server";
import { lookupDiscount } from "@/lib/discounts";

// Lightweight preview endpoint: confirms a code and returns its rule so the client
// can show the new total. The actual amount is always re-applied server-side at
// checkout (/api/bookings, /api/checkout/retry) — never trust the client's total.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const def = lookupDiscount(body?.code);

  if (!def) {
    return NextResponse.json({ valid: false, message: "That code isn't valid." });
  }

  return NextResponse.json({
    valid: true,
    code: def.code,
    kind: def.kind,
    value: def.value,
    label: def.label,
  });
}
