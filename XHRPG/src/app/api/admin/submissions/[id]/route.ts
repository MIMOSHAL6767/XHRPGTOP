
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Assets = {
  cover?: unknown;
  background?: unknown;
  logo?: unknown;
  screenshots?: unknown;
  reviewNote?: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function invalidId(id: string) {
  return !/^[1-9]\d*$/.test(id) ||
    !Number.isSafeInteger(Number(id));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function getAssets(value: Prisma.JsonValue | null): Assets {
  return isRecord(value) ? (value as Assets) : {};
}

function getExtension(path: string) {
  const match = path.match(/\.(png|jpg|webp)$/i);
  return match ? match[1].toLowerCase() : null;
}

function validPendingPath(value: unknown, kind: string) {
  if (typeof value !== "string") return false;

  const escapedKind = kind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pattern =
    kind === "screenshot"
      ? "^pending/[0-9a-f-]{36}/screenshot(?:-\\d{1,3})?\\.(png|jpg|webp)$"
      : `^pending/[0-9a-f-]{36}/${escapedKind}\\.(png|jpg|webp)$`;

  return new RegExp(pattern, "i").test(value);
}

function rawImageUrl(owner: string, repo: string, branch: string, path: string) {
  const encodedPath = path
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${encodedPath}`;
}

async function getGitHubConfig() {
  const owner = process.env.GITHUB_OWNER;
  const tempRepo = process.env.GITHUB_TEMP_REPO;
  const tempBranch = process.env.GITHUB_TEMP_BRANCH || "main";
  const imageRepo = process.env.GITHUB_IMAGE_REPO || "XHRPG-Images";
  const imageBranch = process.env.GITHUB_IMAGE_BRANCH || "main";
  const token =
    process.env.GITHUB_TOKEN || process.env.GITHUB_IMAGE_TOKEN;

  if (!owner || !tempRepo || !imageRepo || !token) {
    throw new Error("GitHub 图片仓库环境变量配置不完整");
  }

  return {
    owner,
    tempRepo,
    tempBranch,
    imageRepo,
    imageBranch,
    token,
  };
}

async function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function copyPendingImage(
  sourcePath: string,
  destinationPath: string,
  config: Awaited<ReturnType<typeof getGitHubConfig>>
) {
  const {
    owner,
    tempRepo,
    tempBranch,
    imageRepo,
    imageBranch,
    token,
  } = config;

  const sourceApiPath = sourcePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const sourceResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(tempRepo)}/contents/${sourceApiPath}?ref=${encodeURIComponent(tempBranch)}`,
    {
      headers: await githubHeaders(token),
      cache: "no-store",
    }
  );

  if (!sourceResponse.ok) {
    throw new Error(
      `无法读取临时图片：${sourcePath}（HTTP ${sourceResponse.status}）`
    );
  }

  const sourceFile = await sourceResponse.json() as {
    content?: string;
    encoding?: string;
    download_url?: string | null;
    type?: string;
  };

  if (sourceFile.type !== "file") {
    throw new Error(`临时路径不是文件：${sourcePath}`);
  }

  let fileBuffer: Buffer;

  if (sourceFile.encoding === "base64" && sourceFile.content) {
    fileBuffer = Buffer.from(
      sourceFile.content.replace(/\s/g, ""),
      "base64"
    );
  } else if (sourceFile.download_url) {
    const downloadResponse = await fetch(sourceFile.download_url, {
      headers: await githubHeaders(token),
      cache: "no-store",
    });

    if (!downloadResponse.ok) {
      throw new Error(`下载临时图片失败：${sourcePath}`);
    }

    fileBuffer = Buffer.from(await downloadResponse.arrayBuffer());
  } else {
    throw new Error(`无法读取图片文件内容：${sourcePath}`);
  }

  if (!fileBuffer.length || fileBuffer.length > 5 * 1024 * 1024) {
    throw new Error(`图片大小无效：${sourcePath}`);
  }

  const destinationApiPath = destinationPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const uploadResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(imageRepo)}/contents/${destinationApiPath}`,
    {
      method: "PUT",
      headers: {
        ...(await githubHeaders(token)),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `审核通过：同步投稿图片 ${destinationPath}`,
        branch: imageBranch,
        content: fileBuffer.toString("base64"),
      }),
      cache: "no-store",
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();

    throw new Error(
      `同步图片到正式仓库失败（HTTP ${uploadResponse.status}）：${errorText.slice(0, 300)}`
    );
  }

  return rawImageUrl(owner, imageRepo, imageBranch, destinationPath);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isSiteOwner())) {
    return jsonError("无权访问，请使用站长账号登录", 401);
  }

  try {
    const { id } = await context.params;

    if (invalidId(id)) {
      return jsonError("投稿 ID 无效");
    }

    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return jsonError("提交的数据格式错误");
    }

    const action = body.action;
    const note =
      typeof body.note === "string"
        ? body.note.trim().slice(0, 1000)
        : "";

    const gameId = Number(id);

    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return jsonError("投稿不存在", 404);
    }

    if (game.status !== "审核中") {
      return jsonError("这份投稿已处理，无法重复审核", 409);
    }

    if (action === "reject") {
      if (!note) {
        return jsonError("请填写退回原因");
      }

      const oldAssets = getAssets(game.submissionAssets);

      const updatedAssets: Prisma.InputJsonObject = {
        ...oldAssets,
        reviewNote: note,
      } as Prisma.InputJsonObject;

      const updated = await prisma.game.update({
        where: { id: gameId },
        data: {
          status: "未通过",
          submissionAssets: updatedAssets,
        },
      });

      return NextResponse.json({
        success: true,
        message: "投稿已退回",
        game: updated,
      });
    }

    if (action !== "approve") {
      return jsonError("无效的审核操作");
    }

    const assets = getAssets(game.submissionAssets);
    const coverPath = game.submissionCoverPath;

    if (!coverPath || !validPendingPath(coverPath, "cover")) {
      return jsonError("投稿封面路径无效，无法发布");
    }

    const backgroundPath =
      typeof assets.background === "string" ? assets.background : null;

    const logoPath =
      typeof assets.logo === "string" ? assets.logo : null;

    const screenshotPaths = Array.isArray(assets.screenshots)
      ? assets.screenshots
      : [];

    if (
      backgroundPath &&
      !validPendingPath(backgroundPath, "background")
    ) {
      return jsonError("详情背景路径无效，无法发布");
    }

    if (logoPath && !validPendingPath(logoPath, "logo")) {
      return jsonError("标题图片路径无效，无法发布");
    }

    if (
      screenshotPaths.length > 5 ||
      !screenshotPaths.every(
        (path) =>
          validPendingPath(path, "screenshot")
      )
    ) {
      return jsonError("详情预览图路径无效，无法发布");
    }

    if (
      game.titleMode === "image" &&
      !logoPath
    ) {
      return jsonError("标题模式设置为图片，但投稿没有有效的标题图片");
    }

    const config = await getGitHubConfig();

    // 所有图片先同步到正式仓库，全部成功后才发布游戏。
    const coverExtension = getExtension(coverPath);

    if (!coverExtension) {
      return jsonError("封面文件格式无效");
    }

    const coverUrl = await copyPendingImage(
      coverPath,
      `games/games${game.id}.${coverExtension}`,
      config
    );

    let backgroundUrl: string | null = null;

    if (backgroundPath) {
      const ext = getExtension(backgroundPath);

      if (!ext) throw new Error("详情背景文件格式无效");

      backgroundUrl = await copyPendingImage(
        backgroundPath,
        `games/submissions/${game.id}/background.${ext}`,
        config
      );
    }

    let logoUrl: string | null = null;

    if (logoPath) {
      if (!/\.png$/i.test(logoPath)) {
        return jsonError("标题图片必须是 PNG 格式");
      }

      logoUrl = await copyPendingImage(
        logoPath,
        `games/submissions/${game.id}/logo.png`,
        config
      );
    }

    const screenshotUrls: string[] = [];

    for (let index = 0; index < screenshotPaths.length; index++) {
      const path = screenshotPaths[index] as string;
      const ext = getExtension(path);

      if (!ext) throw new Error("预览图文件格式无效");

      const url = await copyPendingImage(
        path,
        `games/submissions/${game.id}/screenshots/${String(index + 1).padStart(3, "0")}.${ext}`,
        config
      );

      screenshotUrls.push(url);
    }

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: {
        cover: coverUrl,
        titleLogo: logoUrl,
        detailBackground: backgroundUrl,
        screenshots: screenshotUrls as Prisma.InputJsonValue,
        status: "已发布",
        updateDate: new Date().toISOString().slice(0, 10),
      },
    });

    return NextResponse.json({
      success: true,
      message: "审核通过，图片已同步到正式仓库，游戏已发布",
      game: updated,
    });
  } catch (error) {
    console.error("处理投稿审核失败:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? `审核处理失败：${error.message}`
            : "审核处理失败，请检查服务器日志",
      },
      { status: 500 }
    );
  }
}
