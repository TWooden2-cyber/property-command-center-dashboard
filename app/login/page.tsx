import { redirect } from "next/navigation";
import { getServerAuthSession, isApprovedEmail } from "@/lib/auth";
import { LoginPanel } from "@/components/LoginPanel";

export default async function LoginPage() {
  const session = await getServerAuthSession();

  if (session?.user?.email && isApprovedEmail(session.user.email)) {
    redirect("/");
  }

  return <LoginPanel />;
}
