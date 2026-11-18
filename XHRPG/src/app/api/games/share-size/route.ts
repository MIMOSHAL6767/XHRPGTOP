import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_HOST =
  /(^|\.)(123pan\.(com|cn)|lanzou[a-z0-9]*\.(com|cn|net)|lan[a-z0-9]+\.(com|cn|net))$/i;

const UNIT: Record<string, number> = {
  B: 1,
  K: 1024,
  KB: 1024,
  M: 1024 * 1024,
  MB: 1024 * 1024,
  G: 1024 * 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  T: 1024 * 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024,
};

const cache = new Map<string, { bytes: number; at: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 6;

function parseSizeFromHtml(html: string): number {
  const byteKeys = [
    /"fileSize"\s*:\s*"?(\d{3,})"?/i,
    /"file_size"\s*:\s*"?(\d{3,})"?/i,
    /"size"\s*:\s*"?(\d{3,})"?/i,
    /"totalSize"\s*:\s*"?(\d{3,})"?/i,
  ];

  for (const pattern of byteKeys) {
    const match = html.match(pattern);

    if (match) {
      const bytes = Number(match[1]);

      if (Number.isFinite(bytes) && bytes > 0) {
        return bytes;
      }
    }
  }

  const near = html.match(
    /(?:文件大小|大小|体积|size)[^0-9]{0,24}(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB|K|M|G|T|B)\b/i
  );

  const any =
    near ||
    html.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)\b/i);

  if (any) {
    const value = Number(any[1]);
    const unit = UNIT[String(any[2]).toUpperCase()] || 0;

    if (Number.isFinite(value) && unit > 0) {
      return Math.round(value * unit);
    }
  }

  return 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = (searchParams.get("url") || "").trim();

    if (!/^https?:\/\//i.test(rawUrl)) {
      return NextResponse.json(
        { ok: false, message: "链接格式无效" },
        { status: 400 }
      );
    }

    let target: URL;

    try {
      target = new URL(rawUrl);
    } catch {
      return NextResponse.json(
        { ok: false, message: "链接格式无效" },
        { status: 400 }
      );
    }

    if (!ALLOWED_HOST.test(target.hostname)) {
      return NextResponse.json(
        { ok: false, message: "仅支持 123 网盘或蓝奏云链接" },
        { status: 400 }
      );
    }

    const cached = cache.get(rawUrl);

    if (cached && Date.now() - cached.at < CACHE_TTL) {
      return NextResponse.json({
        ok: cached.bytes > 0,
        bytes: cached.bytes,
        cached: true,
      });
    }

    // 123 云盘分享页走公开接口，能直接拿到文件大小。
    if (/123pan\.(com|cn)$/i.test(target.hostname)) {
      const shareKey =
        target.pathname.split("/").filter(Boolean).pop() ||
        searchParams.get("shareKey") ||
        "";

      if (shareKey) {
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          12000
        );

        try {
          const apiUrl =
            `${target.origin}/api/share/get?` +
            new URLSearchParams({
              shareKey,
              limit: "100",
              next: "0",
              ParentFileId: "0",
              Page: "1",
              operateType: "1",
              OrderBy: "file_name",
              OrderDirection: "asc",
            }).toString();

          const response = await fetch(apiUrl, {
            cache: "no-store",
            signal: controller.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            },
          });

          const data = await response.json().catch(() => null);
          const list = Array.isArray(data?.data?.InfoList)
            ? data.data.InfoList
            : [];
          const bytes = list.reduce(
            (sum: number, item: { Size?: number }) =>
              sum + (Number(item?.Size) || 0),
            0
          );

          if (bytes > 0) {
            cache.set(rawUrl, { bytes, at: Date.now() });

            return NextResponse.json({
              ok: true,
              bytes,
              cached: false,
            });
          }
        } catch {
          // 落到下面的通用解析。
        } finally {
          clearTimeout(timer);
        }
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    let html = "";

    try {
      const response = await fetch(rawUrl, {
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        return NextResponse.json({
          ok: false,
          bytes: 0,
          message: `HTTP ${response.status}`,
        });
      }

      html = await response.text();
    } finally {
      clearTimeout(timer);
    }

    const bytes = parseSizeFromHtml(html);

    cache.set(rawUrl, { bytes, at: Date.now() });

    return NextResponse.json(
      { ok: bytes > 0, bytes },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(
      "读取网盘分享页大小失败：",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { ok: false, bytes: 0, message: "读取失败" },
      { status: 200 }
    );
  }
}
