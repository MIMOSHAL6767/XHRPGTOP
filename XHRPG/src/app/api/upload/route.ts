
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(req: Request) {
  try {
    // 需要配置的服务端环境变量
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";

    if (!token || !owner || !repo) {
      return NextResponse.json(
        {
          success: false,
          message: "图片存储服务尚未配置",
        },
        { status: 500 }
      );
    }

    // 读取上传表单
    const formData = await req.formData();
    const file = formData.get("file");
    const id = formData.get("id");

    if (
      !(file instanceof File) ||
      typeof id !== "string" ||
      !/^[1-9]\d*$/.test(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少有效的文件或游戏ID",
        },
        { status: 400 }
      );
    }

    // 限制文件大小
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "图片不能为空，且不能超过 5 MB",
        },
        { status: 400 }
      );
    }

    // 只允许明确支持的图片格式
    const ext = MIME_EXTENSIONS[file.type];

    if (!ext) {
      return NextResponse.json(
        {
          success: false,
          message: "只支持 PNG、JPG、WebP 图片",
        },
        { status: 415 }
      );
    }

    // 检查文件实际签名，避免仅凭 MIME 类型判断
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

    const signatureMatches =
      (ext === "png" && isPng) ||
      (ext === "jpg" && isJpeg) ||
      (ext === "webp" && isWebp);

    if (!signatureMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "文件内容与图片格式不匹配",
        },
        { status: 400 }
      );
    }

    // 文件名固定由游戏ID生成，不接受用户提供的路径
    const filename = `games${id}.${ext}`;
    const repoPath = `games/${filename}`;

    const apiUrl =
      `https://api.github.com/repos/` +
      `${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/contents/` +
      repoPath
        .split("/")
        .map(encodeURIComponent)
        .join("/");

    // 查询已有文件，以便同名封面可以更新
    const existingResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });

    let existingSha: string | undefined;

    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      existingSha = existing.sha;
    } else if (existingResponse.status !== 404) {
      console.error(
        "GitHub 查询文件失败:",
        existingResponse.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "无法检查 GitHub 文件，请检查仓库权限和配置",
        },
        { status: 502 }
      );
    }

    // 调用 GitHub Contents API 上传或更新文件
    const payload: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message: `Upload game cover ${filename}`,
      content: bytes.toString("base64"),
      branch,
    };

    if (existingSha) {
      payload.sha = existingSha;
    }

    const uploadResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();

      // 日志不记录 Token
      console.error(
        "GitHub 上传失败:",
        uploadResponse.status,
        errorText.slice(0, 1000)
      );

      return NextResponse.json(
        {
          success: false,
          message:
            uploadResponse.status === 401 ||
            uploadResponse.status === 403
              ? "GitHub 权限不足或 Token 无效"
              : uploadResponse.status === 404
                ? "找不到目标仓库或分支"
                : uploadResponse.status === 409 ||
                    uploadResponse.status === 422
                  ? "GitHub 文件更新冲突，请重试"
                  : "GitHub 图片上传失败",
        },
        { status: 502 }
      );
    }

    // 返回稳定的 Raw 图片 URL
    const url =
      `https://raw.githubusercontent.com/` +
      `${owner}/${repo}/${branch}/${repoPath}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    console.error("图片上传异常:", error);

    return NextResponse.json(
      {
        success: false,
        message: "图片上传失败，请检查服务日志",
      },
      { status: 500 }
    );
  }
}
