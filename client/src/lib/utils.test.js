import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatTime,
  generateId,
  truncateText,
  getUserProfileImage,
  escapeHtml,
  getFirebaseAuthErrorMessage,
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

  it("escapes dangerous HTML characters to prevent XSS", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
    expect(escapeHtml('<img src=x onerror="alert(\'XSS\')">')).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;XSS&#39;)&quot;&gt;"
    );
    expect(escapeHtml("A & B")).toBe("A &amp; B");
    expect(escapeHtml(null)).toBe("");
  });

  it("maps Firebase auth errors to friendly user messages", () => {
    expect(getFirebaseAuthErrorMessage({ code: "auth/invalid-credential" })).toBe(
      "Invalid email or password. Please check your credentials."
    );
    expect(getFirebaseAuthErrorMessage({ code: "auth/email-already-in-use" })).toBe(
      "An account with this email already exists. Please sign in instead."
    );
    expect(getFirebaseAuthErrorMessage({ code: "auth/weak-password" })).toBe(
      "Password should be at least 6 characters long."
    );
    expect(getFirebaseAuthErrorMessage(null)).toBe(
      "An unexpected error occurred. Please try again."
    );
  });
});


