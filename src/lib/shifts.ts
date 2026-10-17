export type ShiftRecord = { id: string; date: string; startTime: string; endTime: string; notes?: string; createdAt?: string };

/** Returns the end date for a shift. An end time equal to or earlier than its start is overnight. */
export function shiftEndDate(date: string, startTime: string, endTime: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    throw new RangeError("Data e horários do plantão inválidos");
  }
  if (endTime > startTime) return date;
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function shiftToPlannerEntry(shift: ShiftRecord) {
  return {
    id: `shift:${shift.id}`,
    text: "Plantão",
    extra: shift.notes || "Escala de trabalho",
    createdAt: shift.createdAt || `${shift.date}T${shift.startTime}:00`,
    date: shift.date,
    time: shift.startTime,
    shiftEndDate: shiftEndDate(shift.date, shift.startTime, shift.endTime),
    shiftEndTime: shift.endTime,
  };
}
