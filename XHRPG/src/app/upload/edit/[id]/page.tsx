
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
  "w-full border border-[#4a2028] bg-[#10090b] px-3 py-2.5 text-sm text-[#f8eeee] outline-none focus:border-[#a52a3a]";

const labelClass = "mb-2 block text-sm font-medium text-[#f0dfe2]";

const buttonClass =
  "border border-[#a52a3a] bg-[#8b1e2d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a52a3a] disabled:cursor-not-allowed disabled:opacity-50";

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

    // 允许再次选择同一个文件。
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

      // 普通投稿用户不提交游戏 ID，由服务端凭证定位游戏。
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

        // slot 对应 1-based 预览图编号。
        const index = (slot ?? 1) - 1;

        while (current.length <= index) {
          current.push("");
        }

        current[index] = result.url;

        updateField(
          "screenshotsText",
          current.filter(Boolean).join("\n")
        );
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

      setMessage(
        result.message || "修改已保存，等待站长审核。"
      );

      // 等待用户看到保存结果，再返回投稿页。
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
      <main className="min-h-screen bg-[#10090b] px-4 py-16 text-[#f8eeee]">
        <div className="mx-auto max-w-4xl border border-[#4a2028] bg-[#160c0f] p-8">
          正在验证凭证并读取游戏信息……
        </div>
      </main>
    );
  }

  if (error && !credential) {
    return (
      <main className="min-h-screen bg-[#10090b] px-4 py-16 text-[#f8eeee]">
        <div className="mx-auto max-w-xl border border-[#4a2028] bg-[#160c0f] p-6">
          <h1 className="text-xl font-bold">无法进入编辑页面</h1>
          <p className="mt-4 text-sm leading-7 text-[#ffb8c1]">
            {error}
          </p>
          <Link
            href="/upload/edit"
            className="mt-6 inline-block text-[#e8a2ac] hover:text-white"
          >
            返回重新验证凭证
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#10090b] px-4 py-10 text-[#f8eeee]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 border-b border-[#4a2028] pb-5">
          <p className="mb-2 text-xs tracking-[0.2em] text-[#c77783]">
            XHRPG · GAME SUBMISSION
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            编辑游戏投稿
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#c7b5b8]">
            修改后需要重新审核。请确认资料和下载链接准确无误。
          </p>
          <p className="mt-2 text-sm text-[#c7b5b8]">
            当前审核状态：
            <span className="ml-2 text-[#e8a2ac]">
              {form.status}
            </span>
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 border border-[#8b1e2d] bg-[#2a1015] p-4 text-sm text-[#ffb8c1]"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 border border-[#4a2028] bg-[#201015] p-4 text-sm text-[#f4c2ca]"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <section className="border border-[#4a2028] bg-[#160c0f] p-5 sm:p-6">
            <h2 className="mb-5 border-b border-[#4a2028] pb-3 text-lg font-bold">
              基本信息
            </h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>游戏名称 *</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>英文名称</label>
                <input
                  className={inputClass}
                  value={form.en}
                  onChange={(e) => updateField("en", e.target.value)}
                  maxLength={200}
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
                />
              </div>

              <div>
                <label className={labelClass}>版本</label>
                <input
                  className={inputClass}
                  value={form.version}
                  onChange={(e) => updateField("version", e.target.value)}
                  maxLength={100}
                />
              </div>

              <div>
                <label className={labelClass}>游戏分类</label>
<input
  type="text"
  className={inputClass}
  value={form.category}
  onChange={(e) => updateField("category", e.target.value)}
  placeholder="请输入游戏分类，例如：角色扮演、解谜冒险、同人作品"
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
                />
              </div>

              <div>
                <label className={labelClass}>123 云盘下载链接</label>
                <input
                  className={inputClass}
                  value={form.pan123}
                  onChange={(e) => updateField("pan123", e.target.value)}
                  maxLength={2000}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>标签</label>
                <input
                  className={inputClass}
                  value={form.tagsText}
                  onChange={(e) => updateField("tagsText", e.target.value)}
                  placeholder="多个标签使用逗号分隔"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>游戏介绍</label>
                <textarea
                  className={inputClass}
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                  rows={8}
                  maxLength={30000}
                />
              </div>
            </div>
          </section>

          <section className="border border-[#4a2028] bg-[#160c0f] p-5 sm:p-6">
            <h2 className="mb-5 border-b border-[#4a2028] pb-3 text-lg font-bold">
              图片资源
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className={labelClass}>游戏封面</label>
                {form.cover && (
                  <img
                    src={form.cover}
                    alt="游戏封面预览"
                    className="mb-3 max-h-56 max-w-full border border-[#4a2028] object-contain"
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full text-sm text-[#c7b5b8] file:mr-3 file:border-0 file:bg-[#8b1e2d] file:px-3 file:py-2 file:text-white"
                  disabled={!!uploading}
                  onChange={(e) => void uploadImage(e, "cover")}
                />
                {uploading === "cover" && (
                  <p className="mt-2 text-xs text-[#e8a2ac]">
                    正在上传封面……
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>详情背景</label>
                {form.detailBackground && (
                  <img
                    src={form.detailBackground}
                    alt="详情背景预览"
                    className="mb-3 max-h-56 max-w-full border border-[#4a2028] object-contain"
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full text-sm text-[#c7b5b8] file:mr-3 file:border-0 file:bg-[#8b1e2d] file:px-3 file:py-2 file:text-white"
                  disabled={!!uploading}
                  onChange={(e) => void uploadImage(e, "background")}
                />
                {uploading === "background" && (
                  <p className="mt-2 text-xs text-[#e8a2ac]">
                    正在上传背景……
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>标题图片</label>
                {form.titleLogo && (
                  <img
                    src={form.titleLogo}
                    alt="标题图片预览"
                    className="mb-3 max-h-40 max-w-full border border-[#4a2028] object-contain"
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full text-sm text-[#c7b5b8] file:mr-3 file:border-0 file:bg-[#8b1e2d] file:px-3 file:py-2 file:text-white"
                  disabled={!!uploading}
                  onChange={(e) => void uploadImage(e, "logo")}
                />
                {uploading === "logo" && (
                  <p className="mt-2 text-xs text-[#e8a2ac]">
                    正在上传标题图片……
                  </p>
                )}
              </div>

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
                <label className={labelClass}>详情背景适配</label>
                <select
                  className={inputClass}
                  value={form.detailBackgroundFit}
                  onChange={(e) =>
                    updateField("detailBackgroundFit", e.target.value)
                  }
                >
                  <option value="cover">覆盖</option>
                  <option value="contain">完整显示</option>
                  <option value="fill">拉伸填充</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  背景透明度：{form.detailBackgroundOpacity.toFixed(2)}
                </label>
                <input
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
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>游戏预览图</label>
                <p className="mb-3 text-xs leading-6 text-[#9e858a]">
                  每行填写一张预览图的 URL。上传新图时会替换对应编号的预览图。
                </p>
                <textarea
                  className={inputClass}
                  value={form.screenshotsText}
                  onChange={(e) =>
                    updateField("screenshotsText", e.target.value)
                  }
                  rows={5}
                  placeholder={"每行一个图片 URL"}
                />

                <div className="mt-4">
                  <label className={labelClass}>
                    上传预览图（选择编号）
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {[1, 2, 3, 4, 5, 6].map((slot) => (
                      <label
                        key={slot}
                        className="cursor-pointer border border-[#4a2028] bg-[#10090b] px-3 py-2 text-sm hover:border-[#a52a3a]"
                      >
                        {uploading === `screenshot-${slot}`
                          ? `上传第 ${slot} 张……`
                          : `上传第 ${slot} 张`}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          disabled={!!uploading}
                          onChange={(e) =>
                            void uploadImage(e, "screenshot", slot)
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-[#4a2028] bg-[#160c0f] p-5 sm:p-6">
            <h2 className="mb-3 border-b border-[#4a2028] pb-3 text-lg font-bold">
              更新记录
            </h2>
            <p className="mb-3 text-xs leading-6 text-[#9e858a]">
              使用 JSON 数组格式。每条记录可包含 version、date、lanzou、pan123。
            </p>
            <textarea
              className={`${inputClass} font-mono`}
              value={form.historyText}
              onChange={(e) => updateField("historyText", e.target.value)}
              rows={9}
              spellCheck={false}
            />
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className={buttonClass}
              disabled={saving || !!uploading}
            >
              {saving ? "正在保存……" : "保存修改并提交审核"}
            </button>

            <button
              type="button"
              className="border border-[#4a2028] px-4 py-2.5 text-sm text-[#e5cfd3] hover:bg-[#241015]"
              onClick={() => router.push("/upload")}
            >
              返回投稿页面
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
