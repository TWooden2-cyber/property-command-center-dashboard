import { LoginPanel } from "@/components/LoginPanel";
import { getAuthSetupStatus, isDashboardPasswordAuthConfigured } from "@/lib/authConfig";

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string;
    reason?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = typeof searchParams?.callbackUrl === "string" ? searchParams.callbackUrl : "/";
  const reason = typeof searchParams?.reason === "string" ? searchParams.reason : undefined;

  return <LoginPanel authReady={isDashboardPasswordAuthConfigured()} callbackUrl={callbackUrl} reason={reason} setup={getAuthSetupStatus()} />;
}
