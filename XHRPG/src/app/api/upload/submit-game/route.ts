
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function readText(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== "string") return null;

  const result = value.trim();

  if (result.length > maxLength) return null;

  return result;
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return fail("提交的数据格式错误");
    }

    const data = body as Record<string, unknown>;

    // 1. 读取并验证必填资料
    const name = readText(data.name, 120);
    const author = readText(data.author, 120);
    const version = readText(data.version, 80);
    const category = readText(data.category, 80);
    const description = readText(data.description, 5000);
    const en = readText(data.en, 120);
    const lanzou = readText(data.lanzou, 1000);
    const pan123 = readText(data.pan123, 1000);
    const gameStatus = readText(data.gameStatus, 30);
    const coverPath = readText(data.coverPath, 300);
    const questionId = data.questionId;
    const answer = readText(data.answer, 300);

    if (!name) return fail("游戏名称不能为空");
    if (!author) return fail("作者不能为空");
    if (!version) return fail("游戏版本不能为空");
    if (!category) return fail("请选择游戏分类");
    if (!coverPath) return fail("请先上传封面");
    if (!gameStatus) return fail("请选择作品状态");

    const allowedCategories = [
      "角色扮演",
      "动作冒险",
      "策略战棋",
      "恐怖悬疑",
      "模拟经营",
    ];

    if (!allowedCategories.includes(category)) {
      return fail("不支持的游戏分类");
    }

    const allowedGameStatuses = [
      "更新中",
      "完结",
      "Demo",
      "弃坑",
      "断更",
      "预告",
    ];

    if (!allowedGameStatuses.includes(gameStatus)) {
      return fail("不支持的作品状态");
    }

    // 普通状态至少填写一个下载链接；
    // 弃坑、断更、预告允许两个链接都为空。
    if (
      !["弃坑", "断更", "预告"].includes(gameStatus) &&
      !lanzou &&
      !pan123
    ) {
      return fail("请至少填写一个下载链接");
    }

    // 2. 验证人机验证答案
    if (
      typeof questionId !== "number" &&
      typeof questionId !== "string"
    ) {
      return fail("请完成问题验证");
    }

    const parsedQuestionId = Number(questionId);

    if (
      !Number.isSafeInteger(parsedQuestionId) ||
      parsedQuestionId < 1 ||
      !answer
    ) {
      return fail("请完成问题验证");
    }

    const question = await prisma.verifyQuestion.findUnique({
      where: { id: parsedQuestionId },
      select: {
        answer: true,
        enabled: true,
      },
    });

    if (
      !question ||
      !question.enabled ||
      normalizeAnswer(answer) !== normalizeAnswer(question.answer)
    ) {
      return fail("验证答案错误或题目已失效", 403);
    }

    // 3. 只接受本接口生成的随机临时封面路径
    const pathMatch = coverPath.match(
      /^pending\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/cover\.(png|jpg|webp)$/
    );

    if (!pathMatch) {
      return fail("临时封面路径无效");
    }

    const token =
      process.env.GITHUB_TOKEN ||
      process.env.GITHUB_IMAGE_TOKEN;

    const owner =
      process.env.GITHUB_OWNER ||
      process.env.GITHUB_IMAGE_OWNER;

    const repo = process.env.GITHUB_TEMP_REPO;

    const branch =
      process.env.GITHUB_TEMP_BRANCH || "main";

    if (!token || !owner || !repo) {
      console.error("临时图片仓库配置不完整");
      return fail("投稿图片服务尚未配置完成", 500);
    }

    // 4. 向 GitHub 确认图片确实存在
    const encodedPath = coverPath
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    const imageApiUrl =
      `https://api.github.com/repos/` +
      `${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/contents/` +
      encodedPath +
      `?ref=${encodeURIComponent(branch)}`;

    const imageResponse = await fetch(imageApiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });

    if (!imageResponse.ok) {
      console.error(
        "核对投稿封面失败:",
        imageResponse.status
      );

      return fail(
        imageResponse.status === 404
          ? "临时封面不存在，请重新上传"
          : "暂时无法核对封面，请稍后重试",
        imageResponse.status === 404 ? 400 : 502
      );
    }

    const imageInfo = await imageResponse.json();

    if (
      imageInfo?.type !== "file" ||
      imageInfo?.path !== coverPath ||
      typeof imageInfo?.sha !== "string"
    ) {
      return fail("临时封面文件无效");
    }

    // 5. 防止同一张临时封面重复创建投稿
    const existingSubmission = await prisma.game.findFirst({
      where: { submissionCoverPath: coverPath },
      select: { id: true },
    });

    if (existingSubmission) {
      return fail("这张封面已经关联投稿，请重新上传");
    }

    // 6. 生成唯一凭证
    const credential = randomBytes(24).toString("hex");

    const now = new Date().toISOString().slice(0, 10);

    // 7. 强制进入审核中，不接受客户端指定审核状态
    const game = await prisma.game.create({
      data: {
        name,
        en: en || "",
        author,
        category,
        version,
        description: description || "",
        cover: "",
        lanzou: lanzou || "",
        pan123: pan123 || "",
        downloads: 0,
        date: now,
        updateDate: now,
        history: [],
        tags: [],
        status: "审核中",
        gameStatus,
        symbol: "✦",
        submissionCredential: credential,
        submissionCoverPath: coverPath,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "投稿已提交，等待站长审核",
        game,
        credential,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "创建投稿失败:",
      error instanceof Error ? error.message : "未知错误"
    );

    return fail("投稿提交失败，请稍后重试", 500);
  }
}
