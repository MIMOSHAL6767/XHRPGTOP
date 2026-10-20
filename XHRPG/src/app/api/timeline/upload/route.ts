import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "xhrpg-secret";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return false;

    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded !== "object" || decoded === null) {
      return false;
    }

    const payload = decoded as jwt.JwtPayload & {
      id?: string | number;
      userId?: string | number;
      user?: { id?: string | number };
    };

    const rawId = payload.id ?? payload.userId ?? payload.user?.id;

    if (
      rawId === undefined ||
      rawId === null ||
      String(rawId).trim() === ""
    ) {
      return false;
    }

    // Prisma User.id 是 number 类型，查询前转换为数字
    const userId = Number(rawId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        hidden: true,
        banUntil: true,
      },
    });

    if (!user || user.hidden) return false;

    if (
      user.banUntil &&
      new Date(user.banUntil).getTime() > Date.now()
    ) {
      return false;
    }

    return user.role === "owner" || user.role === "admin";
  } catch (error) {
    console.error("验证大事记图片上传权限失败：", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. 验证站长/管理员身份
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "没有上传权限，请使用站长或管理员账号登录" },
        { status: 403 },
      );
    }

    // 2. 检查 GitHub 图床环境变量
    const token =
      process.env.GITHUB_IMAGE_TOKEN || process.env.GITHUB_TOKEN;

    const owner =
      process.env.GITHUB_IMAGE_OWNER || process.env.GITHUB_OWNER;

    const repo =
      process.env.GITHUB_IMAGE_REPO || process.env.GITHUB_REPO;

    const branch =
      process.env.GITHUB_IMAGE_BRANCH ||
      process.env.GITHUB_BRANCH ||
      "main";

    if (!token || !owner || !repo) {
      return NextResponse.json(
        {
          error:
            "GitHub 图床配置不完整，请检查 GITHUB_IMAGE_TOKEN、GITHUB_IMAGE_OWNER 和 GITHUB_IMAGE_REPO 环境变量",
        },
        { status: 500 },
      );
    }

    // 3. 读取上传文件
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "请选择要上传的图片，字段名称必须为 file" },
        { status: 400 },
      );
    }

    // 4. 校验图片格式
    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return NextResponse.json(
        { error: "只支持 JPG、PNG、WebP 和 GIF 图片" },
        { status: 400 },
      );
    }

    // 5. 校验图片大小
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "图片大小必须大于 0 且不能超过 5 MB" },
        { status: 400 },
      );
    }

    // 6. 转换为 Base64
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");

    const path = `timeline/${Date.now()}-${randomUUID()}.${extension}`;

    const apiUrl =
      `https://api.github.com/repos/${owner}/${repo}/contents/` +
      path.split("/").map(encodeURIComponent).join("/");

    // 7. 上传到 GitHub Contents API
    const githubResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "XHRPG-Timeline-Uploader",
      },
      body: JSON.stringify({
        message: `Upload timeline image ${path}`,
        content: base64,
        branch,
      }),
      cache: "no-store",
    });

    const result = await githubResponse.json();

    if (!githubResponse.ok) {
      console.error("GitHub 图片上传失败：", result);

      return NextResponse.json(
        {
          error:
            result?.message ||
            `GitHub 上传失败，HTTP ${githubResponse.status}`,
        },
        { status: 502 },
      );
    }

    // 8. 返回图片地址
    const imageUrl =
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

    return NextResponse.json({
      success: true,
      url: imageUrl,
      path,
      message: "图片上传成功",
    });
  } catch (error) {
    console.error("大事记图片上传失败：", error);

    return NextResponse.json(
      { error: "图片上传失败，请查看服务器日志" },
      { status: 500 },
    );
  }
}
