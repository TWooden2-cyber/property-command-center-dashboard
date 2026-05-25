import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";

export const protectedCacheHeaders = {
  "Cache-Control": "no-store, max-age=0"
};

export async function requireApiOwner() {
  const session = await getServerAuthSession();

  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        { ok: false, error: "Owner authentication required." },
        { status: 401, headers: protectedCacheHeaders }
      )
    };
  }

  return { session, response: null };
}
