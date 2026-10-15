
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, type JWTPayload } from "jose";

type OwnerPayload = JWTPayload & {
  id?: number | string;
  role?: string;
  username?: string;
};

export async function getOwnerPayload(): Promise<OwnerPayload | null> {
  try {
    const secret =
      process.env.JWT_SECRET || "xhrpg-secret";

    const token = (await cookies()).get("token")?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] }
    );

    if (
      String(payload.id) !== "1" ||
      payload.role !== "owner"
    ) {
      return null;
    }

    return payload as OwnerPayload;
  } catch {
    return null;
  }
}

export async function requireOwnerPage(): Promise<OwnerPayload> {
  const payload = await getOwnerPayload();

  if (!payload) {
    redirect("/login");
  }

  return payload;
}

export async function isSiteOwner(): Promise<boolean> {
  return (await getOwnerPayload()) !== null;
}
