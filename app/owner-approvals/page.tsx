import { requireOwnerSession } from "@/lib/auth";
import { OwnerApprovalsView } from "@/components/views/OwnerApprovalsView";

export default async function OwnerApprovalsPage() {
  await requireOwnerSession();

  return <OwnerApprovalsView />;
}
