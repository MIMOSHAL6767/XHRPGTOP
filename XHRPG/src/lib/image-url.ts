// 站点允许的图片地址：GitHub Raw（历史图片）与 Cloudinary（新上传）。
const GITHUB_RAW_PREFIX = "https://raw.githubusercontent.com/";
const CLOUDINARY_PREFIX = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

export function isAllowedImageUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;

  return (
    value.startsWith(GITHUB_RAW_PREFIX) ||
    CLOUDINARY_PREFIX.test(value)
  );
}

export function isAllowedOptionalImageUrl(value: unknown): boolean {
  return value === null || value === "" || isAllowedImageUrl(value);
}
