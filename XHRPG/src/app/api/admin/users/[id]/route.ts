import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isSiteOwner } from "@/lib/admin-auth";

const userSelect = {
  id: true,
  username: true,
  nickname: true,
  avatar: true,
  role: true,
  hidden: true,
  banUntil: true,
  muteUntil: true,
  createdAt: true,
} as const;

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      message: "无权访问，请使用站长账号登录",
    },
    { status: 401 }
  );
}

function invalidId(id: number) {
  return !Number.isSafeInteger(id) || id <= 0;
}

function validDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value !== "string") return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date;
}

// 获取用户列表：仅限站长
export async function GET(req: Request) {
  if (!(await isSiteOwner())) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(req.url);
    const keyword = (searchParams.get("keyword") || "").trim();

    const users = await prisma.user.findMany({
      where: keyword
        ? {
            OR: [
              {
                username: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
              {
                nickname: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
              ...( /^[1-9]\d*$/.test(keyword) &&
                  Number.isSafeInteger(Number(keyword))
                ? [{ id: Number(keyword) }]
                : []),
            ],
          }
        : undefined,
      select: userSelect,
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("获取用户失败:", error);

    return NextResponse.json(
      { success: false, message: "获取用户失败" },
      { status: 500 }
    );
  }
}

// 修改用户：仅限站长
export async function PUT(req: Request) {
  if (!(await isSiteOwner())) {
    return unauthorized();
  }

  try {
    const body = await req.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "提交的数据格式错误" },
        { status: 400 }
      );
    }

    const id = Number(body.id);

    if (invalidId(id)) {
      return NextResponse.json(
        { success: false, message: "用户 ID 无效" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    // 站长账号不可通过用户管理接口修改
    if (targetUser.role === "owner") {
      return NextResponse.json(
        { success: false, message: "站长账号不可修改" },
        { status: 403 }
      );
    }

    // 修改角色
    if (body.type === "role") {
      if (!["user", "admin"].includes(body.role)) {
        return NextResponse.json(
          { success: false, message: "不允许设置该角色" },
          { status: 400 }
        );
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role: body.role },
        select: userSelect,
      });

      return NextResponse.json({ success: true, user });
    }

    // 强制修改昵称：只能由经过服务器验证的站长执行
    if (body.type === "nickname") {
      const nickname =
        typeof body.nickname === "string"
          ? body.nickname.trim()
          : "";

      if (!nickname) {
        return NextResponse.json(
          { success: false, message: "昵称不能为空" },
          { status: 400 }
        );
      }

      if (nickname.length > 20) {
        return NextResponse.json(
          { success: false, message: "昵称最多20个字符" },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findUnique({
        where: { nickname },
        select: { id: true },
      });

      if (existing && existing.id !== id) {
        return NextResponse.json(
          { success: false, message: "该昵称已经存在" },
          { status: 409 }
        );
      }

      const user = await prisma.user.update({
        where: { id },
        data: { nickname },
        select: userSelect,
      });

      return NextResponse.json({ success: true, user });
    }

    // 修改封禁、禁言和隐藏状态
    const data: {
      banUntil?: Date | null;
      muteUntil?: Date | null;
      hidden?: boolean;
    } = {};

    if (body.banUntil !== undefined) {
      const date = validDate(body.banUntil);

      if (date === undefined) {
        return NextResponse.json(
          { success: false, message: "封禁时间格式无效" },
          { status: 400 }
        );
      }

      data.banUntil = date;
    }

    if (body.muteUntil !== undefined) {
      const date = validDate(body.muteUntil);

      if (date === undefined) {
        return NextResponse.json(
          { success: false, message: "禁言时间格式无效" },
          { status: 400 }
        );
      }

      data.muteUntil = date;
    }

    if (body.hidden !== undefined) {
      if (typeof body.hidden !== "boolean") {
        return NextResponse.json(
          { success: false, message: "hidden 必须是布尔值" },
          { status: 400 }
        );
      }

      data.hidden = body.hidden;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, message: "没有可修改的有效字段" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("修改用户失败:", error);

    return NextResponse.json(
      { success: false, message: "修改用户失败" },
      { status: 500 }
    );
  }
}

// 删除用户：仅限站长
export async function DELETE(req: Request) {
  if (!(await isSiteOwner())) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get("id");

    if (!rawId || !/^[1-9]\d*$/.test(rawId)) {
      return NextResponse.json(
        { success: false, message: "用户 ID 无效" },
        { status: 400 }
      );
    }

    const id = Number(rawId);

    if (invalidId(id)) {
      return NextResponse.json(
        { success: false, message: "用户 ID 无效" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    if (user.role === "owner") {
      return NextResponse.json(
        { success: false, message: "站长账号不可删除" },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除用户失败:", error);

    return NextResponse.json(
      { success: false, message: "删除失败" },
      { status: 500 }
    );
  }
}
