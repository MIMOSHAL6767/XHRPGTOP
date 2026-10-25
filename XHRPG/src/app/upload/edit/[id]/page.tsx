
"use client";

import type { ChangeEvent, FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useRef,
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
  screenshots: string[];
  history: HistoryItem[];
  status: string;
};

type ScreenshotItem = {
  url: string;
  file?: File;
  preview?: string;
};

type UploadKind = "cover" | "background" | "logo" | "screenshot";

const GAME_STATUSES = ["完结", "更新中", "Demo", "弃坑", "断更"];
const MAX_SCREENSHOTS = 5;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
  detailBackgroundOpacity: 35,
  detailBackgroundFit: "cover",
  tagsText: "",
  screenshots: [],
  history: [],
  status: "审核中",
};

const inputClass =
  "mt-2 block w-full min-w-0 border border-[#4a2028] bg-[#10090b] px-3 py-2.5 text-sm text-[#f8eeee] outline-none focus:border-[#e5484d] disabled:opacity-50";

const labelClass =
  "block min-w-0 text-sm font-medium text-[#f0dfe2]";

const buttonClass =
  "border border-[#a52a3a] bg-[#8b1e2d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a52a3a] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "border border-[#4a2028] bg-[#10090b] px-3 py-2 text-sm text-[#e5cfd3] transition hover:border-[#a52a3a] hover:bg-[#241015] disabled:cursor-not-allowed disabled:opacity-40";

const sectionClass =
  "mt-6 border border-[#4a2028] bg-[#160c0f] p-4 sm:p-6";

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumberValue(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeGameStatus(value: unknown): string {
  return typeof value === "string" && GAME_STATUSES.includes(value)
    ? value
    : "更新中";
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(
            parsed
              .filter(
                (item): item is string => typeof item === "string"
              )
              .map((item) => item.trim())
              .filter(Boolean)
          )
        );
      }
    } catch {
      // 兼容旧数据：标签可能以逗号或换行分隔。
    }

    return Array.from(
      new Set(
        value
          .split(/[,，、\n]/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  return [];
}

function parseScreenshots(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (
        item &&
        typeof item === "object" &&
        "url" in item &&
        typeof item.url === "string"
      ) {
        return item.url.trim();
      }

      return "";
    })
    .filter(Boolean);
}

function parseHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null &&
        typeof item === "object" &&
        !Array.isArray(item)
    )
    .map((item) => ({
      version: toStringValue(item.version),
      date: toStringValue(item.date),
      lanzou: toStringValue(item.lanzou),
      pan123: toStringValue(item.pan123),
    }));
}

