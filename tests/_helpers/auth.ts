import type { Page } from "@playwright/test";
import { buildSessionCookie, createSession, type Role } from "@/app/api/_lib/auth";

export const BASE_URL =
  process.env.BASE_URL || `http://localhost:${process.env.PORT ?? 3000}`;

/**
 * E2E helper: create a real session in local session store, then attach cookie to the browser.
 */
export async function loginAsRole(page: Page, role: Role) {
  const session = await createSession({ user_id: `e2e-${role}`, role });
  const setCookie = buildSessionCookie(session.session_id);
  const [cookiePair] = setCookie.split(";");
  const [name, value] = cookiePair.split("=");

  await page.context().addCookies([
    {
      name,
      value: decodeURIComponent(value),
      url: BASE_URL,
    },
  ]);
}

/**
 * Unit/integration helper: create a real session and return a Cookie header.
 */
export async function authCookieHeader(role: Role) {
  const session = await createSession({ user_id: `unit-${role}`, role });
  const setCookie = buildSessionCookie(session.session_id);
  const [cookiePair] = setCookie.split(";");
  return { cookie: cookiePair };
}
