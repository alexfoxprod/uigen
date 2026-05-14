// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const mockCookieSet = vi.fn();
const mockCookieDelete = vi.fn();
let mockCookieGetValue: string | undefined;

const mockCookieStore = {
  set: mockCookieSet,
  delete: mockCookieDelete,
  get: (name: string) =>
    name === "auth-token" && mockCookieGetValue
      ? { value: mockCookieGetValue }
      : undefined,
};

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function mintToken(
  userId: string,
  email: string,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT({ userId, email, expiresAt: new Date() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGetValue = undefined;
  });

  test("sets an httpOnly cookie named auth-token", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    expect(mockCookieSet).toHaveBeenCalledOnce();
    const [name, , options] = mockCookieSet.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
  });

  test("cookie has lax sameSite and root path", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie expires approximately 7 days from now", async () => {
    const before = Date.now();
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieSet.mock.calls[0];
    const expires: Date = options.expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("cookie value is a valid JWT containing userId and email", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    const [, token] = mockCookieSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
  });

  test("JWT uses HS256 algorithm", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    const [, token] = mockCookieSet.mock.calls[0];
    const header = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString()
    );
    expect(header.alg).toBe("HS256");
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGetValue = undefined;
  });

  test("returns null when no cookie is present", async () => {
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    mockCookieGetValue = await mintToken("user-42", "hello@example.com");

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-42");
    expect(session?.email).toBe("hello@example.com");
  });

  test("returns null for an expired token", async () => {
    mockCookieGetValue = await mintToken("user-42", "hello@example.com", "-1s");

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    const validToken = await mintToken("user-42", "hello@example.com");
    mockCookieGetValue = validToken + "tampered";

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("deletes the auth-token cookie", async () => {
    const { deleteSession } = await import("@/lib/auth");
    await deleteSession();

    expect(mockCookieDelete).toHaveBeenCalledOnce();
    expect(mockCookieDelete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  function makeRequest(token?: string): NextRequest {
    const req = new NextRequest("http://localhost/api/test");
    if (token) {
      req.cookies.set("auth-token", token);
    }
    return req;
  }

  test("returns null when no cookie is present", async () => {
    const { verifySession } = await import("@/lib/auth");
    const session = await verifySession(makeRequest());
    expect(session).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    const token = await mintToken("user-99", "verify@example.com");

    const { verifySession } = await import("@/lib/auth");
    const session = await verifySession(makeRequest(token));

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("verify@example.com");
  });

  test("returns null for an expired token", async () => {
    const token = await mintToken("user-99", "verify@example.com", "-1s");

    const { verifySession } = await import("@/lib/auth");
    const session = await verifySession(makeRequest(token));

    expect(session).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    const token = await mintToken("user-99", "verify@example.com");

    const { verifySession } = await import("@/lib/auth");
    const session = await verifySession(makeRequest(token + "bad"));

    expect(session).toBeNull();
  });
});
