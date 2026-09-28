import { useHouseholdMembers } from "@/hooks/use-household-members";

const SHARED_RESPONSIBLE_VALUE = "AMBAS";

export function ResponsibleField({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { data: members = [] } = useHouseholdMembers();
  const normalized = value === "AMBAS / COMPARTILHADO" ? SHARED_RESPONSIBLE_VALUE : value;

  return (
    <label className={className}>
      <span className="label-caps text-[10px]">RESPONSÁVEL</span>
      <select
        value={normalized || SHARED_RESPONSIBLE_VALUE}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
      >
        <option value={SHARED_RESPONSIBLE_VALUE}>AMBOS / COMPARTILHADO</option>
        {members.map((member) => (
          <option key={member.id} value={member.name}>{member.name}</option>
        ))}
      </select>
    </label>
  );
}
