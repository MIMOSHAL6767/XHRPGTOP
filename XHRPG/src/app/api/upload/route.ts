
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const GIF_MAX_SIZE = 15 * 1024 * 1024;
const MUSIC_MAX_SIZE = 15 * 1024 * 1024;

type UploadKind =
  | "cover"
  | "background"
  | "logo"
  | "screenshot"
  | "homeHeader"
  | "siteBackground"
  | "floatingGif"
  | "music";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

const MUSIC_EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/x-mp3": "mp3",
  "audio/ogg": "ogg",
  "application/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/vnd.wave": "wav",
  "audio/vnd.wav": "wav",
};

const REPLACEABLE_IMAGE_KINDS: UploadKind[] = [
  "cover",
  "background",
  "logo",
  "screenshot",
  "homeHeader",
];

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message, error: message },
    { status }
  );
}

function validImage(bytes: Buffer, ext: string): boolean {
  const png =
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );

  const jpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  const webp =
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";

  return (
    (ext === "png" && png) ||
    (ext === "jpg" && jpeg) ||
    (ext === "webp" && webp)
  );
}

function validGif(bytes: Buffer): boolean {
  if (bytes.length < 13) return false;

  const signature = bytes.toString("ascii", 0, 6);

  return signature === "GIF87a" || signature === "GIF89a";
}

function validMusic(bytes: Buffer, ext: string): boolean {
  if (ext === "mp3") {
    const hasId3 =
      bytes.length >= 3 &&
      bytes.toString("ascii", 0, 3) === "ID3";

    const hasFrameSync =
      bytes.length >= 2 &&
      bytes[0] === 0xff &&
      (bytes[1] & 0xe0) === 0xe0;

    return hasId3 || hasFrameSync;
  }

  if (ext === "ogg") {
    return (
      bytes.length >= 4 &&
      bytes.toString("ascii", 0, 4) === "OggS"
    );
  }

  if (ext === "wav") {
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WAVE"
    );
  }

  return false;
}

