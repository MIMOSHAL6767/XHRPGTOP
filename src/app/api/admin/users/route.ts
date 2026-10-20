import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isSiteOwner } from "@/lib/admin-auth";

// 获取用户列表：仅限站长
export async function GET(req: Request) {
  if (!(await isSiteOwner())) {
    return NextResponse.json(
      { success: false, message: "无权访问，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") || "";

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
              ...(Number.isInteger(Number(keyword)) &&
              keyword.trim() !== ""
                ? [{ id: Number(keyword) }]
                : []),
            ],
          }
        : undefined,
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
        hidden: true,
        banUntil: true,
        muteUntil: true,
        createdAt: true,
      },
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
    return NextResponse.json(
      { success: false, message: "无权操作，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "用户ID错误" },
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

    // 保护站长账号
    if (targetUser.role === "owner") {
      return NextResponse.json(
        { success: false, message: "站长账号不可操作" },
        { status: 403 }
      );
    }

    // 修改用户角色
    if (body.type === "role") {
      // 仅允许设置为项目已有的普通用户或管理员角色
      if (!["user", "admin"].includes(body.role)) {
        return NextResponse.json(
          { success: false, message: "不允许设置此角色" },
          { status: 400 }
        );
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role: body.role },
      });

      return NextResponse.json({ success: true, user });
    }

    // 修改用户昵称
    if (body.type === "nickname") {
      const nickname = String(body.nickname || "").trim();

      if (!nickname) {
        return NextResponse.json(
          { success: false, message: "昵称不能为空" },
          { status: 400 }
        );
      }

      const exist = await prisma.user.findUnique({
        where: { nickname },
      });

      if (exist && exist.id !== id) {
        return NextResponse.json(
          { success: false, message: "昵称已经被使用" },
          { status: 409 }
        );
      }

      const user = await prisma.user.update({
        where: { id },
        data: { nickname },
      });

      return NextResponse.json({ success: true, user });
    }

    // 封禁、禁言、隐藏用户
    const data: {
      banUntil?: Date | null;
      muteUntil?: Date | null;
      hidden?: boolean;
    } = {};

    if (body.banUntil !== undefined) {
      if (body.banUntil === null || body.banUntil === "") {
        data.banUntil = null;
      } else {
        const date = new Date(body.banUntil);

        if (Number.isNaN(date.getTime())) {
          return NextResponse.json(
            { success: false, message: "封禁时间格式错误" },
            { status: 400 }
          );
        }

        data.banUntil = date;
      }
    }

    if (body.muteUntil !== undefined) {
      if (body.muteUntil === null || body.muteUntil === "") {
        data.muteUntil = null;
      } else {
        const date = new Date(body.muteUntil);

        if (Number.isNaN(date.getTime())) {
          return NextResponse.json(
            { success: false, message: "禁言时间格式错误" },
            { status: 400 }
          );
        }

        data.muteUntil = date;
      }
    }

    if (body.hidden !== undefined) {
      if (typeof body.hidden !== "boolean") {
        return NextResponse.json(
          { success: false, message: "隐藏状态格式错误" },
          { status: 400 }
        );
      }

      data.hidden = body.hidden;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, message: "没有可修改的内容" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("修改用户失败:", error);

    return NextResponse.json(
      { success: false, message: "修改失败" },
      { status: 500 }
    );
  }
}

// 删除用户：仅限站长
export async function DELETE(req: Request) {
  if (!(await isSiteOwner())) {
    return NextResponse.json(
      { success: false, message: "无权操作，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "缺少有效用户ID" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
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
