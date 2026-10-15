import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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

export async function POST(req: Request) {
  try {
    // 配置检查
    const token = process.env.GITHUB_IMAGE_TOKEN;
    const owner = process.env.GITHUB_IMAGE_OWNER;
    const repo = process.env.GITHUB_IMAGE_REPO;
    const branch = process.env.GITHUB_IMAGE_BRANCH || "main";

    if (!token || !owner || !repo) {
      console.error("Missing GitHub image storage environment variables.");
      return jsonError("图片存储服务尚未配置", 500);
    }

    // 注意：此接口必须在这里加入与你现有登录系统匹配的管理员身份验证。
    // 在完成验证前，不要将此接口公开投入使用。
    // 不要将 GitHub Token 返回给客户端。

    const formData = await req.formData();
    const value = formData.get("file");

    if (!value || typeof value === "string" || typeof value.arrayBuffer !== "function") {
      return jsonError("没有文件", 400);
    }

    const file = value as File;

    if (file.size <= 0) {
      return jsonError("文件为空", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError("图片不能超过 5 MB", 413);
    }

    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return jsonError("仅支持 JPG、PNG、WebP 和 GIF 图片", 415);
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // 校验文件签名，避免仅通过修改 MIME 类型上传其他文件。
    const isJpeg =
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;

    const isPng =
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );

    const isWebp =
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP";

    const isGif =
      bytes.length >= 6 &&
      ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6));

    const validSignature =
      (file.type === "image/jpeg" && isJpeg) ||
      (file.type === "image/png" && isPng) ||
      (file.type === "image/webp" && isWebp) ||
      (file.type === "image/gif" && isGif);

    if (!validSignature) {
      return jsonError("文件内容与图片类型不匹配", 415);
    }

    // 服务端生成文件名，避免用户控制仓库路径或覆盖旧文件。
    const filename = `banner_${crypto.randomUUID()}.${extension}`;
    const filePath = `banners/${filename}`;

    const apiUrl =
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath}`;

    const githubResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: `Upload banner ${filename}`,
        content: bytes.toString("base64"),
        branch,
      }),
      cache: "no-store",
    });

    const result = await githubResponse.json().catch(() => null);

    if (!githubResponse.ok) {
      console.error(
        "GitHub image upload failed:",
        githubResponse.status,
        result?.message || "Unknown GitHub API error"
      );

      return jsonError(
        githubResponse.status === 401 || githubResponse.status === 403
          ? "图片仓库授权失败，请检查 GitHub Token 和仓库权限"
          : "上传到图片仓库失败，请稍后重试",
        502
      );
    }

    const url =
      `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${filePath}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    console.error("Banner upload error:", error);
    return jsonError("图片上传失败", 500);
  }
}
