import { describe, it, expect } from "vitest";
import { isPermanentQueueError } from "@/lib/offlineQueueErrors";

describe("isPermanentQueueError", () => {
  it("classifies RLS / permission-denied errors as permanent", () => {
    expect(isPermanentQueueError({ code: "42501", message: "permission denied for table field_reports" })).toBe(true);
    expect(isPermanentQueueError({ message: "new row violates row-level security policy" })).toBe(true);
  });

  it("classifies constraint and validation errors as permanent", () => {
    expect(isPermanentQueueError({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe(true);
    expect(isPermanentQueueError({ code: "23503", message: "violates foreign key constraint" })).toBe(true);
    expect(isPermanentQueueError({ code: "22P02", message: "invalid input syntax for type uuid" })).toBe(true);
    expect(isPermanentQueueError({ code: "23502", message: "null value in column violates not-null constraint" })).toBe(true);
  });

  it("classifies network / transient errors as retryable", () => {
    expect(isPermanentQueueError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isPermanentQueueError({ message: "fetch failed" })).toBe(false);
    expect(isPermanentQueueError({ code: "PGRST116", message: "no rows" })).toBe(false);
    expect(isPermanentQueueError(new Error("timeout of 10000ms exceeded"))).toBe(false);
  });

  it("treats non-errors safely", () => {
    expect(isPermanentQueueError(null)).toBe(false);
    expect(isPermanentQueueError(undefined)).toBe(false);
    expect(isPermanentQueueError("boom")).toBe(false);
  });
});
