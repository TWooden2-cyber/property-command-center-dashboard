import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: false, error: "Google OAuth is disabled in local owner mode." }, { status: 404 });
}

export function POST() {
  return NextResponse.json({ ok: false, error: "Google OAuth is disabled in local owner mode." }, { status: 404 });
}
