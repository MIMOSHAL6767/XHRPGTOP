
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GAME_STATUSES = [
  "更新中",
  "完结",
  "Demo",
  "弃坑",
  "断更",
  "预告",
] as const;

const OPTIONAL_DOWNLOAD_STATUSES = ["弃坑", "断更", "预告"];

type AssetInput = {
  cover?: unknown;
  background?: unknown;
  logo?: unknown;
  screenshots?: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status },
  );
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeAnswer(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function isValidHttpUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isPendingImagePath(value: unknown): value is string {
  if (typeof value !== "string") return false;

  return /^pending\/[0-9a-f-]{36}\/(cover|background|logo|screenshot)\.(png|jpg|webp)$/i.test(
    value,
  );
}

function cleanAssetPath(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const path = value.trim();

  if (!isPendingImagePath(path)) return null;

  return path;
}

async function checkTempImageExists(path: string) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_TEMP_REPO;
  const branch = process.env.GITHUB_TEMP_BRANCH || "main";
  const token =
    process.env.GITHUB_TOKEN || process.env.GITHUB_IMAGE_TOKEN;

  if (!owner || !repo || !token) {
    throw new Error("投稿临时仓库环境变量缺失");
  }

  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    },
  );

  return response.ok;
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("提交的数据格式不正确");
    }

    const data = body as Record<string, unknown>;

    const name = cleanText(data.name, 120);
    const en = cleanText(data.en, 120);
    const author = cleanText(data.author, 120);
    const category = cleanText(data.category, 40);
    const version = cleanText(data.version, 80);
    const description = cleanText(data.description, 5000);
    const lanzou = cleanText(data.lanzou, 1000);
    const pan123 = cleanText(data.pan123, 1000);
    const gameStatus = cleanText(data.gameStatus || "更新中", 30);

    const questionId = Number(data.questionId);
    const answer = cleanText(data.answer, 200);

    const incomingAssets: AssetInput =
      data.assets &&
      typeof data.assets === "object" &&
      !Array.isArray(data.assets)
        ? (data.assets as AssetInput)
        : {};

    const coverPath = cleanAssetPath(
      data.coverPath ?? incomingAssets.cover,
    );

    // 基础信息校验。
    if (!name || !author || !version || !category) {
      return jsonError("请填写游戏名称、作者、版本和游戏分类");
    }

    // 分类由投稿者自行填写，不再限制为固定分类。
    if (category.length > 40) {
      return jsonError("游戏分类不能超过 40 个字符");
    }

    if (
      !GAME_STATUSES.includes(
        gameStatus as (typeof GAME_STATUSES)[number],
      )
    ) {
      return jsonError("作品状态无效");
    }

    if (!coverPath) {
      return jsonError("封面路径无效，请重新上传封面");
    }

    if (
      !OPTIONAL_DOWNLOAD_STATUSES.includes(gameStatus) &&
      !lanzou &&
      !pan123
    ) {
      return jsonError("当前作品状态至少需要填写一个下载链接");
    }

    if (!isValidHttpUrl(lanzou) || !isValidHttpUrl(pan123)) {
      return jsonError("下载链接必须是有效的 HTTP 或 HTTPS 地址");
    }

    // 人机验证。
    if (!questionId || !Number.isSafeInteger(questionId) || !answer) {
      return jsonError("请完成验证题");
    }

    const question = await prisma.verifyQuestion.findFirst({
      where: {
        id: questionId,
        enabled: true,
      },
      select: {
        id: true,
        answer: true,
      },
    });

    if (
      !question ||
      normalizeAnswer(question.answer) !== normalizeAnswer(answer)
    ) {
      return jsonError("验证答案错误，请重新获取题目", 403);
    }

    // 解析投稿图片路径。
    const backgroundPath = incomingAssets.background
      ? cleanAssetPath(incomingAssets.background)
      : null;

    const logoPath = incomingAssets.logo
      ? cleanAssetPath(incomingAssets.logo)
      : null;

    const screenshotsRaw = Array.isArray(incomingAssets.screenshots)
      ? incomingAssets.screenshots
      : [];

    if (screenshotsRaw.length > 100) {
      return jsonError("详情预览图最多 100 张");
    }

    const screenshotPaths: string[] = [];

    for (const item of screenshotsRaw) {
      const path = cleanAssetPath(item);

      if (!path || !/\/screenshot\.(png|jpg|webp)$/i.test(path)) {
        return jsonError("详情预览图路径无效，请重新上传");
      }

      screenshotPaths.push(path);
    }

    if (incomingAssets.background && !backgroundPath) {
      return jsonError("详情背景路径无效，请重新上传");
    }

    if (incomingAssets.logo && !logoPath) {
      return jsonError("标题图片路径无效，请重新上传");
    }

    if (logoPath && !/\.png$/i.test(logoPath)) {
      return jsonError("标题图片必须是 PNG 格式");
    }

    // 检查临时仓库中的图片是否真实存在。
    const pathsToCheck = [
      coverPath,
      ...(backgroundPath ? [backgroundPath] : []),
      ...(logoPath ? [logoPath] : []),
      ...screenshotPaths,
    ];

    for (const path of pathsToCheck) {
      const exists = await checkTempImageExists(path);

      if (!exists) {
        return jsonError(
          "有图片未成功上传到临时仓库，请重新上传后再提交",
        );
      }
    }

    // 标签去重，最多 30 个。
    const tagsRaw = Array.isArray(data.tags) ? data.tags : [];

    const tags = Array.from(
      new Set(
        tagsRaw
          .filter(
            (item): item is string => typeof item === "string",
          )
          .map((item) => item.trim().slice(0, 40))
          .filter(Boolean),
      ),
    ).slice(0, 30);

    // 标题显示模式。
    const titleMode =
      data.titleMode === "image" && logoPath ? "image" : "text";

    // 详情背景设置。
    const opacityValue = Number(
      data.detailBackgroundOpacity ?? 35,
    );

    const detailBackgroundOpacity = Number.isFinite(opacityValue)
      ? Math.min(100, Math.max(0, Math.round(opacityValue)))
      : 35;

    const detailBackgroundFit =
      data.detailBackgroundFit === "contain" ? "contain" : "cover";

    // 版本历史。
    const historyRaw = Array.isArray(data.history) ? data.history : [];

    if (historyRaw.length > 100) {
      return jsonError("版本历史最多 100 条");
    }

    const history = historyRaw
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) &&
          typeof item === "object" &&
          !Array.isArray(item),
      )
      .map((item) => ({
        version: cleanText(item.version, 80),
        date: cleanText(item.date, 40),
        lanzou: cleanText(item.lanzou, 1000),
        pan123: cleanText(item.pan123, 1000),
      }))
      .filter(
        (item) =>
          item.version ||
          item.date ||
          item.lanzou ||
          item.pan123,
      );

    for (const item of history) {
      if (
        !isValidHttpUrl(item.lanzou) ||
        !isValidHttpUrl(item.pan123)
      ) {
        return jsonError(
          "版本历史中的下载链接必须是 HTTP 或 HTTPS 地址",
        );
      }
    }

    // 将临时仓库路径保存到投稿记录。
    // 审核通过时，需要由站长审核逻辑同步到正式图片仓库。
    const submissionAssets: Prisma.InputJsonObject = {
      cover: coverPath,
      background: backgroundPath,
      logo: logoPath,
      screenshots: screenshotPaths,
    };

    // 防止同一张封面重复用于不同投稿。
    const existing = await prisma.game.findFirst({
      where: {
        submissionCoverPath: coverPath,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return jsonError("这张封面已经用于一份投稿，请重新上传封面");
    }

    const credential = randomBytes(24).toString("hex");
    const currentDate = new Date().toISOString().slice(0, 10);

    const game = await prisma.game.create({
      data: {
        name,
        en: en || null,
        author,
        category,
        version,
        description,
        cover: "",
        lanzou,
        pan123,
        downloads: 0,
        date: currentDate,
        updateDate: currentDate,
        history: history as Prisma.InputJsonValue,
        status: "审核中",
        gameStatus,
        symbol: "",
        tags: tags as Prisma.InputJsonValue,

        titleMode,
        titleLogo: null,

        detailBackground: null,
        detailBackgroundOpacity,
        detailBackgroundFit,

        // 这里保存的是临时仓库路径，不是正式图片 URL。
        // 不应将临时路径直接作为已发布游戏的 screenshots 使用。
        screenshots: [] as Prisma.InputJsonArray,

        submissionCredential: credential,
        submissionCoverPath: coverPath,
        submissionAssets,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "投稿提交成功，等待站长审核",
      id: game.id,
      name: game.name,
      status: game.status,
      credential,
    });
  } catch (error) {
    console.error("提交游戏投稿失败:", error);

    return jsonError("投稿提交失败，请检查资料后重试", 500);
  }
}
