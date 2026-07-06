import { NextResponse } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { getGoogleProductsStatus } from "@/lib/googleProductStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const auth = await requireApiOwner();
  if (auth.response) return auth.response;

  const products = await getGoogleProductsStatus();
  const ok = products.every((product) => product.connected);

  return NextResponse.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      products
    },
    { status: ok ? 200 : 207, headers: protectedCacheHeaders }
  );
}
