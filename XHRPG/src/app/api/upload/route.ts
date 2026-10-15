// src/app/api/upload/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function isValidImage(bytes: Buffer, ext: string): boolean {
  const isPng =
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );

  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  const isWebp =
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";

  return (
    (ext === "png" && isPng) ||
    (ext === "jpg" && isJpeg) ||
    (ext === "webp" && isWebp)
  );
}

export async function POST(req: Request) {
  try {
    // 1. 管理员鉴权：需与你项目实际的 Auth.js 配置一致
    const session = await auth();

    if (!session?.user) {
      return jsonError("请先登录管理员账号", 401);
    }

    // 重要：登录用户不一定是管理员。
    // 请按你项目实际的角色字段检查管理员权限。
    const user = session.user as typeof session.user & {
      role?: string;
      isAdmin?: boolean;
    };

    if (user.role !== "admin" && user.isAdmin !== true) {
      return jsonError("没有管理员上传权限", 403);
    }

    // 2. 检查服务端环境变量
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";

    if (!token || !owner || !repo) {
      return jsonError("图片存储服务尚未配置", 500);
    }

    // 3. 读取表单
    const formData = await req.formData();
    const file = formData.get("file");
    const id = formData.get("id");

    if (
      !(file instanceof File) ||
      typeof id !== "string" ||
      !/^[1-9]\d*$/.test(id)
    ) {
      return jsonError("缺少有效的图片文件或游戏 ID", 400);
    }

    // 4. 校验大小和 MIME 类型
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return jsonError("图片不能为空，且不能超过 5 MB", 400);
    }

    const ext = MIME_EXTENSIONS[file.type];

    if (!ext) {
      return jsonError("只支持 PNG、JPG、WebP 图片", 415);
    }

    // 5. 确认该游戏确实存在
    const gameId = Number(id);

    if (!Number.isSafeInteger(gameId) || gameId <= 0) {
      return jsonError("游戏 ID 无效", 400);
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true },
    });

    if (!game) {
      return jsonError("该游戏不存在，请先创建游戏记录", 404);
    }

    // 6. 校验真实文件签名
    const bytes = Buffer.from(await file.arrayBuffer());

    if (
      bytes.length === 0 ||
      bytes.length > MAX_FILE_SIZE ||
      !isValidImage(bytes, ext)
    ) {
      return jsonError("文件内容与图片格式不匹配", 400);
    }

    // 7. 固定文件路径，不允许用户传入路径
    const filename = `games${gameId}.${ext}`;
    const repoPath = `games/${filename}`;

    const apiUrl =
      `https://api.github.com/repos/` +
      `${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/contents/` +
      repoPath.split("/").map(encodeURIComponent).join("/");

    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // 8. 查询同名文件，存在时获取 SHA 以便更新
    const existingResponse = await fetch(apiUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    let existingSha: string | undefined;

    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      existingSha = existing.sha;
    } else if (existingResponse.status !== 404) {
      console.error(
        "GitHub 查询文件失败:",
        existingResponse.status
      );

      return jsonError(
        "无法检查 GitHub 文件，请检查 Token、仓库权限和分支配置",
        502
      );
    }

    // 9. 上传或更新 GitHub 仓库中的图片
    const payload: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message: `Upload game cover ${filename}`,
      content: bytes.toString("base64"),
      branch,
    };

    if (existingSha) {
      payload.sha = existingSha;
    }

    const uploadResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();

      // 不记录 Token 或请求头
      console.error(
        "GitHub 上传失败:",
        uploadResponse.status,
        errorText.slice(0, 500)
      );

      if (
        uploadResponse.status === 401 ||
        uploadResponse.status === 403
      ) {
        return jsonError("GitHub Token 无效或缺少仓库写入权限", 502);
      }

      if (uploadResponse.status === 404) {
        return jsonError("找不到目标仓库或分支，请检查环境变量", 502);
      }

      if (
        uploadResponse.status === 409 ||
        uploadResponse.status === 422
      ) {
        return jsonError("GitHub 文件更新冲突，请稍后重试", 502);
      }

      return jsonError("GitHub 图片上传失败", 502);
    }

    // 10. 返回 Raw 图片地址
    const url =
      `https://raw.githubusercontent.com/` +
      `${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/` +
      `${encodeURIComponent(branch)}/` +
      repoPath.split("/").map(encodeURIComponent).join("/");

    return NextResponse.json({
      success: true,
      url,
      filename,
      gameId,
    });
  } catch (error) {
    console.error(
      "图片上传异常:",
      error instanceof Error ? error.message : "未知错误"
    );

    return jsonError("图片上传失败，请检查服务配置和服务日志", 500);
  }
}
