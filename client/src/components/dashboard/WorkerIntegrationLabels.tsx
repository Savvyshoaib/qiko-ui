import { CalendarCheck, Phone } from "lucide-react";

type Props = {
  workerDetail?: {
    calendly_is_linked?: boolean;
    calendly_event_type?: string | null;
    vapi_credentials_added?: boolean;
  };
  hasCalendly?: boolean;
  hasVapi?: boolean;
};

export default function WorkerIntegrationLabels({ workerDetail, hasCalendly, hasVapi }: Props) {
  const resolvedHasCalendly =
    hasCalendly ??
    (Boolean(workerDetail?.calendly_is_linked) || Boolean(workerDetail?.calendly_event_type));
  const resolvedHasVapi = hasVapi ?? Boolean(workerDetail?.vapi_credentials_added);

  if (!resolvedHasCalendly && !resolvedHasVapi) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {resolvedHasVapi && (
        <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] font-medium text-violet-300">
          <Phone className="h-3 w-3" />
          {/* Voice */}
        </span>
      )}
      {resolvedHasCalendly && (
        <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-300">
          <CalendarCheck className="h-3 w-3" />
          {/* Calendly */}
        </span>
      )}
    </div>
  );
}

