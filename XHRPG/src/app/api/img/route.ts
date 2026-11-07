import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 允许代理的图片域名（站点自己的图片仓库）
const ALLOWED_HOSTS = [
  "raw.githubusercontent.com",
  "github.com",
  "avatars.githubusercontent.com",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=86400",
};

// 图片代理：/api/img?url=https://raw.githubusercontent.com/...
// 作用：让客户端只访问本站域名即可取得 GitHub 上的图片
export async function GET(req: Request) {
  try {
    const url = new URL(req.url).searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "缺少 url 参数" }, { status: 400, headers: CORS });
    }

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return NextResponse.json({ error: "url 格式错误" }, { status: 400, headers: CORS });
    }

    if (target.protocol !== "https:" || !ALLOWED_HOSTS.includes(target.hostname)) {
      return NextResponse.json({ error: "不允许的图片地址" }, { status: 403, headers: CORS });
    }

    const upstream = await fetch(target.toString(), {
      headers: { "User-Agent": "Xheam-Launcher" },
      cache: "force-cache",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "图片获取失败" }, { status: 502, headers: CORS });
    }

    const contentType = upstream.headers.get("content-type") || "image/png";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "不是图片" }, { status: 415, headers: CORS });
    }

    return new Response(upstream.body, {
      headers: { "Content-Type": contentType, ...CORS },
    });
  } catch (error) {
    console.error("图片代理失败：", error);
    return NextResponse.json({ error: "图片代理失败" }, { status: 500, headers: CORS });
  }
}
