import { google } from "googleapis";
import { NextResponse } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { getServiceStatus } from "@/lib/liveOperations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const taskKeywords = [
  "APPROVED",
  "DONE",
  "COMPLETED",
  "FOLLOW UP",
  "PROOF RECEIVED",
  "PROOF MISSING",
  "VENDOR COMPLETE",
  "TENANT FOLLOW-UP",
  "RENT",
  "MAINTENANCE",
  "UTILITY",
  "DRIVE",
  "GMAIL"
];

function tokenEnv() {
  return process.env.GOOGLE_TASKS_WRITE_TOKEN || process.env.GOOGLE_TASKS_TOKEN || "";
}

function credentials() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
  };
}

function parseToken(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function detectCategory(text: string) {
  const upper = text.toUpperCase();
  if (upper.includes("MAINTENANCE") || upper.includes("VENDOR") || upper.includes("PROOF")) return "Maintenance";
  if (upper.includes("RENT")) return "Rent Collection";
  if (upper.includes("UTILITY")) return "Utilities";
  if (upper.includes("DRIVE")) return "Drive Routing";
  if (upper.includes("GMAIL")) return "Gmail Review";
  if (upper.includes("FOLLOW UP")) return "Follow-Up";
  return "Owner Review";
}

function detectPropertyUnit(text: string) {
  const propertyMatch = text.match(/\b\d{2,5}\s+[A-Za-z0-9 .'-]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court)\b/i);
  const unitMatch = text.match(/\b(?:unit|apt|apartment)\s*#?\s*([A-Za-z0-9-]+)\b/i);

  return {
    property: propertyMatch?.[0] || "",
    unit: unitMatch?.[0] || ""
  };
}

export async function GET() {
  const auth = await requireApiOwner();
  if (auth.response) return auth.response;

  const service = getServiceStatus("tasks");
  if (!service.enabled || service.blocked) {
    return NextResponse.json({ ok: false, error: "Google Tasks authorization is blocked.", missing: service.missing }, { status: 403, headers: protectedCacheHeaders });
  }

  const { clientId, clientSecret } = credentials();
  const token = parseToken(tokenEnv());

  if (!clientId || !clientSecret || !token) {
    return NextResponse.json({ ok: false, error: "Google Tasks OAuth credentials are missing." }, { status: 403, headers: protectedCacheHeaders });
  }

  try {
    const oauth = new google.auth.OAuth2(clientId, clientSecret, "http://localhost");
    oauth.setCredentials(token);
    const tasks = google.tasks({ version: "v1", auth: oauth });
    const lists = await tasks.tasklists.list({ maxResults: 20 });
    const tasklist = (lists.data.items || []).find((item) => item.title === "My Tasks") || (lists.data.items || [])[0];

    if (!tasklist?.id) {
      return NextResponse.json({ ok: true, tasks: [] }, { headers: protectedCacheHeaders });
    }

    const response = await tasks.tasks.list({
      tasklist: tasklist.id,
      showCompleted: true,
      showHidden: true,
      maxResults: 50
    });

    const syncedTasks = (response.data.items || []).map((task) => {
      const text = `${task.title || ""} ${task.notes || ""}`;
      const upper = text.toUpperCase();
      const detected = detectPropertyUnit(text);

      return {
        id: task.id,
        title: task.title || "",
        notes: task.notes || "",
        due: task.due || "",
        status: task.status || "",
        updated: task.updated || "",
        completed: task.completed || "",
        relatedProperty: detected.property,
        relatedUnit: detected.unit,
        suggestedCategory: detectCategory(text),
        recommendationApproved: upper.includes("APPROVED"),
        matchedKeywords: taskKeywords.filter((keyword) => upper.includes(keyword))
      };
    });

    return NextResponse.json({ ok: true, tasks: syncedTasks }, { headers: protectedCacheHeaders });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to read Google Tasks updates." }, { status: 500, headers: protectedCacheHeaders });
  }
}
