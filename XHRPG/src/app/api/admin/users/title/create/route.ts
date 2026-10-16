import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function validColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function validBorder(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) {
    return false;
  }

  if (value === "none") return true;

  return /^\d{1,3}px\s+(solid|dashed|dotted|double)\s+(#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,20})$/.test(
    value
  );
}

function validShadow(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) {
    return false;
  }

  if (value === "") return true;

  return /^-?\d{1,3}px\s+-?\d{1,3}px\s+\d{1,3}px(?:\s+-?\d{1,3}px)?\s+(#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,20})$/.test(
    value
  );
}

export async function POST(req: Request) {
  try {
    // 必须由服务端验证站长身份
    if (!(await isSiteOwner())) {
      return errorResponse("未登录或没有站长权限", 403);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return errorResponse("请求数据不是有效的 JSON", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("请求数据格式错误", 400);
    }

    const data = body as Record<string, unknown>;

    const name =
      typeof data.name === "string" ? data.name.trim() : "";

    if (!name) {
      return errorResponse("称号名称不能为空", 400);
    }

    if (name.length > 30) {
      return errorResponse("称号名称不能超过 30 个字符", 400);
    }

    const color = data.color ?? "#ffffff";
    const background = data.background ?? "#333333";
    const border = data.border ?? "none";
    const shadow = data.shadow ?? "";
    const size = data.size ?? 14;

    if (!validColor(color)) {
      return errorResponse("文字颜色格式无效", 400);
    }

    if (!validColor(background)) {
      return errorResponse("背景颜色格式无效", 400);
    }

    if (!validBorder(border)) {
      return errorResponse("边框格式无效", 400);
    }

    if (!validShadow(shadow)) {
      return errorResponse("阴影格式无效", 400);
    }

    if (
      typeof size !== "number" ||
      !Number.isInteger(size) ||
      size < 8 ||
      size > 72
    ) {
      return errorResponse("字号必须是 8 到 72 之间的整数", 400);
    }

    const exists = await prisma.userTitle.findUnique({
      where: { name },
      select: { id: true },
    });

    if (exists) {
      return errorResponse("该称号已经存在", 409);
    }

    const title = await prisma.userTitle.create({
      data: {
        name,
        color,
        background,
        border,
        shadow: shadow || null,
        size,
      },
    });

    return NextResponse.json({
      success: true,
      message: "称号创建成功",
      title,
    });
  } catch (error) {
    console.error("创建称号失败:", error);

    // 并发请求可能同时通过重复名称检查
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return errorResponse("该称号已经存在", 409);
    }

    return errorResponse("创建称号失败，请稍后重试", 500);
  }
}
