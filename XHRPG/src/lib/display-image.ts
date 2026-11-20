// 把海外图片地址改为本站同源代理，避免国内直连 Cloudinary/GitHub 超时。
const REMOTE_HOSTS = new Set([
  "res.cloudinary.com",
  "raw.githubusercontent.com",
  "github.com",
  "avatars.githubusercontent.com",
]);

export function displayImageUrl(
  url: string | null | undefined
): string {
  if (!url) return "";
  if (url.startsWith("/")) return url;

  try {
    const parsed = new URL(url);

    if (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      REMOTE_HOSTS.has(parsed.hostname)
    ) {
      return `/api/img?url=${encodeURIComponent(url)}`;
    }
  } catch {
    return url;
  }

  return url;
}

// 用于页面内的 HTML 内容（活动、大事记）里嵌入的图片。
export function proxyImagesInHtml(html: string): string {
  if (!html) return html;

  return html.replace(
    /(src=["'])(https:\/\/(?:res\.cloudinary\.com|raw\.githubusercontent\.com)\/[^"']+)(["'])/g,
    (_match, prefix: string, url: string, suffix: string) =>
      `${prefix}/api/img?url=${encodeURIComponent(url)}${suffix}`
  );
}
