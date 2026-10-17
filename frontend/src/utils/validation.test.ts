import { describe, expect, it } from "vitest";
import { messageFromProblem } from "../api/client";
import { validateCreateUser, validateLogin, validateRegister, validateTask } from "./validation";

describe("validateRegister", () => {
  it("accepts valid input", () => {
    expect(validateRegister({ name: "Omar", email: "o@x.com", password: "Password1", confirmPassword: "Password1" })).toEqual({});
  });
  it("requires matching passwords of minimum length", () => {
    const errors = validateRegister({ name: "Omar", email: "o@x.com", password: "short", confirmPassword: "other" });
    expect(errors.password).toMatch(/at least 8/);
    expect(errors.confirmPassword).toMatch(/do not match/);
  });
  it("rejects a bad email and a blank name", () => {
    const errors = validateRegister({ name: "  ", email: "nope", password: "Password1", confirmPassword: "Password1" });
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
  });
});

describe("validateLogin / validateCreateUser", () => {
  it("requires both fields on login", () => {
    expect(Object.keys(validateLogin({ email: "", password: "" }))).toEqual(["email", "password"]);
  });
  it("applies the same rules as registration for admin-created users", () => {
    expect(validateCreateUser({ name: "A", email: "a@b.co", password: "12345678" })).toEqual({});
  });
});

describe("validateTask", () => {
  it("requires a title and enforces maximum lengths", () => {
    expect(validateTask({ title: " ", description: "" }).title).toBeDefined();
    expect(validateTask({ title: "x".repeat(201), description: "" }).title).toBeDefined();
    expect(validateTask({ title: "ok", description: "d".repeat(2001) }).description).toBeDefined();
    expect(validateTask({ title: "ok", description: "fine" })).toEqual({});
  });
});

describe("messageFromProblem", () => {
  it("prefers validation messages, then detail, then a default", () => {
    expect(messageFromProblem(400, { errors: { Title: ["Title is required."] } })).toBe("Title is required.");
    expect(messageFromProblem(409, { detail: "You already created a task with this title today." })).toMatch(/already created/);
    expect(messageFromProblem(403, null)).toMatch(/permission/);
  });
});
