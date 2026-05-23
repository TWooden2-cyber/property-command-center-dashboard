import { requireOwnerSession } from "@/lib/auth";
import { LuxuryShell } from "@/components/LuxuryShell";
import { CalendarFollowUpsView } from "@/components/views/CalendarFollowUpsView";

export default async function CalendarFollowUpsPage() {
  await requireOwnerSession();

  return (
    <LuxuryShell
      title="Calendar Follow-Ups Command"
      subtitle="Suspense dates, owner follow-ups, recurring reviews, calendar-needed actions, email-needed actions, and task reminders."
    >
      <CalendarFollowUpsView />
    </LuxuryShell>
  );
}
