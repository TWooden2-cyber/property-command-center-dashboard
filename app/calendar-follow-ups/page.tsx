import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CalendarFollowUpsView } from "@/components/views/CalendarFollowUpsView";

export default async function CalendarFollowUpsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell title="Calendar & Follow-Ups" subtitle="Upcoming deadlines grouped by urgency">
      <CalendarFollowUpsView />
    </LuxuryShell>
  );
}
