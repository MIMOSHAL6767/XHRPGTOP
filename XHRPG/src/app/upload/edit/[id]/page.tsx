"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type HistoryItem = {
  version?: string;
  date?: string;
  lanzou?: string;
  pan123?: string;
};

type GameForm = {
  name: string;
  en: string;
  author: string;
  category: string;
  version: string;
  description: string;
  cover: string;
  lanzou: string;
  pan123: string;
  symbol: string;
  gameStatus: string;
  titleMode: string;
  titleLogo: string;
  detailBackground: string;
  detailBackgroundOpacity: number;
  detailBackgroundFit: string;
  tagsText: string;
  historyText: string;
  screenshotsText: string;
  status: string;
};

const initialForm: GameForm = {
  name: "",
  en: "",
  author: "",
  category: "角色扮演",
  version: "",
  description: "",
  cover: "",
  lanzou: "",
  pan123: "",
  symbol: "",
  gameStatus: "更新中",
  titleMode: "text",
  titleLogo: "",
  detailBackground: "",
  detailBackgroundOpacity: 0.35,
  detailBackgroundFit: "cover",
  tagsText: "",
  historyText: "[]",
  screenshotsText: "",
  status: "审核中",
};

const inputClass =
  "w-full min-w-0 border border-[#4a2028] bg-[#10090b] px-3 py-2.5 text-sm text-[#f8eeee] outline-none transition placeholder:text-[#755d62] focus:border-[#d64250] focus:ring-1 focus:ring-[#8b1e2d]";

