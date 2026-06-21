import { NextResponse } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { getDriveReadonlyStatus, listDriveReadonlyMetadata } from "@/lib/googleDriveReadonly";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const auth = await requireApiOwner();
    if (auth.response) return auth.response;

    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      const status = await getDriveReadonlyStatus();
      return NextResponse.json(
        {
          ok: true,
          mode: "disabled-production-safe",
          status: {
            ...status,
            connected: false,
            disabled: true,
            reason: "Use /api/google/drive/status for production read-only Drive metadata status. This legacy listing route remains disabled in production."
          }
        },
        { headers: protectedCacheHeaders }
      );
    }

    const status = await listDriveReadonlyMetadata();
    return NextResponse.json({ ok: true, mode: "local-readonly", status }, { headers: protectedCacheHeaders });
  } catch (error) {
    const status = await getDriveReadonlyStatus();
    return NextResponse.json(
      {
        ok: false,
        mode: "safe-error",
        status: {
          ...status,
          connected: false,
          disabled: true,
          reason: error instanceof Error ? error.message : "Drive read-only listing failed safely."
        }
      },
      { status: 200, headers: protectedCacheHeaders }
    );
  }
}
