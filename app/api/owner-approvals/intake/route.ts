import { google, type gmail_v1 } from "googleapis";
import { NextResponse } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import { getDriveProductStatus } from "@/lib/googleProductStatus";
import { getGoogleOAuthConfig, getOAuthClient, tokenConnectivityIssue } from "@/lib/googleReadOnlyAuth";
import type { OwnerApprovalCategory, OwnerApprovalPriority, OwnerApprovalRecord } from "@/lib/ownerApprovals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GMAIL_READ_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const ACTION_TERMS =
  /(repair|maintenance|invoice|estimate|photo|receipt|rent|payment|ledger|balance|late|eviction|notice|court|rfta|section 8|hacp|lease|addendum|duquesne|utility|water|sewer|gas|trash|internet|electric|google voice|voicemail|tenant|vendor|owner approval|228|reifert|3103|courtney)/i;

function classifyCategory(text: string): OwnerApprovalCategory {
  const value = text.toLowerCase();
  if (/(eviction|notice|court|rfta|section 8|hacp|legal|complaint|affidavit)/.test(value)) return "Legal";
  if (/(rent|payment|ledger|balance|late|paid|overdue|arrangement)/.test(value)) return "Rent";
  if (/(repair|maintenance|invoice|photo|vendor|heat|plumb|leak|estimate|receipt|complete)/.test(value)) return "Maintenance";
  if (/(duquesne|utility|water|sewer|gas|trash|internet|electric|bill)/.test(value)) return "Utility";
  if (/(lease|addendum|renewal|contract)/.test(value)) return "Lease";
  return "Other";
}

function classifyPriority(category: OwnerApprovalCategory, text: string): OwnerApprovalPriority {
  if (/(eviction|court|shut.?off|termination|emergency|unsafe|heat|legal|notice)/i.test(text)) return "High";
  if (category === "Legal") return "High";
  if (category === "Maintenance" || category === "Utility" || category === "Rent") return "Medium";
  return "Low";
}

function classifyProperty(text: string) {
  if (/228|reifert/i.test(text)) return "228 Reifert St";
  if (/3103|courtney/i.test(text)) return "3103 Courtney";
  if (/7.?unit/i.test(text)) return "7-Unit Building";
  if (/4.?unit/i.test(text)) return "4-Unit Building";
  return "Property needs owner review";
}

function classifyUnit(text: string) {
  const unit = text.match(/\b(?:unit|apt|apartment)\s*([a-z0-9]+)\b/i);
  return unit ? ` - Unit ${unit[1].toUpperCase()}` : "";
}

function nowParts() {
  const now = new Date();
  return {
    date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    iso: now.toISOString()
  };
}

