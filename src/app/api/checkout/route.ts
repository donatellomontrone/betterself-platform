import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message:
        "Direct checkout is disabled. Submit a booking request first; payment opens from the patient dashboard after doctor confirmation.",
      dashboardUrl: "/dashboard?payment=not_confirmed",
    },
    { status: 409 },
  );
}
