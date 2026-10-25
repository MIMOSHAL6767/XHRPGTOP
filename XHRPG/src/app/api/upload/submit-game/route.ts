
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

const MAX_TAGS = 30;
const MAX_HISTORY_ITEMS = 100;
const MAX_SCREENSHOTS = 5;
const MAX_TEXT_LENGTH = 5000;

type AssetInput = {
  cover?: unknown;
  background?: unknown;
  logo?: unknown;
  screenshots?: unknown;
};

type HistoryInput = {
  version?: unknown;
  date?: unknown;
  lanzou?: unknown;
  pan123?: unknown;
};

type SubmissionBody = Record<string, unknown>;

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
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

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * 临时图片路径格式：
 * pending/<UUID>/cover.png
 * pending/<UUID>/background.jpg
 * pending/<UUID>/logo.png
 * pending/<UUID>/screenshot-1.webp
 *
 * 截图文件名允许带序号，避免多张截图互相覆盖。
 */
function isPendingImagePath(value: unknown): value is string {
  if (typeof value !== "string") return false;

  return /^pending\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(?:cover|background|logo|screenshot(?:-\d{1,3})?)\.(?:png|jpg|webp)$/i.test(
    value,
  );
}

function cleanAssetPath(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const path = value.trim();

  if (!isPendingImagePath(path)) return null;

  return path;
}

function isScreenshotPath(path: string) {
  return /\/screenshot(?:-\d{1,3})?\.(?:png|jpg|webp)$/i.test(
    path,
  );
}

function isPngPath(path: string) {
  return /\.png$/i.test(path);
}

/**
 * 查询 GitHub 临时图片仓库中的文件是否存在。
 *
 * 需要配置：
 * GITHUB_OWNER
 * GITHUB_TEMP_REPO
 * GITHUB_TOKEN 或 GITHUB_IMAGE_TOKEN
 *
 * 可选：
 * GITHUB_TEMP_BRANCH
 */
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
      signal: AbortSignal.timeout(10000),
    },
  );

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    console.error(
      "检查临时图片失败:",
      response.status,
      await response.text().catch(() => ""),
    );

    throw new Error("无法验证临时图片，请稍后重试");
  }

  const result: unknown = await response.json().catch(() => null);

  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    return false;
  }

  const file = result as {
    type?: unknown;
    path?: unknown;
  };

  return file.type === "file" && file.path === path;
}

function parseAssets(value: unknown): AssetInput {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as AssetInput;
}

function parseTags(value: unknown) {
  if (!Array.isArray(value)) return [];

  const tags = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 40))
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, MAX_TAGS);
}

function parseHistory(value: unknown): HistoryInput[] | null {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  if (value.length > MAX_HISTORY_ITEMS) {
    return null;
  }

  return value.filter(
    (item): item is HistoryInput =>
      Boolean(item) &&
      typeof item === "object" &&
      !Array.isArray(item),
  );
}

function getCurrentDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return jsonError("提交的数据格式不正确");
    }

    const data = body as SubmissionBody;

    // 基础资料
    const name = cleanText(data.name, 120);
    const en = cleanText(data.en, 120);
    const author = cleanText(data.author, 120);
    const category = cleanText(data.category, 40);
    const version = cleanText(data.version, 80);
    const description = cleanText(
      data.description,
      MAX_TEXT_LENGTH,
    );
    const lanzou = cleanText(data.lanzou, 1000);
    const pan123 = cleanText(data.pan123, 1000);
    const gameStatus = cleanText(
      data.gameStatus || "更新中",
      30,
    );

    // 人机验证资料
    const questionId = Number(data.questionId);
    const answer = cleanText(data.answer, 200);

    // 兼容现有前端 coverPath 和扩展后的 assets 对象。
    const incomingAssets = parseAssets(data.assets);

    const coverPath = cleanAssetPath(
      data.coverPath ?? incomingAssets.cover,
    );

    // 基础信息校验
    if (!name || !author || !version || !category) {
      return jsonError(
        "请填写游戏名称、作者、版本和游戏分类",
      );
    }

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
      return jsonError(
        "封面路径无效，请重新上传封面",
      );
    }

    if (
      !OPTIONAL_DOWNLOAD_STATUSES.includes(gameStatus) &&
      !lanzou &&
      !pan123
    ) {
      return jsonError(
        "当前作品状态至少需要填写一个下载链接",
      );
    }

    if (!isValidHttpUrl(lanzou) || !isValidHttpUrl(pan123)) {
      return jsonError(
        "下载链接必须是有效的 HTTP 或 HTTPS 地址",
      );
    }

    // 人机验证
    if (
      !Number.isSafeInteger(questionId) ||
      questionId <= 0 ||
      !answer
    ) {
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
      normalizeAnswer(question.answer) !==
        normalizeAnswer(answer)
    ) {
      return jsonError(
        "验证答案错误，请重新获取题目",
        403,
      );
    }

    // 解析详情背景
    let backgroundPath: string | null = null;

    if (
      incomingAssets.background !== undefined &&
      incomingAssets.background !== null &&
      incomingAssets.background !== ""
    ) {
      backgroundPath = cleanAssetPath(
        incomingAssets.background,
      );

      if (
        !backgroundPath ||
        !/\/background\.(?:png|jpg|webp)$/i.test(
          backgroundPath,
        )
      ) {
        return jsonError(
          "详情背景路径无效，请重新上传",
        );
      }
    }

    // 解析标题图片
    let logoPath: string | null = null;

    if (
      incomingAssets.logo !== undefined &&
      incomingAssets.logo !== null &&
      incomingAssets.logo !== ""
    ) {
      logoPath = cleanAssetPath(incomingAssets.logo);

      if (
        !logoPath ||
        !/\/logo\.png$/i.test(logoPath)
      ) {
        return jsonError(
          "标题图片路径无效，必须使用 PNG 格式",
        );
      }
    }

    // 标题模式
    const requestedTitleMode =
      data.titleMode === "image" ? "image" : "text";

    if (requestedTitleMode === "image" && !logoPath) {
      return jsonError(
        "标题模式选择了图片，请先上传标题 PNG 图片",
      );
    }

    const titleMode = requestedTitleMode;

    // 解析详情截图
    const screenshotsRaw =
      incomingAssets.screenshots === undefined ||
      incomingAssets.screenshots === null
        ? []
        : incomingAssets.screenshots;

    if (!Array.isArray(screenshotsRaw)) {
      return jsonError("详情预览图数据格式不正确");
    }

    if (screenshotsRaw.length > MAX_SCREENSHOTS) {
      return jsonError("详情预览图最多 5 张");
    }

    const screenshotPaths: string[] = [];

    for (const item of screenshotsRaw) {
      const path = cleanAssetPath(item);

      if (!path || !isScreenshotPath(path)) {
        return jsonError(
          "详情预览图路径无效，请重新上传",
        );
      }

      if (screenshotPaths.includes(path)) {
        return jsonError(
          "详情预览图中存在重复路径，请重新检查",
        );
      }

      screenshotPaths.push(path);
    }

    // 校验所有待审核图片路径。
    const pathsToCheck = [
      coverPath,
      ...(backgroundPath ? [backgroundPath] : []),
      ...(logoPath ? [logoPath] : []),
      ...screenshotPaths,
    ];

    // 避免相同路径被重复请求检查。
    const uniquePaths = Array.from(new Set(pathsToCheck));

    for (const path of uniquePaths) {
      const exists = await checkTempImageExists(path);

      if (!exists) {
        return jsonError(
          "有图片未成功上传到临时仓库，请重新上传后再提交",
        );
      }
    }

    // 标签去重，最多 30 个。
    const tags = parseTags(data.tags);

    // 详情背景透明度：统一存储为 0–100 的整数。
    const opacityValue = Number(
      data.detailBackgroundOpacity ?? 35,
    );

    const detailBackgroundOpacity = Number.isFinite(
      opacityValue,
    )
      ? Math.min(
          100,
          Math.max(0, Math.round(opacityValue)),
        )
      : 35;

    const detailBackgroundFit =
      data.detailBackgroundFit === "contain"
        ? "contain"
        : "cover";

    // 解析版本历史
    const historyRaw = parseHistory(data.history);

    if (historyRaw === null) {
      return jsonError(
        "版本历史格式错误，最多允许 100 条",
      );
    }

    const history = historyRaw
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

    // 将临时图片路径保存在 submissionAssets。
    // 这些路径不能直接作为正式发布游戏的图片 URL。
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
      return jsonError(
        "这张封面已经用于一份投稿，请重新上传封面",
      );
    }

    // 生成 48 位十六进制专属编辑凭证。
    const credential = randomBytes(24).toString("hex");
    const currentDate = getCurrentDate();

    const game = await prisma.game.create({
      data: {
        name,
        en: en || null,
        author,
        category,
        version,
        description,

        // 审核通过并同步正式封面前，不直接公开临时路径。
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

        // 正式截图字段暂时不存放临时仓库路径。
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

    if (
      error instanceof Error &&
      error.message === "投稿临时仓库环境变量缺失"
    ) {
      return jsonError(
        "投稿图片仓库尚未正确配置，请联系站长",
        500,
      );
    }

    if (
      error instanceof Error &&
      error.message === "无法验证临时图片，请稍后重试"
    ) {
      return jsonError(error.message, 502);
    }

    return jsonError(
      "投稿提交失败，请检查资料后重试",
      500,
    );
  }
}
