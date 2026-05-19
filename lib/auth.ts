import { redirect } from "next/navigation";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export function isApprovedEmail(email?: string | null): boolean {
  const approved = process.env.APPROVED_OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(approved && email && email.trim().toLowerCase() === approved);
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  pages: {
    signIn: "/login",
    error: "/login"
  },
  callbacks: {
    async signIn({ user }) {
      return isApprovedEmail(user.email);
    },
    async session({ session }) {
      return session;
    },
    async jwt({ token }) {
      return token;
    }
  }
};

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

export async function requireOwnerSession() {
  const session = await getServerAuthSession();

  if (!session?.user?.email || !isApprovedEmail(session.user.email)) {
    redirect("/login");
  }

  return session;
}
