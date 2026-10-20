import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

type UploadKind =
  | "cover"
  | "background"
  | "logo"
  | "screenshot"
  | "homeHeader";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function POST(req: Request) {
  // 仅允许站长上传
  if (!(await isSiteOwner())) {
    return errorResponse("无权上传图片，请使用站长账号登录", 401);
  }

  try {
    // GitHub 图片仓库配置
    const token =
      process.env.GITHUB_IMAGE_TOKEN || process.env.GITHUB_TOKEN;

    const owner =
      process.env.GITHUB_IMAGE_OWNER || process.env.GITHUB_OWNER;

    const repo =
      process.env.GITHUB_IMAGE_REPO || process.env.GITHUB_REPO;

    const branch =
      process.env.GITHUB_IMAGE_BRANCH ||
      process.env.GITHUB_BRANCH ||
      "main";

    if (!token || !owner || !repo) {
      return errorResponse("GitHub 图片存储服务未配置", 500);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const id = formData.get("id");
    const rawKind = formData.get("kind");

    // 兼容旧后台：没有 kind 时默认上传游戏封面
    const allowedKinds: UploadKind[] = [
      "cover",
      "background",
      "logo",
      "screenshot",
      "homeHeader",
    ];

    let kind: UploadKind;

    if (rawKind === null || rawKind === "") {
      kind = "cover";
    } else if (
      typeof rawKind === "string" &&
      allowedKinds.includes(rawKind as UploadKind)
    ) {
      kind = rawKind as UploadKind;
    } else {
      return errorResponse("不支持的图片用途", 400);
    }

    // 验证上传文件
    if (!(file instanceof File)) {
      return errorResponse("缺少图片文件", 400);
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return errorResponse("图片不能为空，且不能超过 5 MB", 400);
    }

    const ext = MIME_EXTENSIONS[file.type];

    if (!ext) {
      return errorResponse("只支持 PNG、JPG、WebP 图片", 415);
    }

    // 首页头图不绑定游戏 ID，其他用途必须绑定已存在的游戏
    let gameId: number | null = null;

    if (kind !== "homeHeader") {
      if (
        typeof id !== "string" ||
        !/^[1-9]\d*$/.test(id)
      ) {
        return errorResponse("缺少有效的游戏 ID", 400);
      }

      gameId = Number(id);

      if (!Number.isSafeInteger(gameId)) {
        return errorResponse("游戏 ID 无效", 400);
      }

      const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { id: true },
      });

      if (!game) {
        return errorResponse("游戏记录不存在，请先创建游戏", 404);
      }
    }

    // 验证文件的真实格式，防止仅修改 MIME 类型
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

    // 预览图序号校验
    const rawSlot = formData.get("slot");
    let slot = 0;

    if (kind === "screenshot") {
      if (
        typeof rawSlot !== "string" ||
        !/^[1-9]\d*$/.test(rawSlot)
      ) {
        return errorResponse(
          "预览图必须提供有效的 slot 编号",
          400
        );
      }

      slot = Number(rawSlot);

      if (!Number.isSafeInteger(slot) || slot > 100) {
        return errorResponse(
          "预览图编号必须在 1 到 100 之间",
          400
        );
      }
    }

    // 根据用途选择目录和文件名
    let directory: string;
    let filename: string;

    switch (kind) {
      case "cover":
        // 保持原有游戏封面路径不变
        directory = "games";
        filename = `games${gameId}.${ext}`;
        break;

      case "background":
        directory = "game-details/backgrounds";
        filename = `games${gameId}-background.${ext}`;
        break;

      case "logo":
        directory = "game-details/logos";
        filename = `games${gameId}-logo.${ext}`;
        break;

      case "screenshot":
        directory = "game-details/screenshots";
        filename = `games${gameId}-preview-${slot}.${ext}`;
        break;

      case "homeHeader":
        // 独立的首页头图，不参与 Banner 轮播
        directory = "home";
        filename = `header.${ext}`;
        break;
    }

    // GitHub 仓库内的完整路径
    const repoPath = `${directory}/${filename}`;

    const apiUrl =
      `https://api.github.com/repos/` +
      `${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/contents/` +
      repoPath
        .split("/")
        .map(encodeURIComponent)
        .join("/");

    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // 查询文件是否存在；存在则获取 SHA，以便覆盖更新
    const existingResponse = await fetch(
      `${apiUrl}?ref=${encodeURIComponent(branch)}`,
      {
        headers,
        cache: "no-store",
      }
    );

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
      message: `Upload ${kind}: ${filename}`,
      content: bytes.toString("base64"),
      branch,
    };

    if (sha) {
      payload.sha = sha;
    }

    // 上传或更新 GitHub 文件
    const uploadResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const uploadResult = await uploadResponse
      .json()
      .catch(() => null);

    if (!uploadResponse.ok) {
      console.error(
        "GitHub 图片上传失败:",
        uploadResponse.status,
        uploadResult?.message
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

    // 确认 GitHub 已保存目标文件
    if (
      uploadResult?.content?.path !== repoPath ||
      !uploadResult?.content?.sha
    ) {
      return errorResponse(
        "GitHub 未确认图片文件已保存",
        502
      );
    }

    // 返回可供前台使用的 Raw 图片地址
    const url =
      `https://raw.githubusercontent.com/` +
      `${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/` +
      `${encodeURIComponent(branch)}/` +
      repoPath
        .split("/")
        .map(encodeURIComponent)
        .join("/");

    return NextResponse.json({
      success: true,
      url,
      filename,
      gameId,
      kind,
      slot: kind === "screenshot" ? slot : null,
      path: repoPath,
      commit: uploadResult?.commit?.sha || null,
    });
  } catch (error) {
    console.error(
      "图片上传异常:",
      error instanceof Error ? error.message : "未知错误"
    );

    return errorResponse(
      "图片上传失败，请检查服务日志",
      500
    );
  }
}