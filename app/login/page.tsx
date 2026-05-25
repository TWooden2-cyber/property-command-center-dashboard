import { LoginPanel } from "@/components/LoginPanel";
import { getAuthSetupStatus, isGoogleAuthConfigured } from "@/lib/authConfig";

export default function LoginPage() {
  return <LoginPanel authReady={isGoogleAuthConfigured()} setup={getAuthSetupStatus()} />;
}
