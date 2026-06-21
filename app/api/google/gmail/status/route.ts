import { NextResponse } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { getGmailProductStatus } from "@/lib/googleProductStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const auth = await requireApiOwner();
  if (auth.response) return auth.response;

  const status = await getGmailProductStatus();
  return NextResponse.json({ ok: status.connected, status }, { status: status.status === "error" ? 207 : 200, headers: protectedCacheHeaders });
}
