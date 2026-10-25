
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function fail(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function checkImage(bytes: Buffer, ext: string) {
  if (ext === "png") {
    return (
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      )
    );
  }

  if (ext === "jpg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (ext === "webp") {
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return false;
}

function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

export async function POST(req: Request) {
  try {
    // 1. 获取并验证人机验证答案
    const form = await req.formData();

    const file = form.get("file");
    const questionId = form.get("questionId");
    const answer = form.get("answer");

    if (!(file instanceof File)) {
      return fail("请选择封面图片");
    }

    if (
      typeof questionId !== "string" ||
      !/^[1-9]\d*$/.test(questionId) ||
      typeof answer !== "string" ||
      !answer.trim()
    ) {
      return fail("请先完成问题验证");
    }

    const question = await prisma.verifyQuestion.findUnique({
      where: { id: Number(questionId) },
      select: {
        id: true,
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

    // 2. 检查图片大小与格式
    if (file.size <= 0 || file.size > MAX_SIZE) {
      return fail("图片不能为空，且不能超过 5 MB");
    }

    const ext = IMAGE_TYPES[file.type.toLowerCase()];

    if (!ext) {
      return fail("封面只支持 PNG、JPG、WebP 格式", 415);
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    if (!checkImage(bytes, ext)) {
      return fail("图片内容与文件格式不匹配");
    }

    // 3. 读取独立的临时仓库配置
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
      console.error("投稿临时图片仓库环境变量未配置");
      return fail("投稿图片服务尚未配置完成", 500);
    }

    // 4. 使用随机路径，避免覆盖其他投稿图片
    const uploadId = randomUUID();
    const path = `pending/${uploadId}/cover.${ext}`;

    const encodedPath = path
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    const apiUrl =
      `https://api.github.com/repos/` +
      `${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/contents/` +
      encodedPath;

    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Temporary submission cover ${uploadId}`,
        content: bytes.toString("base64"),
        branch,
      }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);

    if (
      !response.ok ||
      result?.content?.path !== path ||
      !result?.content?.sha
    ) {
      console.error(
        "投稿封面上传失败:",
        response.status,
        result?.message
      );

      return fail(
        response.status === 401 || response.status === 403
          ? "GitHub Token 无效或缺少临时仓库写入权限"
          : "临时封面上传失败，请稍后重试",
        502
      );
    }

    // 只返回内部路径，不暴露私有仓库的公开图片 URL
    return NextResponse.json({
      success: true,
      uploadId,
      path,
      filename: `cover.${ext}`,
    });
  } catch (error) {
    console.error(
      "投稿图片上传异常:",
      error instanceof Error ? error.message : "未知错误"
    );

    return fail("投稿图片上传失败", 500);
  }
}
