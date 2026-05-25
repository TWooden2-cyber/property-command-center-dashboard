import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DASHBOARD_SESSION_COOKIE, LOGIN_PATH } from "@/lib/authConfig";
import { verifyDashboardSession } from "@/lib/dashboardSession";

export type OwnerSession = {
  authenticated: true;
  approved: true;
  method: "owner-password";
  expiresAt: number;
  user: {
    role: "owner";
    email: null;
  };
};

export async function getServerAuthSession(): Promise<OwnerSession | null> {
  const cookieValue = cookies().get(DASHBOARD_SESSION_COOKIE)?.value;
  const session = await verifyDashboardSession(cookieValue);

  if (!session.valid || !session.expiresAt) {
    return null;
  }

  return {
    authenticated: true,
    approved: true,
    method: "owner-password",
    expiresAt: session.expiresAt,
    user: {
      role: "owner",
      email: null
    }
  };
}

export async function requireOwnerSession(): Promise<OwnerSession> {
  const session = await getServerAuthSession();
  if (!session) redirect(LOGIN_PATH);

  return session;
}
