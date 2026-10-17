import { describe, expect, it } from "vitest";
import { shiftEndDate, shiftToPlannerEntry } from "./shifts";

describe("shift date handling", () => {
  it("keeps a day shift on the same date", () => {
    expect(shiftEndDate("2026-10-17", "07:00", "19:00")).toBe("2026-10-17");
  });
  it("moves an overnight shift end to the next date", () => {
    expect(shiftEndDate("2026-10-17", "19:00", "07:00")).toBe("2026-10-18");
  });
  it("handles month and year boundaries", () => {
    expect(shiftEndDate("2026-12-31", "22:00", "06:00")).toBe("2027-01-01");
  });
  it("treats equal start and end times as a 24-hour shift", () => {
    expect(shiftEndDate("2026-10-17", "07:00", "07:00")).toBe("2026-10-18");
  });
  it("maps shifts to planner entries without making them ordinary tasks", () => {
    const entry = shiftToPlannerEntry({ id: "abc", date: "2026-10-17", startTime: "19:00", endTime: "07:00", notes: "Noturno" });
    expect(entry.id).toBe("shift:abc");
    expect(entry.date).toBe("2026-10-17");
    expect(entry.shiftEndDate).toBe("2026-10-18");
    expect(entry.shiftEndTime).toBe("07:00");
  });
  it("rejects malformed date or times", () => {
    expect(() => shiftEndDate("17-10-2026", "19:00", "07:00")).toThrow(RangeError);
  });
});