function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string) {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

function decodeBase64Url(value?: string | null) {
  if (!value) return "";
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function walkParts(part: gmail_v1.Schema$MessagePart | undefined, state: { text: string[]; html: string[]; attachments: OwnerApprovalRecord["documents"] }) {
  if (!part) return;
  const filename = part.filename || "";
  if (filename) {
    state.attachments.push({
      name: filename,
      type: part.mimeType || "Attachment",
      size: part.body?.size ? `${part.body.size} bytes` : "Unknown size"
    });
  }

  if (part.mimeType === "text/plain") state.text.push(decodeBase64Url(part.body?.data));
  if (part.mimeType === "text/html") state.html.push(decodeBase64Url(part.body?.data).replace(/<[^>]*>/g, " "));
  (part.parts || []).forEach((child) => walkParts(child, state));
}

function extractMessageContent(message: gmail_v1.Schema$Message) {
  const state: { text: string[]; html: string[]; attachments: OwnerApprovalRecord["documents"] } = { text: [], html: [], attachments: [] };
  walkParts(message.payload || undefined, state);
  const body = (state.text.join("\n").trim() || state.html.join("\n").trim() || message.snippet || "").replace(/\s{3,}/g, " ").slice(0, 4000);
  return { body, attachments: state.attachments };
}

function summarizeBody(body: string, subject: string) {
  const clean = body.replace(/\s+/g, " ").trim();
  if (!clean) return [`Email "${subject}" needs owner review. Full body was empty or unavailable.`];
  const first = clean.slice(0, 360);
  const second = clean.length > 360 ? clean.slice(360, 720) : "";
  return [first, second].filter(Boolean);
}

function estimateCost(text: string) {
  const match = text.match(/\$\s?([0-9][0-9,]*(?:\.\d{2})?)/);
  if (!match) return { amount: 0, range: "$0", note: "No cost found in email." };
  const amount = Number(match[1].replace(/,/g, ""));
  return { amount, range: `$${match[1]}`, note: "Cost detected from email content; owner verification required." };
}

function extractDeadline(text: string, fallback: string) {
  const due = text.match(/\b(?:due|deadline|by|before)\s*:?\s*([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  return due?.[1] || fallback;
}

function recommendedAction(category: OwnerApprovalCategory, hasAttachments: boolean) {
  if (category === "Maintenance") return hasAttachments ? "Review attachment proof/invoice, then approve tracker update or vendor follow-up." : "Review maintenance request and decide whether to assign vendor or request more proof.";
  if (category === "Rent") return "Review ledger/payment proof before any reminder, notice, or tracker status change.";
  if (category === "Legal") return "Keep legal action blocked until proof and final owner approval are verified.";
  if (category === "Utility") return "Review utility bill/setup proof and approve tracker status only if correct.";
  if (category === "Lease") return "Review lease document and approve draft/revision path only.";
  return "Review email context and decide whether Codex should prepare a draft, tracker preview, or no action.";
}

function draftResponseFor(category: OwnerApprovalCategory) {
  if (category === "Maintenance") return "Hi [Name],\n\nThank you for the update. We are reviewing this maintenance item and will follow up after owner approval.\n\nProperty Management";
  if (category === "Rent") return "Hi [Name],\n\nWe received your message and are reviewing the ledger before confirming any next steps.\n\nProperty Management";
  if (category === "Utility") return "Utility item received for owner review. No payment or account action will be taken without owner approval.";
  return "";
}

async function readGmailIntakeItems() {
  const config = getGoogleOAuthConfig("GOOGLE_GMAIL_READONLY_TOKEN", ["GMAIL_READONLY_TOKEN", "GOOGLE_GMAIL_METADATA_TOKEN", "GMAIL_METADATA_TOKEN"]);
  if (config.missingEnvVars.length > 0) {
    return {
      connected: false,
      message: `Gmail full read intake is missing required environment variables: ${config.missingEnvVars.join(", ")}.`,
      items: [] as OwnerApprovalRecord[]
    };
  }

  const tokenIssue = tokenConnectivityIssue(config.tokenSource, [GMAIL_READ_SCOPE]);
  if (tokenIssue.message) {
    return {
      connected: false,
      message: `${tokenIssue.message}. Full email body intake requires ${GMAIL_READ_SCOPE}.`,
      items: [] as OwnerApprovalRecord[]
    };
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: getOAuthClient(config) });
    const stamp = nowParts();
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 100,
      includeSpamTrash: false
    });

    const messages = response.data.messages || [];
    const items: OwnerApprovalRecord[] = [];
    const seenThreads = new Set<string>();

    for (const messageRef of messages) {
      if (!messageRef.id) continue;
      const message = await gmail.users.messages.get({ userId: "me", id: messageRef.id, format: "full" });
      const headers = message.data.payload?.headers || [];
      const subject = header(headers, "Subject") || "(No subject)";
      const from = header(headers, "From") || "Unknown sender";
      const date = header(headers, "Date") || stamp.iso;
      const { body, attachments } = extractMessageContent(message.data);
      const searchable = `${subject}\n${from}\n${body}\n${attachments.map((item) => item.name).join("\n")}`;
      const category = classifyCategory(searchable);

      if (category === "Other" && !ACTION_TERMS.test(searchable)) continue;

      const threadId = message.data.threadId || messageRef.threadId || messageRef.id;
      if (seenThreads.has(threadId)) continue;
      seenThreads.add(threadId);

      let threadContext = "Single message or thread context not available.";
      if (threadId) {
        const thread = await gmail.users.threads.get({ userId: "me", id: threadId, format: "metadata", metadataHeaders: ["From", "Subject", "Date"] });
        threadContext = (thread.data.messages || [])
          .slice(-4)
          .map((threadMessage, index) => {
            const threadHeaders = threadMessage.payload?.headers || [];
            return `Thread ${index + 1}: ${header(threadHeaders, "Date")} | ${header(threadHeaders, "From")} | ${header(threadHeaders, "Subject")}`;
          })
          .join("\n");
      }

      const property = classifyProperty(searchable);
      const unit = classifyUnit(searchable);
      const priority = classifyPriority(category, searchable);
      const cost = estimateCost(searchable);
      const deadline = extractDeadline(searchable, stamp.date);
      const source = /google voice|voice|voicemail/i.test(searchable) ? "Google Voice" : "Gmail";

      items.push({
        id: `#GMAIL-${messageRef.id}`,
        source,
        category,
        propertyUnit: `${property}${unit}`,
        title: subject,
        summary: subject,
        receivedDate: stamp.date,
        receivedTime: stamp.time,
        priority,
        status: "Needs Review",
        reviewSummary: [
          `From: ${from}`,
          `Date: ${date}`,
          ...summarizeBody(body, subject),
          threadContext
        ],
        tenant: "Owner review required",
        reported: date,
        property,
        documents: attachments.length ? attachments : [{ name: "No attachments found", type: "Email body", size: "Body read" }],
        draftResponse: draftResponseFor(category),
        recommendedAction: recommendedAction(category, attachments.length > 0),
        vendorSuggestion: category === "Maintenance" ? "Owner/vendor selection required" : "Internal owner review",
        eta: priority === "High" ? "Same business day owner review" : "Owner dependent",
        estimatedCost: cost.amount,
        costRange: cost.range,
        costNote: cost.note,
        deadlineLabel: "Detected / Review Deadline:",
        deadline,
        tenantExpectation: category === "Maintenance" || category === "Rent" ? "Response likely expected" : "N/A",
        daysOpen: 0,
        ownerDecision: "None",
        ownerInstructions: "",
        approvedAction: "Read-only Gmail intake item created. Owner approval is required before any reply, draft, label, archive, tracker update, legal, financial, Drive, Calendar, or Task action.",
        dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Activity log"],
        rejectionReason: "",
        sourceMode: "Live Gmail Read",
        connectorStatus: "Gmail full read-only intake completed. Email bodies, headers, attachments metadata, and thread metadata were read. No Gmail writes were performed.",
        statusHistory: [],
        sourceMessageId: messageRef.id,
        sourceThreadId: threadId
      });
    }

    return {
      connected: true,
      message: `Gmail full read-only intake checked ${messages.length} messages and found ${items.length} owner-review item(s).`,
      items
    };
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? `Gmail full read intake failed: ${error.message}` : "Gmail full read intake failed.",
      items: [] as OwnerApprovalRecord[]
    };
  }
}

