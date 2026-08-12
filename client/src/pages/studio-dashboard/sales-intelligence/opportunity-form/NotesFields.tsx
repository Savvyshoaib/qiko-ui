import { OPPORTUNITY_FORM_TEXTAREA_CLASS } from "../opportunityFormTypes";

export function NotesFields({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-[11px] text-slate-500">
        Internal notes for this opportunity. Sync will be available when the API is connected.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        maxLength={2000}
        placeholder="Add internal notes about this opportunity..."
        className={OPPORTUNITY_FORM_TEXTAREA_CLASS}
      />
      <p className="mt-2 text-[10px] text-slate-500">{value.length}/2000</p>
    </div>
  );
}
