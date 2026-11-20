import { createHash } from "crypto";

// Cloudinary 图片存储：服务端签名上传 + 按 public_id 删除。
// 只用于图片；GIF 与音乐继续走 GitHub。

function getConfig() {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || "").trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured() {
  return getConfig() !== null;
}

function signParams(
  params: Record<string, string>,
  apiSecret: string
) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1")
    .update(payload + apiSecret)
    .digest("hex");
}

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
};

export async function uploadImageToCloudinary(args: {
  bytes: Buffer;
  publicId: string;
}): Promise<CloudinaryUploadResult> {
  const config = getConfig();

  if (!config) {
    throw new Error("Cloudinary 未配置");
  }

  const timestamp = String(Math.floor(Date.now() / 1000));

  // 固定转 WebP，节省免费额度与带宽。
  const signed: Record<string, string> = {
    public_id: args.publicId,
    timestamp,
    overwrite: "true",
    invalidate: "true",
    format: "webp",
  };

  const signature = signParams(signed, config.apiSecret);

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(args.bytes)], { type: "application/octet-stream" }),
    "upload"
  );
  form.append("api_key", config.apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);
  form.append("public_id", args.publicId);
  form.append("overwrite", "true");
  form.append("invalidate", "true");
  form.append("format", "webp");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    }
  );

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok || typeof data !== "object" || data === null) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: { message?: string } }).error?.message ===
        "string"
        ? (data as { error: { message: string } }).error.message
        : `Cloudinary 上传失败（${response.status}）`;

    throw new Error(message);
  }

  const result = data as {
    secure_url?: string;
    public_id?: string;
    format?: string;
    bytes?: number;
  };

  if (!result.secure_url || !result.public_id) {
    throw new Error("Cloudinary 未返回图片地址");
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format || "webp",
    bytes: result.bytes || args.bytes.length,
  };
}

// 从 Cloudinary 交付地址中取出 public_id（不含扩展名）。
export function cloudinaryPublicIdFromUrl(
  url: string | null | undefined
): string | null {
  if (!url || !url.includes("res.cloudinary.com")) return null;

  const marker = "/image/upload/";
  const index = url.indexOf(marker);

  if (index === -1) return null;

  const segments = url
    .slice(index + marker.length)
    .split("?")[0]
    .split("/")
    .filter(Boolean);

  // 跳过开头的版本号与变换段，例如 v1690000000、f_auto,q_auto。
  while (
    segments.length > 1 &&
    (/^v\d+$/.test(segments[0]) ||
      /^[a-z]{1,4}_/.test(segments[0]) ||
      segments[0].includes(","))
  ) {
    segments.shift();
  }

  if (segments.length === 0) return null;

  const last = segments.pop() as string;
  segments.push(last.replace(/\.[a-zA-Z0-9]+$/, ""));

  const path = segments.join("/");

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export async function deleteCloudinaryImage(publicId: string) {
  const config = getConfig();

  if (!config) return;

  const cleanId = publicId.trim();
  if (!cleanId) return;

  const auth = Buffer.from(
    `${config.apiKey}:${config.apiSecret}`
  ).toString("base64");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload?public_ids=${encodeURIComponent(
      cleanId
    )}&invalidate=true`,
    {
      method: "DELETE",
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );

  // 资源本来就不存在（404）不影响业务。
  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Cloudinary 删除失败（${response.status}）：${text.slice(0, 200)}`
    );
  }
}

// 只删除“旧列表里有、新列表里已不再引用”的 Cloudinary 资源。
// 同名覆盖时旧 URL 与新 URL 的 public_id 相同，不会被误删。
export async function deleteRemovedCloudinaryAssets(
  oldUrls: (string | null | undefined)[],
  newUrls: (string | null | undefined)[]
) {
  const keep = new Set(
    newUrls
      .map((url) => cloudinaryPublicIdFromUrl(url))
      .filter((id): id is string => Boolean(id))
  );

  const removed = oldUrls.filter((url) => {
    const id = cloudinaryPublicIdFromUrl(url);
    return Boolean(id) && !keep.has(id as string);
  });

  await deleteCloudinaryUrls(removed);
}

// 批量删除一组 URL 中的 Cloudinary 图片；忽略 GitHub 等其它地址。
export async function deleteCloudinaryUrls(
  urls: (string | null | undefined)[]
) {
  const ids = Array.from(
    new Set(
      urls
        .map((url) => cloudinaryPublicIdFromUrl(url))
        .filter((id): id is string => Boolean(id))
    )
  );

  for (const id of ids) {
    try {
      await deleteCloudinaryImage(id);
    } catch (error) {
      console.error("删除 Cloudinary 图片失败：", id, error);
    }
  }
}
