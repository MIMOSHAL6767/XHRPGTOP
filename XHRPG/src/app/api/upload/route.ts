import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    // Use the same GitHub image-storage variables as the banner uploader,
    // while retaining compatibility with the original GITHUB_* names.
    const token = process.env.GITHUB_IMAGE_TOKEN || process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_IMAGE_OWNER || process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_IMAGE_REPO || process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_IMAGE_BRANCH || process.env.GITHUB_BRANCH || "main";

    if (!token || !owner || !repo) {
      return errorResponse("GitHub 图片存储服务未配置", 500);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const id = formData.get("id");

    if (
      !(file instanceof File) ||
      typeof id !== "string" ||
      !/^[1-9]\d*$/.test(id)
    ) {
      return errorResponse("缺少有效的图片文件或游戏 ID", 400);
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return errorResponse("图片不能为空，且不能超过 5 MB", 400);
    }

    const ext = MIME_EXTENSIONS[file.type];

    if (!ext) {
      return errorResponse("只支持 PNG、JPG、WebP 图片", 415);
    }

    const gameId = Number(id);

    if (!Number.isSafeInteger(gameId)) {
      return errorResponse("游戏 ID 无效", 400);
    }

    // 确认游戏已经创建
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true },
    });

    if (!game) {
      return errorResponse("游戏记录不存在，请先创建游戏", 404);
    }

    // 检查文件真实签名
    const bytes = Buffer.from(await file.arrayBuffer());

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

    const valid =
      (ext === "png" && isPng) ||
      (ext === "jpg" && isJpeg) ||
      (ext === "webp" && isWebp);

    if (!valid) {
      return errorResponse("文件内容与图片格式不匹配", 400);
    }

    // 文件名由游戏 ID 自动生成
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

    // 查询同名文件：更新时必须提供已有文件的 SHA
    const existingResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    let sha: string | undefined;

    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      sha = existing.sha;
    } else if (existingResponse.status !== 404) {
      console.error(
        "GitHub 文件查询失败:",
        existingResponse.status
      );

      return errorResponse(
        "无法读取 GitHub 文件，请检查 Token、仓库权限和分支",
        502
      );
    }

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

    if (sha) {
      payload.sha = sha;
    }

    // 上传新图片或更新已有图片
    const uploadResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const uploadResult = await uploadResponse.json().catch(() => null);

    if (!uploadResponse.ok) {
      console.error(
        "GitHub 图片上传失败:",
        uploadResponse.status,
        typeof uploadResult?.message === "string"
          ? uploadResult.message
          : "GitHub API returned an error"
      );

      return errorResponse(
        uploadResponse.status === 401 ||
          uploadResponse.status === 403
          ? "GitHub Token 无效或没有仓库写入权限"
          : uploadResponse.status === 404
            ? "找不到 GitHub 仓库或分支"
            : uploadResponse.status === 409 ||
                uploadResponse.status === 422
              ? "GitHub 文件更新冲突，请重试"
              : "GitHub 图片上传失败",
        502
      );
    }

    // GitHub must confirm that the requested path was actually committed.
    if (uploadResult?.content?.path !== repoPath || !uploadResult?.content?.sha) {
      console.error("GitHub 返回成功状态，但响应中没有预期的文件路径或 SHA");
      return errorResponse("GitHub 未确认封面文件已保存，请重试", 502);
    }

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
      path: repoPath,
      commit: uploadResult?.commit?.sha || null,
    });
  } catch (error) {
    console.error(
      "图片上传异常:",
      error instanceof Error ? error.message : "未知错误"
    );

    return errorResponse("图片上传失败，请检查服务日志", 500);
  }
}
