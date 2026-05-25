import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { ACCESS_DENIED_PATH, LOGIN_PATH, getAuthSecret, isApprovedOwnerEmail } from "@/lib/authConfig";

export type OwnerSession = Session & {
  user: NonNullable<Session["user"]> & {
    email: string;
  };
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  pages: {
    signIn: LOGIN_PATH,
    error: ACCESS_DENIED_PATH
  },
  session: {
    strategy: "jwt"
  },
  secret: getAuthSecret(),
  callbacks: {
    async signIn({ user }) {
      if (!isApprovedOwnerEmail(user.email)) {
        return ACCESS_DENIED_PATH;
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
      }

      return session;
    }
  }
};

export function isApprovedEmail(email?: string | null): boolean {
  return isApprovedOwnerEmail(email);
}

export async function getServerAuthSession(): Promise<OwnerSession | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email || !isApprovedOwnerEmail(email)) {
    return null;
  }

  return session as OwnerSession;
}

export async function requireOwnerSession(): Promise<OwnerSession> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    redirect(LOGIN_PATH);
  }

  if (!isApprovedOwnerEmail(email)) {
    redirect(ACCESS_DENIED_PATH);
  }

  return session as OwnerSession;
}