function getGitHubConfig() {
  const token =
    process.env.GITHUB_IMAGE_TOKEN ||
    process.env.GITHUB_TOKEN;

  const owner =
    process.env.GITHUB_IMAGE_OWNER ||
    process.env.GITHUB_OWNER;

  const repo =
    process.env.GITHUB_IMAGE_REPO ||
    process.env.GITHUB_REPO;

  const branch =
    process.env.GITHUB_IMAGE_BRANCH ||
    process.env.GITHUB_BRANCH ||
    "main";

  if (!token || !owner || !repo) {
    return null;
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  return {
    token,
    owner,
    repo,
    branch,
    headers,
  };
}

function getGitHubContentsUrl(
  owner: string,
  repo: string,
  repoPath: string
) {
  return (
    `https://api.github.com/repos/` +
    `${encodeURIComponent(owner)}/` +
    `${encodeURIComponent(repo)}/contents/` +
    repoPath
      .split("/")
      .map(encodeURIComponent)
      .join("/")
  );
}

/**
 * 删除同一资源的旧图片扩展名文件。
 *
 * 只会尝试删除同目录、同文件名主体的 PNG/JPG/WebP。
 * 例如 games1.png 替换成 games1.jpg 后，会尝试删除 games1.png。
 * 删除失败只记录日志，不影响新图片的上传结果。
 */
async function deleteReplacedImageExtensions(args: {
  owner: string;
  repo: string;
  branch: string;
  headers: Record<string, string>;
  directory: string;
  filename: string;
  currentExtension: string;
}) {
  const {
    owner,
    repo,
    branch,
    headers,
    directory,
    filename,
    currentExtension,
  } = args;

  const lastDot = filename.lastIndexOf(".");
  const filenameWithoutExt =
    lastDot >= 0 ? filename.slice(0, lastDot) : filename;

  const oldExtensions = ["png", "jpg", "webp"].filter(
    (extension) => extension !== currentExtension
  );

  for (const oldExt of oldExtensions) {
    const oldPath =
      `${directory}/${filenameWithoutExt}.${oldExt}`;

    const oldApiUrl = getGitHubContentsUrl(
      owner,
      repo,
      oldPath
    );

    try {
      const oldResponse = await fetch(
        `${oldApiUrl}?ref=${encodeURIComponent(branch)}`,
        {
          headers,
          cache: "no-store",
        }
      );

      if (oldResponse.status === 404) {
        continue;
      }

      if (!oldResponse.ok) {
        console.error(
          "查询旧图片失败:",
          oldPath,
          oldResponse.status
        );
        continue;
      }

      const oldFile: unknown = await oldResponse.json();

      if (
        typeof oldFile !== "object" ||
        oldFile === null ||
        !("sha" in oldFile) ||
        typeof oldFile.sha !== "string"
      ) {
        console.error("旧图片缺少有效 SHA:", oldPath);
        continue;
      }

      const deleteResponse = await fetch(oldApiUrl, {
        method: "DELETE",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Remove replaced image: ${oldPath}`,
          sha: oldFile.sha,
          branch,
        }),
        cache: "no-store",
      });

      if (!deleteResponse.ok) {
        const deleteResult = await deleteResponse
          .json()
          .catch(() => null);

        console.error(
          "删除旧图片失败:",
          oldPath,
          deleteResponse.status,
          deleteResult?.message
        );
      }
    } catch (error) {
      console.error(
        "清理旧图片时发生异常:",
        oldPath,
        error instanceof Error
          ? error.message
          : "未知错误"
      );
    }
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const id = formData.get("id");

    // 兼容 kind 和旧组件使用的 type 字段。
    const rawKind = formData.get("kind");
    const rawType = formData.get("type");
    const suppliedKind = rawKind ?? rawType;

    const allowedKinds: UploadKind[] = [
      "cover",
      "background",
      "logo",
      "screenshot",
      "homeHeader",
      "siteBackground",
      "floatingGif",
      "music",
    ];

    let kind: UploadKind;

    if (suppliedKind === null || suppliedKind === "") {
      kind = "cover";
    } else if (
      typeof suppliedKind === "string" &&
      allowedKinds.includes(suppliedKind as UploadKind)
    ) {
      kind = suppliedKind as UploadKind;
    } else {
      return errorResponse("不支持的文件用途", 400);
    }

    if (!(file instanceof File)) {
      return errorResponse("缺少上传文件", 400);
    }

    const isOwner = await isSiteOwner();

    // 普通投稿用户只能上传自己游戏的图片。
    if (
      !isOwner &&
      !["cover", "background", "logo", "screenshot"].includes(kind)
    ) {
      return errorResponse("无权上传此类文件", 403);
    }

    const isGif = kind === "floatingGif";
    const isMusic = kind === "music";

    const maxSize = isMusic
      ? MUSIC_MAX_SIZE
      : isGif
        ? GIF_MAX_SIZE
        : IMAGE_MAX_SIZE;

    if (file.size === 0 || file.size > maxSize) {
      const limit = isMusic || isGif ? "15 MB" : "5 MB";

      return errorResponse(
        `文件不能为空，且不能超过 ${limit}`,
        400
      );
    }

    let ext: string | undefined;

    if (isMusic) {
      ext = MUSIC_EXTENSIONS[file.type.toLowerCase()];
    } else if (isGif) {
      if (file.type.toLowerCase() === "image/gif") {
        ext = "gif";
      }
    } else {
      ext = IMAGE_EXTENSIONS[file.type.toLowerCase()];
    }

    if (!ext) {
      return errorResponse(
        isMusic
          ? "音乐只支持 MP3、OGG、WAV 格式，请检查文件类型"
          : isGif
            ? "悬浮动画只支持 GIF 格式"
            : "图片只支持 PNG、JPG、WebP",
        415
      );
    }

    // 网站级资源不需要游戏 ID。
    const needsGameId =
      kind !== "homeHeader" &&
      kind !== "siteBackground" &&
      kind !== "floatingGif" &&
      kind !== "music";

    let gameId: number | null = null;

    if (needsGameId) {
      if (isOwner) {
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
          return errorResponse(
            "游戏记录不存在，请先创建游戏",
            404
          );
        }
      } else {
        const credential = formData.get("credential");

        if (
          typeof credential !== "string" ||
          !/^[a-f0-9]{48}$/i.test(credential)
        ) {
          return errorResponse(
            "缺少有效的投稿凭证，请重新验证身份",
            401
          );
        }

        // 通过凭证定位游戏，不信任客户端传来的游戏 ID。
        const game = await prisma.game.findFirst({
          where: {
            submissionCredential: credential,
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (!game) {
          return errorResponse(
            "投稿凭证无效或已失效，请检查凭证",
            401
          );
        }

        // 与资料编辑 API 使用相同的状态规则。
        if (
          game.status !== "已发布" &&
          game.status !== "未通过"
        ) {
          return errorResponse(
            game.status === "审核中"
              ? "游戏正在审核中，暂时不能替换图片。"
              : "当前游戏状态不允许投稿用户上传图片。",
            403
          );
        }

        gameId = game.id;
      }
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const valid = isMusic
      ? validMusic(bytes, ext)
      : isGif
        ? validGif(bytes)
        : validImage(bytes, ext);

    if (!valid) {
      return errorResponse(
        "文件内容与所选文件格式不匹配，请确认文件没有损坏",
        400
      );
    }

    // 校验游戏详情预览图编号。
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

    let directory: string;
    let filename: string;

    switch (kind) {
      case "cover":
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
        directory = "home";
        filename = `header.${ext}`;
        break;

      case "siteBackground":
        directory = "backgrounds";
        filename = `site-background-${randomUUID()}.${ext}`;
        break;

      case "floatingGif":
        directory = "floating";
        filename = `floating-${randomUUID()}.gif`;
        break;

      case "music":
        directory = "music";
        filename = `track-${randomUUID()}.${ext}`;
        break;
    }

    const repoPath = `${directory}/${filename}`;

    const github = getGitHubConfig();

    if (!github) {
      return errorResponse(
        "GitHub 文件存储服务未配置",
        500
      );
    }

    const {
      owner,
      repo,
      branch,
      headers,
    } = github;

    const apiUrl = getGitHubContentsUrl(
      owner,
      repo,
      repoPath
    );

    // 读取同名文件，取得 SHA 后才能覆盖。
    let sha: string | undefined;

    const existingResponse = await fetch(
      `${apiUrl}?ref=${encodeURIComponent(branch)}`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (existingResponse.ok) {
      const existing: unknown = await existingResponse.json();

      if (
        typeof existing === "object" &&
        existing !== null &&
        "sha" in existing &&
        typeof existing.sha === "string"
      ) {
        sha = existing.sha;
      }
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
        "GitHub 文件上传失败:",
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
              : "GitHub 文件上传失败",
        502
      );
    }

    if (
      uploadResult?.content?.path !== repoPath ||
      !uploadResult?.content?.sha
    ) {
      return errorResponse(
        "GitHub 未确认文件已保存",
        502
      );
    }

    // 新图片已确认上传成功后，再清理同用途的旧扩展名文件。
    // 仅处理固定命名的图片，不删除随机命名资源。
    if (
      REPLACEABLE_IMAGE_KINDS.includes(kind) &&
      ["png", "jpg", "webp"].includes(ext)
    ) {
      await deleteReplacedImageExtensions({
        owner,
        repo,
        branch,
        headers,
        directory,
        filename,
        currentExtension: ext,
      });
    }

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
      "文件上传异常:",
      error instanceof Error ? error.message : "未知错误"
    );

    return errorResponse(
      "文件上传失败，请检查服务日志",
      500
    );
  }
}
