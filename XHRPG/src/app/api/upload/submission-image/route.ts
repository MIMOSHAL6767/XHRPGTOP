import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_KINDS = [
  "cover",
  "background",
  "logo",
  "screenshot",
] as const;

type ImageKind = (typeof ALLOWED_KINDS)[number];

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status },
  );
}

function normalizeAnswer(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
}

function detectImage(
  bytes: Buffer,
): { extension: "png" | "jpg" | "webp"; mime: string } | null {
  // PNG 文件签名
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png", mime: "image/png" };
  }

  // JPEG 文件签名
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { extension: "jpg", mime: "image/jpeg" };
  }

  // WebP 文件签名：RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { extension: "webp", mime: "image/webp" };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_TEMP_REPO;
    const branch = process.env.GITHUB_TEMP_BRANCH || "main";
    const token =
      process.env.GITHUB_TOKEN || process.env.GITHUB_IMAGE_TOKEN;

    if (!owner || !repo || !token) {
      console.error("投稿临时仓库环境变量缺失");

      return jsonError(
        "投稿图片服务尚未配置完成，请联系站长",
        500,
      );
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return jsonError("上传数据格式不正确");
    }

    const file = formData.get("file");
    const kindValue = String(formData.get("kind") || "cover");
    const questionIdValue = String(formData.get("questionId") || "");
    const answerValue = String(formData.get("answer") || "");

    if (!(file instanceof File)) {
      return jsonError("请选择要上传的图片");
    }

    if (!ALLOWED_KINDS.includes(kindValue as ImageKind)) {
      return jsonError("不支持的图片用途");
    }

    const kind = kindValue as ImageKind;

    if (!questionIdValue || !answerValue.trim()) {
      return jsonError("请先完成验证题");
    }

    const questionId = Number(questionIdValue);

    if (!Number.isSafeInteger(questionId) || questionId <= 0) {
      return jsonError("验证题无效，请刷新后重试");
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return jsonError("图片大小必须大于 0 且不能超过 5 MB");
    }

    if (kind === "logo" && file.type !== "image/png") {
      return jsonError("标题图片必须使用 PNG 格式");
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
      normalizeAnswer(question.answer) !== normalizeAnswer(answerValue)
    ) {
      return jsonError("验证答案错误，请重新获取题目", 403);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const detected = detectImage(bytes);

    if (!detected) {
      return jsonError("文件内容不是有效的 PNG、JPG 或 WebP 图片");
    }

    // 避免仅凭浏览器传入的 MIME 类型判断文件格式。
    if (kind === "logo" && detected.extension !== "png") {
      return jsonError("标题图片必须是 PNG 文件");
    }

    const uploadId = randomUUID();
    const filename = `${kind}.${detected.extension}`;
    const path = `pending/${uploadId}/${filename}`;

    const encodedPath = path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    const githubResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Upload pending submission image: ${uploadId}/${filename}`,
          content: bytes.toString("base64"),
          branch,
        }),
        cache: "no-store",
      },
    );

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();

      console.error("投稿图片上传 GitHub 失败:", {
        status: githubResponse.status,
        response: errorText.slice(0, 1000),
      });

      return jsonError("图片上传失败，请稍后重试", 502);
    }

    return NextResponse.json({
      success: true,
      uploadId,
      kind,
      path,
      filename,
    });
  } catch (error) {
    console.error("投稿图片上传接口异常:", error);

    return jsonError("图片上传服务发生错误，请稍后重试", 500);
  }
}