function blockedGmailItem(message: string): OwnerApprovalRecord {
  const stamp = nowParts();
  return {
    id: `#BLOCKED-GMAIL-READ-${stamp.iso.slice(0, 10).replaceAll("-", "")}`,
    source: "Gmail",
    category: "Other",
    propertyUnit: "All Properties",
    title: "Gmail full email intake blocked",
    summary: "Gmail body/thread/attachment intake is not available.",
    receivedDate: stamp.date,
    receivedTime: stamp.time,
    priority: "High",
    status: "Needs Review",
    reviewSummary: [message, "No Gmail messages were read or modified."],
    tenant: "N/A",
    reported: stamp.iso,
    property: "All Properties",
    documents: [],
    draftResponse: "",
    recommendedAction: "Reconnect/configure Gmail with read-only scope, then run Check Gmail & Voice Intake again.",
    vendorSuggestion: "System setup",
    eta: "Owner/admin dependent",
    estimatedCost: 0,
    costRange: "$0",
    costNote: "No spend approved",
    deadlineLabel: "Connection Needed:",
    deadline: "Before live Gmail intake can run",
    tenantExpectation: "N/A",
    daysOpen: 0,
    ownerDecision: "None",
    ownerInstructions: "",
    approvedAction: "Resolve Gmail connector configuration only after owner/admin approval.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Activity log"],
    rejectionReason: "",
    sourceMode: "Blocked",
    connectorStatus: message,
    statusHistory: []
  };
}

