import { NextResponse, type NextRequest } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { appendLiveOperationsAudit } from "@/lib/googleSheets";
import { getLiveOperationsStatus, getServiceStatus } from "@/lib/liveOperations";
import type { LiveOperationServiceKey } from "@/types/sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const approvalPhrase = "OWNER APPROVES";
const allowedServices = new Set<LiveOperationServiceKey>(["sheets", "gmail", "calendar", "tasks", "drive"]);
const allowedStages = new Set(["dry-run", "approve", "execute", "cancel"]);

function auditId() {
  return `LOA-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`;
}

async function writeAudit({
  service,
  actionType,
  dryRunOrExecuted,
  approvalStatus,
  targetName,
  targetId,
  oldValue,
  newValue,
  reason,
  result,
  error,
  riskLevel
}: {
  service: string;
  actionType: string;
  dryRunOrExecuted: "dry-run" | "executed" | "blocked" | "approved" | "cancelled";
  approvalStatus: string;
  targetName: string;
  targetId: string;
  oldValue: string;
  newValue: string;
  reason: string;
  result: string;
  error: string;
  riskLevel: string;
}) {
  const status = getLiveOperationsStatus();

  if (!status.auditLoggingEnabled) {
    return;
  }

  await appendLiveOperationsAudit({
    auditId: auditId(),
    timestamp: new Date().toISOString(),
    service,
    actionType,
    dryRunOrExecuted,
    requestedBy: "owner-password-session",
    approvalStatus,
    targetName,
    targetId,
    oldValue,
    newValue,
    reason,
    result,
    error,
    riskLevel
  });
}

export async function GET() {
  const auth = await requireApiOwner();
  if (auth.response) return auth.response;

  return NextResponse.json({ ok: true, status: getLiveOperationsStatus() }, { headers: protectedCacheHeaders });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiOwner();
  if (auth.response) return auth.response;

  const status = getLiveOperationsStatus();
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid live operation request body." }, { status: 400, headers: protectedCacheHeaders });
  }

  const service = String(body.service || "") as LiveOperationServiceKey;
  const stage = String(body.stage || "");
  const actionType = String(body.actionType || "owner-controlled-action");
  const targetName = String(body.targetName || "Owner selected target");
  const targetId = String(body.targetId || "");
  const reason = String(body.reason || "Owner requested live operation review.");
  const dryRunId = String(body.dryRunId || "");
  const approvalConfirmation = String(body.approvalConfirmation || "");

  if (!status.liveOperationsEnabled) {
    return NextResponse.json({ ok: false, error: "LIVE_OPERATIONS_ENABLED is not true." }, { status: 403, headers: protectedCacheHeaders });
  }

  if (!allowedServices.has(service)) {
    return NextResponse.json({ ok: false, error: "Unsupported live operation service." }, { status: 400, headers: protectedCacheHeaders });
  }

  if (!allowedStages.has(stage)) {
    return NextResponse.json({ ok: false, error: "Unsupported live operation stage." }, { status: 400, headers: protectedCacheHeaders });
  }

  const serviceStatus = getServiceStatus(service);

  if (!serviceStatus.enabled || serviceStatus.blocked) {
    await writeAudit({
      service,
      actionType,
      dryRunOrExecuted: "blocked",
      approvalStatus: "blocked",
      targetName,
      targetId,
      oldValue: "",
      newValue: "",
      reason,
      result: "blocked",
      error: serviceStatus.missing.join("; "),
      riskLevel: "High"
    });

    return NextResponse.json(
      { ok: false, error: "Live operation service is blocked.", missing: serviceStatus.missing, service: serviceStatus },
      { status: 403, headers: protectedCacheHeaders }
    );
  }

  if (stage === "dry-run") {
    const generatedDryRunId = `dryrun-${crypto.randomUUID()}`;

    await writeAudit({
      service,
      actionType,
      dryRunOrExecuted: "dry-run",
      approvalStatus: "pending-owner-approval",
      targetName,
      targetId,
      oldValue: String(body.oldValue || ""),
      newValue: String(body.newValue || ""),
      reason,
      result: "dry-run generated",
      error: "",
      riskLevel: service === "sheets" ? "Normal" : "High"
    });

    return NextResponse.json(
      {
        ok: true,
        dryRunId: generatedDryRunId,
        approvalRequired: true,
        approvalPhrase,
        plan: {
          service,
          actionType,
          targetName,
          targetId,
          oldValue: String(body.oldValue || ""),
          newValue: String(body.newValue || ""),
          forbiddenActionsExcluded: serviceStatus.forbiddenActions
        }
      },
      { headers: protectedCacheHeaders }
    );
  }

  if (!dryRunId.startsWith("dryrun-")) {
    return NextResponse.json({ ok: false, error: "A generated dry-run plan is required first." }, { status: 409, headers: protectedCacheHeaders });
  }

  if (stage === "approve") {
    if (approvalConfirmation !== approvalPhrase) {
      return NextResponse.json({ ok: false, error: "Owner approval confirmation is required." }, { status: 409, headers: protectedCacheHeaders });
    }

    await writeAudit({
      service,
      actionType,
      dryRunOrExecuted: "approved",
      approvalStatus: "approved",
      targetName,
      targetId,
      oldValue: String(body.oldValue || ""),
      newValue: String(body.newValue || ""),
      reason,
      result: "approved for one controlled execution",
      error: "",
      riskLevel: service === "sheets" ? "Normal" : "High"
    });

    return NextResponse.json({ ok: true, approved: true, executeRequiresApprovalConfirmation: true }, { headers: protectedCacheHeaders });
  }

  if (stage === "cancel") {
    await writeAudit({
      service,
      actionType,
      dryRunOrExecuted: "cancelled",
      approvalStatus: "cancelled",
      targetName,
      targetId,
      oldValue: "",
      newValue: "",
      reason,
      result: "held by owner",
      error: "",
      riskLevel: "Normal"
    });

    return NextResponse.json({ ok: true, cancelled: true }, { headers: protectedCacheHeaders });
  }

  if (approvalConfirmation !== approvalPhrase) {
    return NextResponse.json({ ok: false, error: "Owner approval confirmation is required before execution." }, { status: 409, headers: protectedCacheHeaders });
  }

  await writeAudit({
    service,
    actionType,
    dryRunOrExecuted: "executed",
    approvalStatus: "approved",
    targetName,
    targetId,
    oldValue: String(body.oldValue || ""),
    newValue: String(body.newValue || ""),
    reason,
    result: service === "sheets" ? "approved sheet operation recorded; no bulk overwrite, delete, clear, or formula edit performed" : "approved operation recorded; connector execution remains service-gated",
    error: "",
    riskLevel: service === "sheets" ? "Normal" : "High"
  });

  return NextResponse.json(
    {
      ok: true,
      executed: true,
      result: service === "sheets" ? "Approved Sheets operation recorded in audit log." : "Approved operation recorded; service-specific connector execution is still gated."
    },
    { headers: protectedCacheHeaders }
  );
}
