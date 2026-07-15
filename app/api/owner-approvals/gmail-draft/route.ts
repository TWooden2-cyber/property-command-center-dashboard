import { google } from "googleapis";
import { NextResponse } from "next/server";
import { protectedCacheHeaders, requireApiOwner } from "@/lib/apiAuth";
import {
  classifyGoogleApiError,
  getGoogleOAuthConfig,
  getOAuthClient,
  tokenConnectivityIssue
} from "@/lib/googleReadOnlyAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GMAIL_COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

type GmailDraftRequest = {
  taskId?: string;
  title?: string;
  propertyUnit?: string;
  category?: string;
  ownerInstructions?: string;
  draftResponse?: string;
  sourceMessageId?: string;
  sourceThreadId?: string;
  executionPayloads?: unknown[];
};

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildDraftBody(input: GmailDraftRequest) {
  const existingDraft = (input.draftResponse || "").trim();

  if (existingDraft) return existingDraft;

  return [
    "Hi,",
    "",
    "We received your message and are reviewing the item. We will follow up with the next update.",
    "",
    "Best,",
    "Property Management"
  ].filter(Boolean).join("\n");
}

function extractRecipient(input: GmailDraftRequest) {
  const text = `${input.ownerInstructions || ""} ${input.draftResponse || ""}`;
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] || "";
}

function buildRawMessage(input: GmailDraftRequest) {
  const recipient = extractRecipient(input);
  const subject = cleanHeader(`Draft: ${input.title || input.taskId || "Owner approval follow-up"}`);
  const headers = [
    recipient ? `To: ${cleanHeader(recipient)}` : "",
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0"
  ].filter(Boolean);

  return encodeBase64Url(`${headers.join("\r\n")}\r\n\r\n${buildDraftBody(input)}`);
}

export async function POST(request: Request) {
  const owner = await requireApiOwner();
  if (owner.response) return owner.response;

  let input: GmailDraftRequest;
  try {
    input = (await request.json()) as GmailDraftRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid draft request body." }, { status: 400, headers: protectedCacheHeaders });
  }

  const config = getGoogleOAuthConfig("GOOGLE_GMAIL_COMPOSE_TOKEN", ["GMAIL_COMPOSE_TOKEN", "GOOGLE_GMAIL_READONLY_TOKEN", "GMAIL_READONLY_TOKEN"]);
  const tokenIssue = tokenConnectivityIssue(config.tokenSource, [GMAIL_COMPOSE_SCOPE]);
  if (config.missingEnvVars.length || tokenIssue.errorCode) {
    return NextResponse.json(
      {
        ok: false,
        error: tokenIssue.message || `env var missing: ${config.missingEnvVars.join(", ")}`,
        errorCode: tokenIssue.errorCode || "env var missing",
        missingEnvVars: config.missingEnvVars,
        missingScopes: tokenIssue.missingScopes,
        requiredScope: GMAIL_COMPOSE_SCOPE
      },
      { status: 503, headers: protectedCacheHeaders }
    );
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: getOAuthClient(config) });
    const created = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: buildRawMessage(input),
          threadId: input.sourceThreadId || undefined
        }
      }
    });

    return NextResponse.json(
      {
        ok: true,
        draftId: created.data.id,
        messageId: created.data.message?.id,
        threadId: created.data.message?.threadId || input.sourceThreadId || "",
        gmailUrl: "https://mail.google.com/mail/u/0/#drafts",
        safety: "Gmail draft created only. No email was sent."
      },
      { headers: protectedCacheHeaders }
    );
  } catch (error) {
    const classified = classifyGoogleApiError(error);
    return NextResponse.json(
      { ok: false, error: classified.message, errorCode: classified.errorCode, requiredScope: GMAIL_COMPOSE_SCOPE },
      { status: 502, headers: protectedCacheHeaders }
    );
  }
}
