import { NextResponse } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { buildOwnerApprovalExecutionPayloads, portalErrorPayload, type OwnerApprovalUiAction } from "@/lib/ownerApprovalExecution";
import type { OwnerApprovalRecord } from "@/lib/ownerApprovals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ExecutionPayloadRequest = {
  records?: OwnerApprovalRecord[];
  record?: OwnerApprovalRecord;
  actionFilter?: OwnerApprovalUiAction | OwnerApprovalUiAction[];
  ownerId?: string;
};

export async function POST(request: Request) {
  const owner = await requireApiOwner();
  if (owner.response) return owner.response;

  let input: ExecutionPayloadRequest;
  try {
    input = (await request.json()) as ExecutionPayloadRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid execution payload request body." }, { status: 400, headers: protectedCacheHeaders });
  }

  const records = input.records || (input.record ? [input.record] : []);
  if (!records.length) {
    return NextResponse.json({ ok: false, error: "No owner approval records were provided." }, { status: 400, headers: protectedCacheHeaders });
  }

  const payloads = records.flatMap((record) => {
    const built = buildOwnerApprovalExecutionPayloads(record, input.actionFilter, input.ownerId || "");
    return built.length ? built : [portalErrorPayload(record.id)];
  });

  const invalid = payloads.filter((payload) => payload.validationStatus !== "valid");
  if (invalid.length) {
    return NextResponse.json(
      {
        ok: false,
        error: invalid.some((payload) => payload.validationStatus === "portal_error")
          ? "Portal error: the selected owner action was not included in the execution payload."
          : invalid[0].validationMessage,
        payloads
      },
      { status: 422, headers: protectedCacheHeaders }
    );
  }

  return NextResponse.json({ ok: true, payloads }, { headers: protectedCacheHeaders });
}
