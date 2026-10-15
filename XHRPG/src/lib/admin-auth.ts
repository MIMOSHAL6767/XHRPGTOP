typescript
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
    const secret = process.env.JWT_SECRET;

    // 生产环境必须配置足够强的新密钥
    if (!secret || secret.length < 32) {
      console.error("JWT_SECRET 未配置或长度不足");
      return null;
    }

    const token = (await cookies()).get("token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ["HS256"],
      }
    );

    // 必须同时满足指定用户 ID 和 owner 角色
    if (
      String(payload.id) !== "1" ||
      payload.role !== "owner"
    ) {
      return null;
    }

    return payload as OwnerPayload;
  } catch {
    // Cookie 缺失、令牌无效或已过期时均视为未登录
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