function validateImage(file: File): boolean {
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    alert("图片只支持 PNG、JPG、WebP 格式。");
    return false;
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    alert("图片不能为空，且不能超过 5 MB。");
    return false;
  }

  return true;
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

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [tagInput, setTagInput] = useState("");

  const previewUrlsRef = useRef<Set<string>>(new Set());

  const createPreview = useCallback((file: File): string => {
    const preview = URL.createObjectURL(file);
    previewUrlsRef.current.add(preview);
    return preview;
  }, []);

  const releasePreview = useCallback((url: string) => {
    if (!url.startsWith("blob:")) return;

    if (previewUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      previewUrlsRef.current.delete(url);
    }
  }, []);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      previewUrlsRef.current.clear();
    };
  }, []);

  const updateField = useCallback(
    <K extends keyof GameForm>(key: K, value: GameForm[K]) => {
      setForm((current) => ({
        ...current,
        [key]: value,
      }));
    },
    []
  );

  // 读取凭证并加载对应游戏。
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

    const validCredential: string = storedCredential;
    let cancelled = false;

    async function loadGame() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/upload/edit/${id}`, {
          method: "GET",
          headers: {
            "x-submission-credential": validCredential,
          },
          cache: "no-store",
        });

        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success || !result?.game) {
          throw new Error(
            result?.message || "无法读取游戏信息，请检查投稿凭证。"
          );
        }

        if (cancelled) return;

        const game = result.game;
        const tags = parseTags(game.tags);
        const history = parseHistory(game.history);
        const screenshotUrls = parseScreenshots(game.screenshots);

        // 保留旧数据，但正常新增时限制为 5 张。
        setCredential(validCredential);

        const rawOpacity = toNumberValue(
          game.detailBackgroundOpacity,
          35
        );

        // 兼容旧版以 0—1 保存的透明度数据。
        const normalizedOpacity =
          rawOpacity > 0 && rawOpacity <= 1
            ? rawOpacity * 100
            : rawOpacity;

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
          gameStatus: normalizeGameStatus(game.gameStatus),
          titleMode:
            game.titleMode === "logo" || game.titleMode === "image"
              ? "logo"
              : "text",
          titleLogo: toStringValue(game.titleLogo),
          detailBackground: toStringValue(game.detailBackground),
          detailBackgroundOpacity: Math.min(
            100,
            Math.max(0, normalizedOpacity)
          ),
          detailBackgroundFit:
            game.detailBackgroundFit === "contain" ? "contain" : "cover",
          tagsText: tags.join(", "),
          screenshots: screenshotUrls,
          history,
          status: toStringValue(game.status) || "审核中",
        });

        setCoverPreview(toStringValue(game.cover));
        setBackgroundPreview(toStringValue(game.detailBackground));
        setLogoPreview(toStringValue(game.titleLogo));

        setScreenshots(
          screenshotUrls.map((url) => ({
            url,
          }))
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "读取游戏信息失败。"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadGame();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  function selectImage(
    event: ChangeEvent<HTMLInputElement>,
    kind: "cover" | "background" | "logo"
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!validateImage(file)) return;

    if (kind === "logo" && file.type.toLowerCase() !== "image/png") {
      alert("标题图片必须使用 PNG 格式，以便保留透明背景。");
      return;
    }

    const preview = createPreview(file);

    if (kind === "cover") {
      releasePreview(coverPreview);
      setCoverFile(file);
      setCoverPreview(preview);
    } else if (kind === "background") {
      releasePreview(backgroundPreview);
      setBackgroundFile(file);
      setBackgroundPreview(preview);
    } else {
      releasePreview(logoPreview);
      setLogoFile(file);
      setLogoPreview(preview);
    }

    setError("");
    setMessage("");
  }

  function addTag() {
    const value = tagInput.trim();

    if (!value) {
      setError("请输入标签名称。");
      return;
    }

    const tags = form.tagsText
      .split(/[,，、\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (tags.includes(value)) {
      setError("这个标签已经存在。");
      return;
    }

    updateField("tagsText", [...tags, value].join(", "));
    setTagInput("");
    setError("");
    setMessage("");
  }

  function removeTag(tagToRemove: string) {
    const tags = form.tagsText
      .split(/[,，、\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    updateField(
      "tagsText",
      tags.filter((tag) => tag !== tagToRemove).join(", ")
    );

    setError("");
    setMessage("");
  }

  function changeHistory(
    index: number,
    key: keyof HistoryItem,
    value: string
  ) {
    updateField(
      "history",
      form.history.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item
      )
    );
  }

  function addHistory() {
    if (form.history.length >= 100) {
      setError("历史版本最多支持 100 条。");
      return;
    }

    updateField("history", [
      ...form.history,
      {
        version: "",
        date: "",
        lanzou: "",
        pan123: "",
      },
    ]);

    setError("");
    setMessage("");
  }

  function removeHistory(index: number) {
    updateField(
      "history",
      form.history.filter((_, itemIndex) => itemIndex !== index)
    );

    setError("");
    setMessage("");
  }

  // 预览图上限：5 张；多选时只接收剩余名额内的图片。
  function addScreenshots(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) return;

    const remaining = MAX_SCREENSHOTS - screenshots.length;

    if (remaining <= 0) {
      setError("详情预览图最多支持 5 张，请先删除已有图片。");
      return;
    }

    const selectedFiles = files.slice(0, remaining);

    const validFiles = selectedFiles.filter(validateImage);

    if (!validFiles.length) {
      if (files.length > remaining) {
        setError(`详情预览图最多支持 5 张，本次最多还能添加 ${remaining} 张。`);
      }
      return;
    }

    const newItems: ScreenshotItem[] = validFiles.map((file) => ({
      url: "",
      file,
      preview: createPreview(file),
    }));

    setScreenshots((current) => [
      ...current,
      ...newItems,
    ]);

    if (files.length > remaining) {
      setError(
        `详情预览图最多支持 5 张，本次已截取前 ${remaining} 张进行处理。`
      );
    } else {
      setError("");
    }

    setMessage("");
  }

  function removeScreenshot(index: number) {
    const item = screenshots[index];

    if (item?.preview) {
      releasePreview(item.preview);
    }

    setScreenshots((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );

    setError("");
    setMessage("");
  }

  function moveScreenshot(index: number, direction: -1 | 1) {
    setScreenshots((current) => {
      const target = index + direction;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });

    setError("");
    setMessage("");
  }

  // 投稿用户上传图片时携带 credential，不使用站长后台的上传权限。
  async function uploadImage(
    file: File,
    kind: UploadKind,
    slot?: number
  ): Promise<string> {
    const data = new FormData();

    data.append("file", file);
    data.append("kind", kind);
    data.append("credential", credential);

    if (kind === "screenshot" && slot !== undefined) {
      data.append("slot", String(slot));
    }

    const response = await fetch("/api/upload", {
      method: "POST",
      body: data,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success || !result?.url) {
      throw new Error(
        result?.message ||
          `${kind} 图片上传失败（HTTP ${response.status}）。`
      );
    }

    if (
      typeof result.url !== "string" ||
      !result.url.startsWith("https://raw.githubusercontent.com/")
    ) {
      throw new Error(
        "上传接口没有返回有效的 GitHub Raw 图片地址。"
      );
    }

    return result.url;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!credential || !/^[a-f0-9]{48}$/i.test(credential)) {
      setError("投稿凭证无效，请返回投稿编辑入口重新验证。");
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

    if (!GAME_STATUSES.includes(form.gameStatus)) {
      setError("请选择有效的游戏进度。");
      return;
    }

    // 防止旧数据或其他异常状态绕过前端添加限制。
    if (screenshots.length > MAX_SCREENSHOTS) {
      setError("详情预览图最多支持 5 张，请删除多余图片后再保存。");
      return;
    }

    if (
      form.titleMode === "logo" &&
      !logoFile &&
      !logoPreview
    ) {
      setError("当前选择了图片标题模式，请先上传标题 PNG。");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      let cover = form.cover;

      if (coverFile) {
        setUploading("正在上传游戏封面……");
        cover = await uploadImage(coverFile, "cover");
      }

      let detailBackground = form.detailBackground;

      if (backgroundFile) {
        setUploading("正在上传详情背景……");
        detailBackground = await uploadImage(
          backgroundFile,
          "background"
        );
      }

      let titleLogo = form.titleLogo;

      if (logoFile) {
        setUploading("正在上传标题图片……");
        titleLogo = await uploadImage(logoFile, "logo");
      }

      const screenshotUrls: string[] = [];

      for (let index = 0; index < screenshots.length; index++) {
        const item = screenshots[index];

        if (item.file) {
          setUploading(
            `正在上传详情预览图 ${index + 1}/${screenshots.length}……`
          );

          const url = await uploadImage(
            item.file,
            "screenshot",
            index + 1
          );

          screenshotUrls.push(url);
        } else if (item.url) {
          screenshotUrls.push(item.url);
        }
      }

      const tags = Array.from(
        new Set(
          form.tagsText
            .split(/[,，、\n]/)
            .map((tag) => tag.trim())
            .filter(Boolean)
        )
      );

      const payload = {
        name: form.name.trim(),
        en: form.en.trim(),
        author: form.author.trim(),
        category: form.category.trim(),
        version: form.version.trim(),
        description: form.description,
        cover,
        lanzou: form.lanzou.trim(),
        pan123: form.pan123.trim(),
        symbol: form.symbol,
        gameStatus: form.gameStatus,
        titleMode: form.titleMode,
        titleLogo: titleLogo || null,
        detailBackground: detailBackground || null,
        detailBackgroundOpacity: Math.min(
          100,
          Math.max(0, Number(form.detailBackgroundOpacity))
        ),
        detailBackgroundFit:
          form.detailBackgroundFit === "contain" ? "contain" : "cover",
        tags,
        history: form.history,
        screenshots: screenshotUrls,
      };

      setUploading("正在保存游戏资料……");

      const response = await fetch(`/api/upload/edit/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-submission-credential": credential,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "保存游戏资料失败。");
      }

      if (coverFile) {
        releasePreview(coverPreview);
        setCoverPreview(cover);
      }

      if (backgroundFile) {
        releasePreview(backgroundPreview);
        setBackgroundPreview(detailBackground);
      }

      if (logoFile) {
        releasePreview(logoPreview);
        setLogoPreview(titleLogo);
      }

      screenshots.forEach((item) => {
        if (item.preview) {
          releasePreview(item.preview);
        }
      });

      setScreenshots(
        screenshotUrls.map((url) => ({
          url,
        }))
      );

      setForm((current) => ({
        ...current,
        cover,
        detailBackground,
        titleLogo,
        screenshots: screenshotUrls,
      }));

      setCoverFile(null);
      setBackgroundFile(null);
      setLogoFile(null);

      setMessage(
        result.message || "修改已保存，等待站长审核。"
      );

      window.setTimeout(() => {
        router.push("/upload");
        router.refresh();
      }, 1500);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "保存失败，请检查网络连接后重试。"
      );
    } finally {
      setSaving(false);
      setUploading("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#10090b] px-4 py-12 text-[#f8eeee]">
        <div className="mx-auto max-w-5xl border border-[#4a2028] bg-[#160c0f] p-8">
          <p className="text-sm tracking-widest text-[#c77783]">
            XHRPG · SUBMISSION
          </p>

          <h1 className="mt-3 text-2xl font-bold">
            正在加载游戏资料……
          </h1>

          <p className="mt-3 text-sm text-[#c7b5b8]">
            正在验证投稿凭证并读取对应游戏，请稍候。
          </p>
        </div>
      </main>
    );
  }

  if (error && !credential) {
    return (
      <main className="min-h-screen bg-[#10090b] px-4 py-12 text-[#f8eeee]">
        <div className="mx-auto max-w-xl border border-[#4a2028] bg-[#160c0f] p-6 sm:p-8">
          <h1 className="text-xl font-bold">
            无法进入编辑页面
          </h1>

          <p
            role="alert"
            className="mt-4 text-sm leading-7 text-[#ffb8c1]"
          >
            {error}
          </p>

          <Link
            href="/upload/edit"
            className="mt-6 inline-block text-sm text-[#e8a2ac] hover:text-white"
          >
            ← 返回重新验证凭证
          </Link>
        </div>
      </main>
    );
  }

  const normalizedTags = Array.from(
    new Set(
      form.tagsText
        .split(/[,，、\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );

  return (
    <main className="min-h-screen bg-[#10090b] px-3 py-6 text-[#f8eeee] sm:px-5 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="border border-[#4a2028] bg-[#160c0f] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs tracking-[0.22em] text-[#c77783]">
                XHRPG · GAME SUBMISSION
              </p>

              <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
                编辑游戏投稿
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#c7b5b8]">
                修改游戏信息、图片资源和历史版本。保存后将按照投稿审核流程处理。
              </p>
            </div>

            <div className="shrink-0 border border-[#4a2028] px-4 py-3">
              <p className="text-xs text-[#9e858a]">
                当前审核状态
              </p>

              <p className="mt-1 text-sm font-semibold text-[#e8a2ac]">
                {form.status}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#4a2028] pt-4 text-xs text-[#bba9ac]">
            <span className="border border-[#4a2028] px-2 py-1">
              基本信息
            </span>
            <span className="border border-[#4a2028] px-2 py-1">
              图片资源
            </span>
            <span className="border border-[#4a2028] px-2 py-1">
              详情页设置
            </span>
            <span className="border border-[#4a2028] px-2 py-1">
              更新记录
            </span>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-5 border border-[#8b1e2d] bg-[#2a1015] p-4 text-sm leading-6 text-[#ffb8c1]"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mt-5 border border-[#4a2028] bg-[#201015] p-4 text-sm leading-6 text-[#f4c2ca]"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* 01 / 基本信息 */}
          <section className={sectionClass}>
            <div className="mb-5 border-b border-[#4a2028] pb-3">
              <h2 className="text-lg font-bold">01 / 基本信息</h2>

              <p className="mt-2 text-xs leading-6 text-[#9e858a]">
                填写游戏名称、作者、分类、开发进度和下载地址。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className={labelClass}>
                游戏名称 *
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  maxLength={200}
                  required
                  disabled={saving}
                />
              </label>

              <label className={labelClass}>
                英文名称
                <input
                  className={inputClass}
                  value={form.en}
                  onChange={(e) => updateField("en", e.target.value)}
                  maxLength={200}
                  disabled={saving}
                />
              </label>

              <label className={labelClass}>
                作者 *
                <input
                  className={inputClass}
                  value={form.author}
                  onChange={(e) => updateField("author", e.target.value)}
                  maxLength={200}
                  required
                  disabled={saving}
                />
              </label>

              <label className={labelClass}>
                版本
                <input
                  className={inputClass}
                  value={form.version}
                  onChange={(e) => updateField("version", e.target.value)}
                  maxLength={100}
                  disabled={saving}
                />
              </label>

              <label className={labelClass}>
                游戏分类
                <input
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  placeholder="例如：角色扮演、解谜冒险"
                  maxLength={100}
                  disabled={saving}
                />
              </label>

              <label className={labelClass}>
                游戏进度
                <select
                  className={inputClass}
                  value={form.gameStatus}
                  onChange={(e) => updateField("gameStatus", e.target.value)}
                  disabled={saving}
                >
                  {GAME_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                蓝奏云下载链接
                <input
                  className={inputClass}
                  value={form.lanzou}
                  onChange={(e) => updateField("lanzou", e.target.value)}
                  maxLength={2000}
                  disabled={saving}
                />
              </label>

              <label className={labelClass}>
                123 云盘下载链接
                <input
                  className={inputClass}
                  value={form.pan123}
                  onChange={(e) => updateField("pan123", e.target.value)}
                  maxLength={2000}
                  disabled={saving}
                />
              </label>

              <label className={labelClass}>
                游戏标识
                <input
                  className={inputClass}
                  value={form.symbol}
                  onChange={(e) => updateField("symbol", e.target.value)}
                  maxLength={200}
                  disabled={saving}
                />
              </label>
            </div>

            <label className={`${labelClass} mt-5`}>
              游戏简介
              <textarea
                className={inputClass}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={7}
                maxLength={30000}
                placeholder="介绍游戏的故事、玩法、制作情况等。"
                disabled={saving}
              />
            </label>
          </section>

          {/* 02 / 游戏标签 */}
          <section className={sectionClass}>
            <div className="mb-5 border-b border-[#4a2028] pb-3">
              <h2 className="text-lg font-bold">02 / 游戏标签</h2>

              <p className="mt-2 text-xs leading-6 text-[#9e858a]">
                输入标签后点击添加，也可以在标签列表中删除。标签修改会在保存资料时生效。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className={`${inputClass} mt-0 flex-1`}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="例如：像素、恐怖、解谜、长篇"
                disabled={saving}
              />

              <button
                type="button"
                className={buttonClass}
                onClick={addTag}
                disabled={saving}
              >
                ＋ 添加标签
              </button>
            </div>

            {normalizedTags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {normalizedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex max-w-full items-center gap-2 border border-[#4a2028] bg-[#10090b] px-3 py-2 text-sm"
                  >
                    <span className="break-all">{tag}</span>

                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      disabled={saving}
                      aria-label={`删除标签 ${tag}`}
                      className="text-lg leading-none text-[#ff8194] hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 border border-dashed border-[#4a2028] p-4 text-sm text-[#9e858a]">
                暂无标签，可以在上方添加。
              </p>
            )}

            <p className="mt-3 text-xs text-[#9e858a]">
              当前共 {normalizedTags.length} 个标签。
            </p>
          </section>

          {/* 03 / 图片资源 */}
          <section className={sectionClass}>
            <div className="mb-5 border-b border-[#4a2028] pb-3">
              <h2 className="text-lg font-bold">03 / 图片资源</h2>

              <p className="mt-2 text-xs leading-6 text-[#9e858a]">
                支持 PNG、JPG、WebP，单张图片最大 5 MB。新选择的图片会在保存时上传。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="min-w-0 border border-[#4a2028] p-4">
                <h3 className="font-semibold">游戏封面</h3>

                <div className="mt-3 flex min-h-48 items-center justify-center border border-[#4a2028] bg-[#10090b] p-3">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="游戏封面预览"
                      className="max-h-64 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm text-[#9e858a]">暂无封面</span>
                  )}
                </div>

                <label className="mt-4 block text-sm text-[#c7b5b8]">
                  选择新封面
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="mt-2 block w-full min-w-0 text-xs file:mr-3 file:border-0 file:bg-[#8b1e2d] file:px-3 file:py-2 file:text-white"
                    disabled={saving}
                    onChange={(e) => selectImage(e, "cover")}
                  />
                </label>

                {coverFile && (
                  <p className="mt-2 break-all text-xs text-[#e8a2ac]">
                    待上传：{coverFile.name}
                  </p>
                )}
              </div>

              <div className="min-w-0 border border-[#4a2028] p-4">
                <h3 className="font-semibold">详情背景</h3>

                <div className="mt-3 flex min-h-48 items-center justify-center border border-[#4a2028] bg-[#10090b] p-3">
                  {backgroundPreview ? (
                    <img
                      src={backgroundPreview}
                      alt="详情背景预览"
                      className="max-h-64 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm text-[#9e858a]">暂无背景</span>
                  )}
                </div>

                <label className="mt-4 block text-sm text-[#c7b5b8]">
                  选择新背景
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="mt-2 block w-full min-w-0 text-xs file:mr-3 file:border-0 file:bg-[#8b1e2d] file:px-3 file:py-2 file:text-white"
                    disabled={saving}
                    onChange={(e) => selectImage(e, "background")}
                  />
                </label>

                {backgroundFile && (
                  <p className="mt-2 break-all text-xs text-[#e8a2ac]">
                    待上传：{backgroundFile.name}
                  </p>
                )}
              </div>

              <div className="min-w-0 border border-[#4a2028] p-4">
                <h3 className="font-semibold">标题图片</h3>

                <div className="mt-3 flex min-h-48 items-center justify-center border border-[#4a2028] bg-[#10090b] p-3">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="标题图片预览"
                      className="max-h-48 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm text-[#9e858a]">暂无标题图片</span>
                  )}
                </div>

                <label className="mt-4 block text-sm text-[#c7b5b8]">
                  选择标题 PNG
                  <input
                    type="file"
                    accept="image/png"
                    className="mt-2 block w-full min-w-0 text-xs file:mr-3 file:border-0 file:bg-[#8b1e2d] file:px-3 file:py-2 file:text-white"
                    disabled={saving}
                    onChange={(e) => selectImage(e, "logo")}
                  />
                </label>

                {logoFile && (
                  <p className="mt-2 break-all text-xs text-[#e8a2ac]">
                    待上传：{logoFile.name}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* 04 / 详情页显示设置 */}
          <section className={sectionClass}>
            <div className="mb-5 border-b border-[#4a2028] pb-3">
              <h2 className="text-lg font-bold">04 / 详情页显示设置</h2>

              <p className="mt-2 text-xs leading-6 text-[#9e858a]">
                设置详情页标题样式、背景适配方式和背景显示强度。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className={labelClass}>
                标题显示方式
                <select
                  className={inputClass}
                  value={form.titleMode}
                  onChange={(e) => updateField("titleMode", e.target.value)}
                  disabled={saving}
                >
                  <option value="text">文字标题</option>
                  <option value="logo">图片标题</option>
                </select>
              </label>

              <label className={labelClass}>
                背景适配方式
                <select
                  className={inputClass}
                  value={form.detailBackgroundFit}
                  onChange={(e) =>
                    updateField("detailBackgroundFit", e.target.value)
                  }
                  disabled={saving}
                >
                  <option value="cover">Cover：铺满区域，可能裁切</option>
                  <option value="contain">Contain：完整显示，可能留空</option>
                </select>
              </label>

              <div className="sm:col-span-2">
                <label className={labelClass}>
                  背景显示强度：{form.detailBackgroundOpacity}%

                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={form.detailBackgroundOpacity}
                    onChange={(e) =>
                      updateField(
                        "detailBackgroundOpacity",
                        Number(e.target.value)
                      )
                    }
                    disabled={saving}
                    className="mt-4 block w-full accent-[#a52a3a]"
                  />
                </label>

                <div className="mt-2 flex justify-between text-xs text-[#9e858a]">
                  <span>0% · 最淡</span>
                  <span>100% · 最强</span>
                </div>
              </div>
            </div>

            {form.titleMode === "logo" && !logoPreview && (
              <p className="mt-4 border border-[#8b1e2d] bg-[#2a1015] p-3 text-sm text-[#ffb8c1]">
                已选择图片标题模式，但尚未设置标题 PNG。
              </p>
            )}
          </section>

          {/* 05 / 详情预览图：最多 5 张 */}
          <section className={sectionClass}>
            <div className="mb-5 border-b border-[#4a2028] pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold">05 / 详情预览图</h2>

                <span className="text-xs text-[#c77783]">
                  {screenshots.length} / {MAX_SCREENSHOTS} 张
                </span>
              </div>

              <p className="mt-2 text-xs leading-6 text-[#9e858a]">
                最多上传 5 张预览图。可一次选择多张图片，也可以删除图片或调整顺序。保存后会更新游戏资料中的预览图列表。
              </p>
            </div>

            <label
              className={`inline-flex items-center border border-[#a52a3a] bg-[#8b1e2d] px-4 py-2.5 text-sm font-semibold text-white ${
                saving || screenshots.length >= MAX_SCREENSHOTS
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-[#a52a3a]"
              }`}
            >
              ＋ 添加预览图片

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                disabled={
                  saving || screenshots.length >= MAX_SCREENSHOTS
                }
                onChange={addScreenshots}
              />
            </label>

            {screenshots.length === 0 ? (
              <div className="mt-4 border border-dashed border-[#4a2028] p-8 text-center text-sm text-[#9e858a]">
                暂无详情预览图。
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {screenshots.map((item, index) => (
                  <div
                    key={`${item.url}-${item.preview}-${index}`}
                    className="min-w-0 border border-[#4a2028] bg-[#10090b] p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        第 {index + 1} 张
                      </span>

                      {item.file && (
                        <span className="text-xs text-[#e8a2ac]">
                          待上传
                        </span>
                      )}
                    </div>

                    <div className="flex h-40 items-center justify-center bg-[#160c0f] p-2">
                      {(item.preview || item.url) && (
                        <img
                          src={item.preview || item.url}
                          alt={`详情预览图 ${index + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      )}
                    </div>

                    {item.file && (
                      <p className="mt-2 break-all text-xs text-[#9e858a]">
                        {item.file.name}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        disabled={index === 0 || saving}
                        onClick={() => moveScreenshot(index, -1)}
                      >
                        ↑ 上移
                      </button>

                      <button
                        type="button"
                        className={secondaryButtonClass}
                        disabled={
                          index === screenshots.length - 1 || saving
                        }
                        onClick={() => moveScreenshot(index, 1)}
                      >
                        ↓ 下移
                      </button>

                      <button
                        type="button"
                        className="border border-[#8b1e2d] px-3 py-2 text-sm text-[#ff9aa9] hover:bg-[#2a1015] disabled:opacity-40"
                        disabled={saving}
                        onClick={() => removeScreenshot(index)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs leading-6 text-[#9e858a]">
              删除只会将图片从当前游戏的预览列表移除，不会删除 GitHub 仓库中已经上传的原文件。
            </p>
          </section>

          {/* 06 / 历史版本 */}
          <section className={sectionClass}>
            <div className="mb-5 border-b border-[#4a2028] pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold">06 / 历史版本</h2>

                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={addHistory}
                  disabled={saving || form.history.length >= 100}
                >
                  ＋ 添加历史版本
                </button>
              </div>

              <p className="mt-2 text-xs leading-6 text-[#9e858a]">
                每条记录可分别填写版本号、日期和对应的下载地址。
              </p>
            </div>

            {form.history.length === 0 ? (
              <div className="border border-dashed border-[#4a2028] p-6 text-center">
                <p className="text-sm text-[#9e858a]">
                  暂无历史版本记录。
                </p>

                <button
                  type="button"
                  className={`${buttonClass} mt-4`}
                  onClick={addHistory}
                  disabled={saving}
                >
                  ＋ 添加第一条记录
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {form.history.map((item, index) => (
                  <div
                    key={index}
                    className="border border-[#4a2028] bg-[#10090b] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-semibold">
                        历史版本 #{index + 1}
                      </h3>

                      <button
                        type="button"
                        className="text-sm text-[#ff8194] hover:text-white"
                        disabled={saving}
                        onClick={() => removeHistory(index)}
                      >
                        删除记录 ×
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className={labelClass}>
                        版本号
                        <input
                          className={inputClass}
                          value={item.version || ""}
                          onChange={(e) =>
                            changeHistory(index, "version", e.target.value)
                          }
                          maxLength={100}
                          disabled={saving}
                        />
                      </label>

                      <label className={labelClass}>
                        发布日期
                        <input
                          className={inputClass}
                          value={item.date || ""}
                          onChange={(e) =>
                            changeHistory(index, "date", e.target.value)
                          }
                          placeholder="例如：2026-10-25"
                          maxLength={100}
                          disabled={saving}
                        />
                      </label>

                      <label className={labelClass}>
                        蓝奏云下载链接
                        <input
                          className={inputClass}
                          value={item.lanzou || ""}
                          onChange={(e) =>
                            changeHistory(index, "lanzou", e.target.value)
                          }
                          maxLength={2000}
                          disabled={saving}
                        />
                      </label>

                      <label className={labelClass}>
                        123 云盘下载链接
                        <input
                          className={inputClass}
                          value={item.pan123 || ""}
                          onChange={(e) =>
                            changeHistory(index, "pan123", e.target.value)
                          }
                          maxLength={2000}
                          disabled={saving}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 底部保存栏 */}
          <div className="sticky bottom-0 z-20 mt-6 border border-[#4a2028] bg-[#160c0f]/95 p-4 backdrop-blur sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {saving ? "正在处理修改……" : "确认资料无误后保存"}
                </p>

                <p className="mt-1 text-xs leading-5 text-[#9e858a]">
                  {saving
                    ? uploading || "正在保存游戏资料……"
                    : "保存后按投稿审核流程处理，原有游戏不会因编辑操作而被永久删除。"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/upload"
                  aria-disabled={saving}
                  className={`inline-flex items-center justify-center border border-[#4a2028] px-4 py-2.5 text-sm text-[#e5cfd3] hover:bg-[#241015] ${
                    saving ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  返回投稿中心
                </Link>

                <button
                  type="submit"
                  className={buttonClass}
                  disabled={saving || !credential}
                >
                  {saving ? "正在上传并保存……" : "保存修改并提交审核"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
