import { cookies } from "next/headers";

const VALID_PINS = ["ghs2026", "ghs", "ghs2026arena"];
const SESSION_COOKIE = "ghs_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function validatePin(pin: string): boolean {
  return VALID_PINS.includes(pin.toLowerCase().trim());
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  // Simple session token — not a JWT, just a signed marker
  const token = Buffer.from(
    JSON.stringify({
      authenticated: true,
      createdAt: Date.now(),
    })
  ).toString("base64");

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (!session?.value) return false;

  try {
    const decoded = JSON.parse(
      Buffer.from(session.value, "base64").toString("utf-8")
    );
    return decoded.authenticated === true;
  } catch {
    return false;
  }
}
