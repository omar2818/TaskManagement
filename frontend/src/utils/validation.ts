// Client-side rules mirror the API's DataAnnotations (see Application/DTOs).
export const LIMITS = {
  nameMax: 100,
  emailMax: 256,
  passwordMin: 8,
  passwordMax: 100,
  titleMax: 200,
  descriptionMax: 2000,
} as const;

export type FormErrors<K extends string> = Partial<Record<K, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkName(name: string): string | undefined {
  if (!name.trim()) return "Name is required.";
  if (name.trim().length > LIMITS.nameMax) return `Name must be at most ${LIMITS.nameMax} characters.`;
}

function checkEmail(email: string): string | undefined {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address.";
  if (email.trim().length > LIMITS.emailMax) return `Email must be at most ${LIMITS.emailMax} characters.`;
}

function checkPassword(password: string): string | undefined {
  if (!password) return "Password is required.";
  if (password.length < LIMITS.passwordMin) return `Password must be at least ${LIMITS.passwordMin} characters.`;
  if (password.length > LIMITS.passwordMax) return `Password must be at most ${LIMITS.passwordMax} characters.`;
}

function compact<K extends string>(errors: FormErrors<K>): FormErrors<K> {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as FormErrors<K>;
}

export function validateLogin(v: { email: string; password: string }): FormErrors<"email" | "password"> {
  return compact({
    email: checkEmail(v.email),
    password: v.password ? undefined : "Password is required.",
  });
}

export function validateCreateUser(v: {
  name: string;
  email: string;
  password: string;
}): FormErrors<"name" | "email" | "password"> {
  return compact({ name: checkName(v.name), email: checkEmail(v.email), password: checkPassword(v.password) });
}

export function validateRegister(v: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): FormErrors<"name" | "email" | "password" | "confirmPassword"> {
  return compact({
    ...validateCreateUser(v),
    confirmPassword: !v.confirmPassword
      ? "Please confirm your password."
      : v.confirmPassword !== v.password
        ? "Passwords do not match."
        : undefined,
  });
}

export function validateTask(v: { title: string; description: string }): FormErrors<"title" | "description"> {
  return compact({
    title: !v.title.trim()
      ? "Title is required."
      : v.title.trim().length > LIMITS.titleMax
        ? `Title must be at most ${LIMITS.titleMax} characters.`
        : undefined,
    description:
      v.description.length > LIMITS.descriptionMax
        ? `Description must be at most ${LIMITS.descriptionMax} characters.`
        : undefined,
  });
}