const labelClass =
  "mb-2 block text-sm font-medium text-[#f0dfe2]";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-[#a52a3a] bg-[#8b1e2d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a52a3a] disabled:cursor-not-allowed disabled:opacity-50";

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function toJsonText(value: unknown): string {
  return JSON.stringify(value ?? [], null, 2);
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4 border-b border-[#4a2028] pb-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#8b1e2d] bg-[#200d12] font-mono text-sm text-[#e8a2ac]">
        {number}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-[#fff1f3]">{title}</h2>
        {description && (
          <p className="mt-1.5 text-xs leading-6 text-[#a88c91]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function ImagePreview({
  src,
  alt,
  maxHeight = "max-h-52",
}: {
  src: string;
  alt: string;
  maxHeight?: string;
}) {
  if (!src) {
    return (
      <div className="flex min-h-36 items-center justify-center border border-dashed border-[#4a2028] bg-[#10090b] px-4 text-center text-xs text-[#755d62]">
        暂无图片
      </div>
    );
  }

  return (
    <div className="mb-3 flex min-h-36 items-center justify-center border border-[#4a2028] bg-[#10090b] p-3">
      <img
        src={src}
        alt={alt}
        className={`max-w-full object-contain ${maxHeight}`}
      />
    </div>
  );
}

function ImageUploadControl({
  label,
  kind,
  slot,
  uploading,
  disabled,
  onChange,
}: {
  label: string;
  kind: "cover" | "background" | "logo" | "screenshot";
  slot?: number;
  uploading: string;
  disabled: boolean;
  onChange: (
    event: ChangeEvent<HTMLInputElement>,
    kind: "cover" | "background" | "logo" | "screenshot",
    slot?: number
  ) => void;
}) {
  const key = slot ? `${kind}-${slot}` : kind;
  const isUploading = uploading === key;

  return (
    <label className="block cursor-pointer">
      <span className="flex min-h-10 items-center justify-center gap-2 border border-[#6b2935] bg-[#241015] px-3 py-2 text-center text-xs font-medium text-[#f0dfe2] transition hover:border-[#e5484d] hover:bg-[#32121a]">
        {isUploading ? "正在上传……" : label}
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => onChange(event, kind, slot)}
      />
    </label>
  );
}

export default function SubmissionGameEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params.id ?? "");

  const [form, setForm] = useState<GameForm>(initialForm);
  const [credential, setCredential] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const updateField = useCallback(
    <K extends keyof GameForm>(key: K, value: GameForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    []
  );

  useEffect(() => {
    if (!/^[1-9]\d*$/.test(id)) {
      router.replace("/upload/edit");
      return;
    }

    const storedCredential = sessionStorage.getItem(
      `xhrpg_submission_credential_${id}`
    );

    if (
      !storedCredential ||
      !/^[a-f0-9]{48}$/i.test(storedCredential)
    ) {
      router.replace("/upload/edit");
      return;
    }

    let cancelled = false;

    async function loadGame() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/upload/edit/${id}`, {
          method: "GET",
          headers: {
            "x-submission-credential": storedCredential!,
          },
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success || !result.game) {
          if (!cancelled) {
            setError(result.message || "无法读取游戏信息。");
          }
          return;
        }

        if (cancelled) return;

        const game = result.game;
        const tags = Array.isArray(game.tags) ? game.tags : [];
        const history = Array.isArray(game.history)
          ? game.history
          : [];
        const screenshots = Array.isArray(game.screenshots)
          ? game.screenshots
          : [];

        setCredential(storedCredential!);

        setForm({
          name: toStringValue(game.name),
          en: toStringValue(game.en),
          author: toStringValue(game.author),
          category: toStringValue(game.category) || "角色扮演",
          version: toStringValue(game.version),
          description: toStringValue(game.description),
          cover: toStringValue(game.cover),
          lanzou: toStringValue(game.lanzou),
          pan123: toStringValue(game.pan123),
          symbol: toStringValue(game.symbol),
          gameStatus: toStringValue(game.gameStatus) || "更新中",
          titleMode: toStringValue(game.titleMode) || "text",
          titleLogo: toStringValue(game.titleLogo),
          detailBackground: toStringValue(game.detailBackground),
          detailBackgroundOpacity: toNumberValue(
            game.detailBackgroundOpacity,
            0.35
          ),
          detailBackgroundFit:
            toStringValue(game.detailBackgroundFit) || "cover",
          tagsText: tags
            .filter((item: unknown) => typeof item === "string")
            .join(", "),
          historyText: toJsonText(history),
          screenshotsText: screenshots
            .filter((item: unknown) => typeof item === "string")
            .join("\n"),
          status: toStringValue(game.status) || "审核中",
        });
      } catch {
        if (!cancelled) {
          setError("网络请求失败，无法读取游戏信息。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadGame();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>,
    kind: "cover" | "background" | "logo" | "screenshot",
    slot?: number
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!credential) {
      setError("投稿凭证无效，请重新验证。");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError("图片只支持 PNG、JPG、WebP 格式。");
      return;
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("图片不能为空，且不能超过 5 MB。");
      return;
    }

    const uploadKey = slot ? `${kind}-${slot}` : kind;

    setUploading(uploadKey);
    setError("");
    setMessage("");

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("kind", kind);
      data.append("credential", credential);

      if (kind === "screenshot" && slot) {
        data.append("slot", String(slot));
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.url) {
        throw new Error(result.message || "图片上传失败。");
      }

      if (kind === "cover") {
        updateField("cover", result.url);
      } else if (kind === "background") {
        updateField("detailBackground", result.url);
      } else if (kind === "logo") {
        updateField("titleLogo", result.url);
      } else {
        const current = form.screenshotsText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);

        const index = (slot ?? 1) - 1;

        while (current.length <= index) {
          current.push("");
        }

        current[index] = result.url;

        updateField("screenshotsText", current.filter(Boolean).join("\n"));
      }

      setMessage("图片上传成功。保存游戏信息后才会更新资料。");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "图片上传失败，请重试。"
      );
    } finally {
      setUploading("");
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!credential) {
      setError("投稿凭证无效，请重新验证。");
      return;
    }

    if (!form.name.trim()) {
      setError("游戏名称不能为空。");
      return;
    }

    if (!form.author.trim()) {
      setError("作者不能为空。");
      return;
    }

    let history: HistoryItem[];

    try {
      const parsed: unknown = JSON.parse(form.historyText || "[]");

      if (
        !Array.isArray(parsed) ||
        parsed.length > 100 ||
        !parsed.every(
          (item) =>
            item !== null &&
            typeof item === "object" &&
            !Array.isArray(item)
        )
      ) {
        throw new Error("更新记录必须是 JSON 对象数组。");
      }

      history = parsed as HistoryItem[];
    } catch {
      setError("更新记录 JSON 格式错误，请检查后再保存。");
      return;
    }

    const tags = form.tagsText
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const screenshots = form.screenshotsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/upload/edit/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-submission-credential": credential,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          en: form.en,
          author: form.author.trim(),
          category: form.category,
          version: form.version,
          description: form.description,
          cover: form.cover,
          lanzou: form.lanzou,
          pan123: form.pan123,
          symbol: form.symbol,
          gameStatus: form.gameStatus,
          titleMode: form.titleMode,
          titleLogo: form.titleLogo,
          detailBackground: form.detailBackground,
          detailBackgroundOpacity: form.detailBackgroundOpacity,
          detailBackgroundFit: form.detailBackgroundFit,
          tags,
          history,
          screenshots,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "保存失败。");
      }

      setMessage(result.message || "修改已保存，等待站长审核。");

      window.setTimeout(() => {
        router.push("/upload");
        router.refresh();
      }, 1200);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "保存失败，请稍后重试。"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#10090b] px-4 py-12 text-[#f8eeee]">
        <div className="mx-auto max-w-4xl border border-[#4a2028] bg-[#160c0f] p-8">
          <p className="text-xs tracking-[0.2em] text-[#c77783]">
            XHRPG · SUBMISSION
          </p>
          <p className="mt-5 text-sm text-[#c7b5b8]">
            正在验证凭证并读取游戏信息……
          </p>
          <div className="mt-5 h-1 overflow-hidden bg-[#32121a]">
            <div className="h-full w-1/2 animate-pulse bg-[#a52a3a]" />
          </div>
        </div>
      </main>
    );
  }

  if (error && !credential) {
    return (
      <main className="min-h-screen bg-[#10090b] px-4 py-12 text-[#f8eeee]">
        <div className="mx-auto max-w-xl border border-[#4a2028] bg-[#160c0f] p-6 sm:p-8">
          <p className="text-xs tracking-[0.2em] text-[#c77783]">
            XHRPG · ACCESS
          </p>
          <h1 className="mt-4 text-xl font-bold">无法进入编辑页面</h1>
          <p className="mt-4 border-l-2 border-[#8b1e2d] bg-[#200d12] p-3 text-sm leading-7 text-[#ffb8c1]">
            {error}
          </p>
          <Link
            href="/upload/edit"
            className="mt-6 inline-flex border border-[#a52a3a] bg-[#8b1e2d] px-4 py-3 text-sm font-semibold hover:bg-[#a52a3a]"
          >
            返回重新验证凭证
          </Link>
        </div>
      </main>
    );
  }

  const screenshots = form.screenshotsText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-[#10090b] text-[#f8eeee]">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#4a2028] pb-5">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#c77783]">
              XHRPG · GAME SUBMISSION
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              编辑游戏投稿
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#bba9ac]">
              更新游戏资料、图片和下载链接。
            </p>
          </div>

          <Link
            href="/upload"
            className="inline-flex min-h-10 items-center border border-[#4a2028] px-4 py-2 text-sm text-[#e5cfd3] transition hover:border-[#a52a3a] hover:bg-[#241015]"
          >
            ← 返回投稿中心
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="border border-[#4a2028] bg-[#160c0f] p-4">
            <p className="text-xs text-[#9e858a]">当前游戏</p>
            <p className="mt-2 truncate font-semibold">
              {form.name || "尚未命名"}
            </p>
          </div>

          <div className="border border-[#4a2028] bg-[#160c0f] p-4">
            <p className="text-xs text-[#9e858a]">审核状态</p>
            <p className="mt-2 font-semibold text-[#e8a2ac]">
              {form.status}
            </p>
          </div>

          <div className="border border-[#4a2028] bg-[#160c0f] p-4">
            <p className="text-xs text-[#9e858a]">编辑方式</p>
            <p className="mt-2 font-semibold">专属凭证验证</p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 border-l-2 border-[#e5484d] bg-[#2a1015] p-4 text-sm leading-6 text-[#ffb8c1]"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 border-l-2 border-[#a52a3a] bg-[#201015] p-4 text-sm leading-6 text-[#f4c2ca]"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <section className="border border-[#4a2028] bg-[#160c0f] p-5 sm:p-7">
            <SectionHeading
              number="01"
              title="基本信息"
              description="填写游戏名称、作者、分类和版本等主要资料。"
            />

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className={labelClass}>游戏名称 *</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  maxLength={200}
                  required
                  placeholder="请输入游戏名称"
                />
              </div>

              <div>
                <label className={labelClass}>英文名称</label>
                <input
                  className={inputClass}
                  value={form.en}
                  onChange={(e) => updateField("en", e.target.value)}
                  maxLength={200}
                  placeholder="可选"
                />
              </div>

              <div>
                <label className={labelClass}>作者 *</label>
                <input
                  className={inputClass}
                  value={form.author}
                  onChange={(e) => updateField("author", e.target.value)}
                  maxLength={200}
                  required
                  placeholder="游戏作者"
                />
              </div>

              <div>
                <label className={labelClass}>游戏版本</label>
                <input
                  className={inputClass}
                  value={form.version}
                  onChange={(e) => updateField("version", e.target.value)}
                  maxLength={100}
                  placeholder="例如：1.0.0"
                />
              </div>

              <div>
                <label className={labelClass}>游戏分类</label>
                <input
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  placeholder="例如：角色扮演、解谜冒险"
                  maxLength={100}
                />
              </div>

              <div>
                <label className={labelClass}>游戏进度</label>
                <select
                  className={inputClass}
                  value={form.gameStatus}
                  onChange={(e) => updateField("gameStatus", e.target.value)}
                >
                  <option>完结</option>
                  <option>更新中</option>
                  <option>Demo</option>
                  <option>弃坑</option>
                  <option>断更</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>蓝奏云下载链接</label>
                <input
                  className={inputClass}
                  value={form.lanzou}
                  onChange={(e) => updateField("lanzou", e.target.value)}
                  maxLength={2000}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className={labelClass}>123 云盘下载链接</label>
                <input
                  className={inputClass}
                  value={form.pan123}
                  onChange={(e) => updateField("pan123", e.target.value)}
                  maxLength={2000}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className={labelClass}>标签</label>
                <input
                  className={inputClass}
                  value={form.tagsText}
                  onChange={(e) => updateField("tagsText", e.target.value)}
                  placeholder="使用逗号分隔多个标签"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label className={labelClass}>游戏介绍</label>
                <textarea
                  className={inputClass}
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                  rows={7}
                  maxLength={30000}
                  placeholder="介绍游戏剧情、玩法、制作情况等内容……"
                />
                <p className="mt-2 text-right text-xs text-[#755d62]">
                  {form.description.length}/30000
                </p>
              </div>
            </div>
          </section>

          <section className="border border-[#4a2028] bg-[#160c0f] p-5 sm:p-7">
            <SectionHeading
              number="02"
              title="图片资源"
              description="管理封面、详情背景、标题图片和游戏预览截图。图片上传成功后，还需要保存修改才能更新游戏资料。"
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="min-w-0 border border-[#4a2028] bg-[#10090b] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">游戏封面</h3>
                  <span className="text-xs text-[#9e858a]">主图</span>
                </div>
                <ImagePreview src={form.cover} alt="游戏封面预览" />
                <ImageUploadControl
                  label="选择并上传封面"
                  kind="cover"
                  uploading={uploading}
                  disabled={!!uploading}
                  onChange={uploadImage}
                />
                {uploading === "cover" && (
                  <p className="mt-2 text-xs text-[#e8a2ac]">正在上传封面……</p>
                )}
                <label className={`${labelClass} mt-4`}>封面 URL</label>
                <input
                  className={inputClass}
                  value={form.cover}
                  onChange={(e) => updateField("cover", e.target.value)}
                  placeholder="封面图片地址"
                />
              </div>

              <div className="min-w-0 border border-[#4a2028] bg-[#10090b] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">详情背景</h3>
                  <span className="text-xs text-[#9e858a]">背景图</span>
                </div>
                <ImagePreview
                  src={form.detailBackground}
                  alt="详情背景预览"
                  maxHeight="max-h-52"
                />
                <ImageUploadControl
                  label="选择并上传背景"
                  kind="background"
                  uploading={uploading}
                  disabled={!!uploading}
                  onChange={uploadImage}
                />
                {uploading === "background" && (
                  <p className="mt-2 text-xs text-[#e8a2ac]">正在上传背景……</p>
                )}
                <label className={`${labelClass} mt-4`}>背景图片 URL</label>
                <input
                  className={inputClass}
                  value={form.detailBackground}
                  onChange={(e) =>
                    updateField("detailBackground", e.target.value)
                  }
                  placeholder="背景图片地址"
                />
              </div>

              <div className="min-w-0 border border-[#4a2028] bg-[#10090b] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">标题图片</h3>
                  <span className="text-xs text-[#9e858a]">可选</span>
                </div>
                <ImagePreview
                  src={form.titleLogo}
                  alt="标题图片预览"
                  maxHeight="max-h-40"
                />
                <ImageUploadControl
                  label="选择并上传标题图片"
                  kind="logo"
                  uploading={uploading}
                  disabled={!!uploading}
                  onChange={uploadImage}
                />
                {uploading === "logo" && (
                  <p className="mt-2 text-xs text-[#e8a2ac]">正在上传标题图片……</p>
                )}
                <label className={`${labelClass} mt-4`}>标题图片 URL</label>
                <input
                  className={inputClass}
                  value={form.titleLogo}
                  onChange={(e) => updateField("titleLogo", e.target.value)}
                  placeholder="标题图片地址"
                />
              </div>
            </div>

            <div className="mt-6 border-t border-[#4a2028] pt-6">
              <h3 className="mb-4 text-sm font-semibold">详情页显示设置</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className={labelClass}>标题显示方式</label>
                  <select
                    className={inputClass}
                    value={form.titleMode}
                    onChange={(e) => updateField("titleMode", e.target.value)}
                  >
                    <option value="text">文字标题</option>
                    <option value="logo">图片标题</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>详情背景适配方式</label>
                  <select
                    className={inputClass}
                    value={form.detailBackgroundFit}
                    onChange={(e) =>
                      updateField("detailBackgroundFit", e.target.value)
                    }
                  >
                    <option value="cover">覆盖容器</option>
                    <option value="contain">完整显示</option>
                    <option value="fill">拉伸填充</option>
                  </select>
                </div>

                <div className="border border-[#4a2028] bg-[#10090b] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label
                      htmlFor="background-opacity"
                      className="text-sm font-medium"
                    >
                      背景透明度
                    </label>
                    <span className="font-mono text-sm text-[#e8a2ac]">
                      {form.detailBackgroundOpacity.toFixed(2)}
                    </span>
                  </div>
                  <input
                    id="background-opacity"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={form.detailBackgroundOpacity}
                    onChange={(e) =>
                      updateField(
                        "detailBackgroundOpacity",
                        Number(e.target.value)
                      )
                    }
                    className="w-full accent-[#a52a3a]"
                  />
                  <div className="mt-2 flex justify-between text-xs text-[#755d62]">
                    <span>透明</span>
                    <span>不透明</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-[#4a2028] pt-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">游戏预览图</h3>
                <p className="mt-1 text-xs leading-6 text-[#9e858a]">
                  每行一个图片 URL。上传第 N 张会替换对应位置；保存游戏信息后，变更才会写入资料。
                </p>
              </div>

              {screenshots.length > 0 && (
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {screenshots.map((url, index) => (
                    <div
                      key={`${index}-${url}`}
                      className="min-w-0 border border-[#4a2028] bg-[#10090b] p-2"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-[#c77783]">
                          预览图 {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...screenshots];
                            next.splice(index, 1);
                            updateField("screenshotsText", next.join("\n"));
                          }}
                          className="text-xs text-[#b98c94] hover:text-[#ffb8c1]"
                          aria-label={`删除第 ${index + 1} 张预览图`}
                        >
                          移除
                        </button>
                      </div>
                      <img
                        src={url}
                        alt={`游戏预览图 ${index + 1}`}
                        className="h-28 w-full object-contain"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <label className={labelClass}>预览图 URL 列表</label>
                  <textarea
                    className={`${inputClass} font-mono`}
                    value={form.screenshotsText}
                    onChange={(e) =>
                      updateField("screenshotsText", e.target.value)
                    }
                    rows={7}
                    placeholder={"每行填写一张图片 URL"}
                    spellCheck={false}
                  />
                </div>

                <div className="border border-[#4a2028] bg-[#10090b] p-4">
                  <h4 className="mb-2 text-sm font-semibold">上传预览图</h4>
                  <p className="mb-4 text-xs leading-6 text-[#9e858a]">
                    选择编号后上传图片。支持 PNG、JPG、WebP，单张不超过 5 MB。
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((slot) => (
                      <ImageUploadControl
                        key={slot}
                        label={
                          uploading === `screenshot-${slot}`
                            ? `第 ${slot} 张上传中`
                            : `上传第 ${slot} 张`
                        }
                        kind="screenshot"
                        slot={slot}
                        uploading={uploading}
                        disabled={!!uploading}
                        onChange={uploadImage}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-[#4a2028] bg-[#160c0f] p-5 sm:p-7">
            <SectionHeading
              number="03"
              title="更新记录"
              description="编辑游戏版本历史。内容必须为 JSON 对象数组，最多 100 条记录。"
            />

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "版本号", value: "version" },
                { label: "更新日期", value: "date" },
                { label: "蓝奏云链接", value: "lanzou" },
                { label: "123 云盘链接", value: "pan123" },
              ].map((item) => (
                <div
                  key={item.value}
                  className="border border-[#4a2028] bg-[#10090b] p-3"
                >
                  <p className="text-xs text-[#9e858a]">{item.label}</p>
                  <code className="mt-1 block break-all text-xs text-[#e8a2ac]">
                    {item.value}
                  </code>
                </div>
              ))}
            </div>

            <label className={labelClass}>更新记录 JSON</label>
            <textarea
              className={`${inputClass} min-h-64 font-mono text-xs leading-6`}
              value={form.historyText}
              onChange={(e) => updateField("historyText", e.target.value)}
              rows={12}
              spellCheck={false}
              placeholder={`[
  {
    "version": "1.0.0",
    "date": "2026-01-01",
    "lanzou": "",
    "pan123": ""
  }
]`}
            />

            <p className="mt-2 text-xs leading-6 text-[#9e858a]">
              如果没有更新记录，可以保留空数组 []。请确保 JSON 语法正确，例如字符串使用双引号。
            </p>
          </section>

          <section className="border border-[#6b2935] bg-[#200d12] p-5 sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-bold">保存投稿修改</h2>
                <p className="mt-2 text-xs leading-6 text-[#c7b5b8]">
                  保存后，修改内容将提交审核。图片上传本身不会自动保存游戏资料。
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center border border-[#4a2028] px-5 py-2.5 text-sm text-[#e5cfd3] transition hover:bg-[#32121a]"
                  onClick={() => router.push("/upload")}
                >
                  返回投稿中心
                </button>

                <button
                  type="submit"
                  className={buttonClass}
                  disabled={saving || !!uploading}
                >
                  {saving
                    ? "正在保存……"
                    : uploading
                      ? "请等待图片上传完成"
                      : "保存修改并提交审核 →"}
                </button>
              </div>
            </div>
          </section>
        </form>

        <footer className="mt-8 border-t border-[#4a2028] pt-5 text-center text-xs text-[#755d62]">
          XHRPG Archive · 喜灰 RPG 档案馆
        </footer>
      </div>
    </main>
  );
}