function voiceWorkaroundItem(driveMessage: string, driveConnected: boolean): OwnerApprovalRecord {
  const stamp = nowParts();
  return {
    id: `#VOICE-WORKAROUND-${stamp.iso.slice(0, 10).replaceAll("-", "")}`,
    source: "Google Voice",
    category: "Other",
    propertyUnit: "7-unit rental property / Unit unknown",
    title: "Google Voice direct intake uses Gmail/Drive workaround sources",
    summary: "Direct Google Voice API is unavailable; Gmail Google Voice notifications are read by Gmail intake, and screenshots/transcripts can be reviewed from Drive intake.",
    receivedDate: stamp.date,
    receivedTime: stamp.time,
    priority: "Medium",
    status: "Needs Review",
    reviewSummary: [
      "Google Voice direct connector is not available in this portal.",
      driveConnected ? "Drive metadata is available for owner-provided Google Voice screenshots/transcripts/workaround files." : `Drive workaround source check blocked: ${driveMessage}`
    ],
    tenant: "Owner clarification required",
    reported: stamp.iso,
    property: "7-unit rental property",
    documents: [],
    draftResponse: "",
    recommendedAction: "Use Gmail Google Voice notifications or upload/identify Google Voice screenshot/transcript/export proof, then review through Owner Approval.",
    vendorSuggestion: "Google Voice workaround",
    eta: "Owner dependent",
    estimatedCost: 0,
    costRange: "$0",
    costNote: "No spend approved",
    deadlineLabel: "Owner Clarification Needed:",
    deadline: "When source proof is available",
    tenantExpectation: "N/A",
    daysOpen: 0,
    ownerDecision: "None",
    ownerInstructions: "",
    approvedAction: "Add workaround source material to Owner Approval only; no replies or sends.",
    dashboardUpdatesRequired: ["Owner Approval Queue status", "Dashboard", "Communication tracker", "Activity log"],
    rejectionReason: "",
    sourceMode: driveConnected ? "Drive Workaround" : "Blocked",
    connectorStatus: driveConnected ? "Gmail reads Google Voice notifications; Drive workaround source available; direct Google Voice unavailable." : driveMessage,
    statusHistory: []
  };
}

export async function GET() {
  const auth = await requireApiOwner();
  if (auth.response) return auth.response;

  const [gmailIntake, driveStatus] = await Promise.all([readGmailIntakeItems(), getDriveProductStatus()]);
  const items = [...gmailIntake.items];
  if (!gmailIntake.connected) items.push(blockedGmailItem(gmailIntake.message));
  items.push(voiceWorkaroundItem(driveStatus.message, driveStatus.connected));

  return NextResponse.json(
    {
      ok: gmailIntake.connected || driveStatus.connected,
      checkedAt: nowParts().iso,
      statuses: [
        { product: "Gmail", connected: gmailIntake.connected, mode: "read-only full message", message: gmailIntake.message },
        driveStatus,
        { product: "Google Voice", connected: false, mode: "gmail-and-drive-workaround-only", message: "Google Voice direct API unavailable; Gmail notifications and Drive workaround files are used." }
      ],
      items,
      safety: "Read-only intake check only. Gmail messages may be read when read-only scope is connected. No Gmail replies, Google writes, document moves, task closures, calendar updates, legal actions, financial actions, labels, archives, deletes, drafts, or sends were executed."
    },
    { headers: protectedCacheHeaders }
  );
}
