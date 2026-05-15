import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatTime,
  generateId,
  truncateText,
  getUserProfileImage,
} from "./utils";

describe("utils", () => {
  it("formats a date in en-US style", () => {
    const date = new Date("2026-05-15T12:00:00Z");
    expect(formatDate(date)).toBe("May 15, 2026");
  });

  it("formats seconds into m:ss", () => {
    expect(formatTime(75)).toBe("1:15");
  });

  it("generates a short id", () => {
    const id = generateId();
    expect(id).toBeTypeOf("string");
    expect(id.length).toBe(9);
  });

  it("truncates text when over max length", () => {
    expect(truncateText("hello world", 5)).toBe("hello...");
    expect(truncateText("short", 10)).toBe("short");
  });

  it("returns profile image with fallback", () => {
    const user = { photoURL: null };
    const profile = { profileImageUrl: null };
    expect(getUserProfileImage(user, profile)).toBe("/default-avatar.svg");
  });
});
