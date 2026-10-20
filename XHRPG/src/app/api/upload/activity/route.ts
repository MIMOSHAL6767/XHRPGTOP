
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

async function isSiteOwner() {
  try {
    const token = (await cookies()).get("token")?.value;
    if (!token) return false;

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "xhrpg-secret"
    );

    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    return (
      String(payload.id) === "1" &&
      payload.role === "owner"
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isSiteOwner())) {
      return jsonError("无权上传活动图片", 401);
    }

    const token = process.env.GITHUB_IMAGE_TOKEN;
    const owner = process.env.GITHUB_IMAGE_OWNER;
    const repo = process.env.GITHUB_IMAGE_REPO;
    const branch = process.env.GITHUB_IMAGE_BRANCH || "main";

    if (!token || !owner || !repo) {
      return jsonError("图片存储服务尚未配置", 500);
    }

    const formData = await req.formData();
    const value = formData.get("file");

    if (
      !value ||
      typeof value === "string" ||
      typeof value.arrayBuffer !== "function"
    ) {
      return jsonError("请选择要上传的图片", 400);
    }

    const file = value as File;

    if (file.size <= 0) {
      return jsonError("图片文件为空", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError("图片不能超过 5 MB", 413);
    }

    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return jsonError(
        "仅支持 JPG、PNG、WebP 和 GIF 图片",
        415
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const isJpeg =
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;

    const isPng =
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47,
          0x0d, 0x0a, 0x1a, 0x0a,
        ])
      );

    const isWebp =
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP";

    const isGif =
      bytes.length >= 6 &&
      ["GIF87a", "GIF89a"].includes(
        bytes.toString("ascii", 0, 6)
      );

    const valid =
      (file.type === "image/jpeg" && isJpeg) ||
      (file.type === "image/png" && isPng) ||
      (file.type === "image/webp" && isWebp) ||
      (file.type === "image/gif" && isGif);

    if (!valid) {
      return jsonError("文件内容与图片类型不匹配", 415);
    }

    const filename =
      `activity_${crypto.randomUUID()}.${extension}`;

    const path = `activity/${filename}`;

    const apiUrl =
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`;

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: `Upload activity image ${filename}`,
        content: bytes.toString("base64"),
        branch,
      }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(
        "Activity image upload failed:",
        response.status,
        result?.message
      );

      return jsonError(
        response.status === 401 || response.status === 403
          ? "GitHub 授权失败，请检查 Token 和仓库权限"
          : "图片上传到 GitHub 失败",
        502
      );
    }

    const url =
      `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    console.error("Activity image upload error:", error);
    return jsonError("活动图片上传失败", 500);
  }
}
