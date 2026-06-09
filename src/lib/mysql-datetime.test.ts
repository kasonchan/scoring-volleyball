import { describe, expect, it } from "vitest";
import { toMysqlDatetime } from "@/lib/mysql-datetime";

describe("toMysqlDatetime", () => {
  it("formats UTC for MySQL DATETIME(3)", () => {
    const value = toMysqlDatetime(new Date("2026-06-08T23:44:21.795Z"));
    expect(value).toBe("2026-06-08 23:44:21.795");
  });
});
