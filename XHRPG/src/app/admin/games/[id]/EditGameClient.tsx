
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type HistoryItem = {
  version?: string;
  date?: string;
  lanzou?: string;
  pan123?: string;
};

type ScreenshotItem = {
  url: string;
  file?: File;
  preview?: string;
};

type UploadKind = "cover" | "background" | "logo" | "screenshot";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 解析详情预览图，兼容字符串数组和对象数组
function parseScreenshots(value: unknown): ScreenshotItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): ScreenshotItem | null => {
      if (typeof item === "string" && item.trim()) {
        return { url: item.trim() };
      }

      if (
        item &&
        typeof item === "object" &&
        "url" in item &&
        typeof item.url === "string" &&
        item.url.trim()
      ) {
        return { url: item.url.trim() };
      }

      return null;
    })
    .filter((item): item is ScreenshotItem => item !== null);
}

// 解析标签，兼容 JSON 数组、JSON 字符串和旧版单个标签
function parseTags(value: unknown): string[] {
  let raw: unknown = value;

  if (typeof raw === "string") {
    const original = raw;

    try {
      raw = JSON.parse(original);
    } catch {
      // 旧数据可能直接保存为普通字符串
      return original
        .split(/[,，、\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(raw)) return [];

  return Array.from(
    new Set(
      raw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

// 统一整理标签：去空格、过滤空值、去重
function normalizeTags(value: string[]): string[] {
  return Array.from(
    new Set(
      value
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function validateImage(file: File): boolean {
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert("只支持 PNG、JPG、WebP 图片");
    return false;
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    alert("图片不能为空，且不能超过 5 MB");
    return false;
  }

  return true;
}

export default function EditGameClient({ id }: { id: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);

  // 标签独立维护
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // 加载游戏数据
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/admin/games/${id}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message || "获取游戏失败，请确认已登录站长账号"
          );
        }

        if (!data.game) {
          throw new Error(data.message || "没有找到这个游戏");
        }

        if (cancelled) return;

        const game = data.game;

        setForm({
          ...game,
          titleMode: game.titleMode === "image" ? "image" : "text",
          detailBackgroundOpacity: Math.min(
            100,
            Math.max(0, Number(game.detailBackgroundOpacity ?? 35))
          ),
          detailBackgroundFit:
            game.detailBackgroundFit === "contain" ? "contain" : "cover",
        });

        setTags(parseTags(game.tags));
        setTagInput("");

        setHistory(Array.isArray(game.history) ? game.history : []);
        setCoverPreview(game.cover || "");
        setBackgroundPreview(game.detailBackground || "");
        setLogoPreview(game.titleLogo || "");
        setScreenshots(parseScreenshots(game.screenshots));
      } catch (error) {
        if (cancelled) return;

        console.error("获取游戏失败:", error);

        alert(
          error instanceof Error
            ? error.message
            : "获取游戏失败，请检查网络连接"
        );
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function change(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((current: any) => ({
      ...current,
      [name]: value,
    }));
  }

  // 添加自定义标签
  function addTag() {
    const value = tagInput.trim();

    if (!value) {
      alert("请输入标签名称");
      return;
    }

    if (normalizeTags(tags).includes(value)) {
      alert("这个标签已经存在");
      return;
    }

    setTags((current) => normalizeTags([...current, value]));
    setTagInput("");
  }

  // 回车添加标签
  function handleTagKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  // 删除指定标签
  function removeTag(index: number) {
    setTags((current) => current.filter((_, i) => i !== index));
  }

  function selectCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImage(file)) {
      e.target.value = "";
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function selectBackground(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImage(file)) {
      e.target.value = "";
      return;
    }

    setBackgroundFile(file);
    setBackgroundPreview(URL.createObjectURL(file));
  }

  function selectLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImage(file)) {
      e.target.value = "";
      return;
    }

    if (file.type !== "image/png") {
      alert("标题图片必须使用 PNG 格式，以便保留透明背景");
      e.target.value = "";
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function changeHistory(
    index: number,
    key: keyof HistoryItem,
    value: string
  ) {
    setHistory((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      )
    );
  }

  function addHistory() {
    setHistory((current) => [
      ...current,
      { version: "", date: "", lanzou: "", pan123: "" },
    ]);
  }

  function removeHistory(index: number) {
    setHistory((current) => current.filter((_, i) => i !== index));
  }

  function addScreenshots(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    const validFiles: File[] = [];

    for (const file of files) {
      if (validateImage(file)) {
        validFiles.push(file);
      }
    }

    if (screenshots.length + validFiles.length > 100) {
      alert("详情预览图最多支持 100 张");
      e.target.value = "";
      return;
    }

    setScreenshots((current) => [
      ...current,
      ...validFiles.map((file) => ({
        url: "",
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);

    e.target.value = "";
  }

  function removeScreenshot(index: number) {
    setScreenshots((current) =>
      current.filter((_, i) => i !== index)
    );
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
  }

  // 通用图片上传函数
  async function uploadImage(
    file: File,
    kind: UploadKind,
    slot?: number
  ): Promise<string> {
    const fd = new FormData();

    fd.append("file", file);
    fd.append("id", id);
    fd.append("kind", kind);

    if (kind === "screenshot" && slot !== undefined) {
      fd.append("slot", String(slot));
    }

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      throw new Error(
        data?.message || `${kind} 图片上传失败（HTTP ${res.status}）`
      );
    }

    if (
      typeof data.url !== "string" ||
      !data.url.startsWith("https://raw.githubusercontent.com/")
    ) {
      throw new Error("上传接口没有返回有效的 GitHub Raw 图片地址");
    }

    return data.url;
  }

  // 保存修改
  async function save() {
    if (!form || loading) return;

    if (!String(form.name || "").trim()) {
      alert("游戏名称不能为空");
      return;
    }

    if (form.titleMode === "image" && !logoFile && !logoPreview) {
      alert("当前选择了图片标题模式，请先上传标题 PNG");
      return;
    }

    setLoading(true);

    try {
      // 1. 上传封面
      let cover = form.cover || "";

      if (coverFile) {
        cover = await uploadImage(coverFile, "cover");
      }

      // 2. 上传详情背景
      let detailBackground = form.detailBackground || "";

      if (backgroundFile) {
        detailBackground = await uploadImage(
          backgroundFile,
          "background"
        );
      }

      // 3. 上传标题 PNG
      let titleLogo = form.titleLogo || "";

      if (logoFile) {
        titleLogo = await uploadImage(logoFile, "logo");
      }

      // 4. 上传新增的预览图，保留已有图片和排序
      const screenshotUrls: string[] = [];

      for (let index = 0; index < screenshots.length; index++) {
        const item = screenshots[index];

        if (item.file) {
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

      // 5. 规范化标签
      const normalizedTags = normalizeTags(tags);

      // 6. 保存游戏信息
      const payload = {
        ...form,
        name: String(form.name).trim(),
        cover,
        tags: normalizedTags,
        history,
        titleMode: form.titleMode === "image" ? "image" : "text",
        titleLogo: titleLogo || null,
        detailBackground: detailBackground || null,
        detailBackgroundOpacity: Math.min(
          100,
          Math.max(0, Number(form.detailBackgroundOpacity ?? 35))
        ),
        detailBackgroundFit:
          form.detailBackgroundFit === "contain" ? "contain" : "cover",
        screenshots: screenshotUrls,
      };

      const res = await fetch(`/api/admin/games/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "保存游戏失败");
      }

      alert("游戏信息、标签及详情页设置保存成功");

      router.push("/admin/games");
      router.refresh();
    } catch (error) {
      console.error("保存游戏失败:", error);

      alert(
        error instanceof Error
          ? error.message
          : "保存失败，请检查网络和服务器日志"
      );
    } finally {
      setLoading(false);
    }
  }

  // 隐藏 / 显示
  async function toggleStatus() {
    if (!form || loading) return;

    const newStatus = form.status === "隐藏" ? "已发布" : "隐藏";

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "修改游戏状态失败");
      }

      setForm((current: any) => ({
        ...current,
        status: newStatus,
      }));

      alert(newStatus === "隐藏" ? "游戏已隐藏" : "游戏已显示");
    } catch (error) {
      console.error("修改游戏状态失败:", error);

      alert(
        error instanceof Error ? error.message : "修改游戏状态失败"
      );
    } finally {
      setLoading(false);
    }
  }

  // 永久删除
  async function remove() {
    if (loading) return;

    if (!confirm("确定永久删除这个游戏吗？此操作不可撤销。")) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "删除失败");
      }

      alert("删除成功");

      router.push("/admin/games");
      router.refresh();
    } catch (error) {
      console.error("删除游戏失败:", error);

      alert(error instanceof Error ? error.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  if (!form) {
    return (
      <main className="admin-page">
        <div className="admin-box">
          <h1>加载游戏中...</h1>
        </div>
      </main>
    );
  }

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #4a2028",
    padding: "18px",
    marginTop: "24px",
    borderRadius: 0,
  };

  const imageStyle: React.CSSProperties = {
    display: "block",
    maxWidth: "100%",
    maxHeight: "260px",
    objectFit: "contain",
    marginTop: "10px",
    border: "1px solid #4a2028",
    borderRadius: 0,
  };

  const fieldStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    marginTop: "8px",
    boxSizing: "border-box",
    borderRadius: 0,
  };

  const buttonStyle: React.CSSProperties = {
    borderRadius: 0,
    cursor: loading ? "not-allowed" : "pointer",
  };

  return (
    <main className="admin-page">
      <div className="admin-box game-form">
        <h1>编辑游戏</h1>

        <p>
          当前状态：<strong>{form.status}</strong>
        </p>

        <div className="form-grid">
          <label>
            游戏名称
            <input
              name="name"
              value={form.name || ""}
              onChange={change}
            />
          </label>

          <label>
            英文名称
            <input
              name="en"
              value={form.en || ""}
              onChange={change}
            />
          </label>

          <label>
            作者
            <input
              name="author"
              value={form.author || ""}
              onChange={change}
            />
          </label>

          <label>
            版本
            <input
              name="version"
              value={form.version || ""}
              onChange={change}
            />
          </label>

          <label>
            分类
            <input
              name="category"
              value={form.category || ""}
              onChange={change}
            />
          </label>

          <label>
            重新上传封面
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectCover}
            />

            {coverPreview && (
              <img
                src={coverPreview}
                alt="游戏封面预览"
                style={imageStyle}
              />
            )}
          </label>

          <label>
            蓝奏云
            <input
              name="lanzou"
              value={form.lanzou || ""}
              onChange={change}
            />
          </label>

          <label>
            123云盘
            <input
              name="pan123"
              value={form.pan123 || ""}
              onChange={change}
            />
          </label>
        </div>

        {/* 游戏标签管理 */}
        <section style={sectionStyle}>
          <h2>游戏标签</h2>

          <p style={{ color: "#c9aeb2", fontSize: 13 }}>
            自由添加任意标签，没有预设标签。按 Enter 或点击添加按钮即可添加。
            删除标签后，点击保存修改才会写入数据库。
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "stretch",
              flexWrap: "wrap",
              marginTop: 14,
            }}
          >
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="输入自定义标签，例如：像素、恐怖、解谜"
              aria-label="输入新标签"
              disabled={loading}
              style={{
                flex: "1 1 240px",
                minWidth: 0,
                padding: "10px 12px",
                border: "1px solid #4a2028",
                background: "#10090b",
                color: "#f8eeee",
                borderRadius: 0,
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              disabled={loading}
              onClick={addTag}
              style={{
                ...buttonStyle,
                padding: "10px 16px",
                border: "1px solid #e73550",
                background: "#e73550",
                color: "#ffffff",
              }}
            >
              ＋ 添加标签
            </button>
          </div>

          {tags.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 16,
              }}
            >
              {tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    border: "1px solid #4a2028",
                    background: "#160c0f",
                    color: "#f8eeee",
                    borderRadius: 0,
                    overflowWrap: "anywhere",
                  }}
                >
                  <span>{tag}</span>

                  <button
                    type="button"
                    aria-label={`删除标签 ${tag}`}
                    title={`删除标签 ${tag}`}
                    disabled={loading}
                    onClick={() => removeTag(index)}
                    style={{
                      ...buttonStyle,
                      border: "none",
                      background: "transparent",
                      color: "#ff8194",
                      padding: "0 2px",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 16, color: "#bca0a5", fontSize: 13 }}>
              当前没有标签。你可以在上方输入并添加标签。
            </p>
          )}

          <p style={{ marginTop: 12, fontSize: 12, color: "#bca0a5" }}>
            当前共 {normalizeTags(tags).length} 个标签。
          </p>
        </section>

        <label style={{ display: "block", marginTop: "18px" }}>
          游戏简介
          <textarea
            name="description"
            value={form.description || ""}
            onChange={change}
          />
        </label>

        {/* 详情页背景设置 */}
        <section style={sectionStyle}>
          <h2>详情页背景设置</h2>

          <label style={{ display: "block", marginTop: "12px" }}>
            上传背景图片
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={fieldStyle}
              onChange={selectBackground}
            />
          </label>

          {backgroundPreview && (
            <img
              src={backgroundPreview}
              alt="详情页背景预览"
              style={{
                ...imageStyle,
                width: "100%",
                maxHeight: "320px",
                opacity:
                  Number(form.detailBackgroundOpacity ?? 35) / 100,
              }}
            />
          )}

          <label style={{ display: "block", marginTop: "18px" }}>
            背景透明度：{form.detailBackgroundOpacity ?? 35}%
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={form.detailBackgroundOpacity ?? 35}
              style={fieldStyle}
              onChange={(e) =>
                setForm((current: any) => ({
                  ...current,
                  detailBackgroundOpacity: Number(e.target.value),
                }))
              }
            />
            <small>
              这里的透明度是背景显示强度；数值越低，背景越淡。
            </small>
          </label>

          <label style={{ display: "block", marginTop: "18px" }}>
            背景适配模式
            <select
              value={form.detailBackgroundFit || "cover"}
              style={fieldStyle}
              onChange={(e) =>
                setForm((current: any) => ({
                  ...current,
                  detailBackgroundFit: e.target.value,
                }))
              }
            >
              <option value="cover">Cover：铺满区域，可能裁切</option>
              <option value="contain">Contain：完整显示，可能留空</option>
            </select>
          </label>

          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            背景透明度需要由前台背景图层单独控制，不能直接降低整个页面容器的透明度。
          </p>
        </section>

        {/* 标题设置 */}
        <section style={sectionStyle}>
          <h2>详情页标题设置</h2>

          <label style={{ display: "block", marginTop: "12px" }}>
            标题显示方式
            <select
              value={form.titleMode || "text"}
              style={fieldStyle}
              onChange={(e) =>
                setForm((current: any) => ({
                  ...current,
                  titleMode: e.target.value,
                }))
              }
            >
              <option value="text">使用文字标题</option>
              <option value="image">使用透明 PNG 标题图片</option>
            </select>
          </label>

          <label style={{ display: "block", marginTop: "18px" }}>
            上传标题 PNG
            <input
              type="file"
              accept="image/png"
              style={fieldStyle}
              onChange={selectLogo}
            />
          </label>

          {logoPreview && (
            <div style={{ marginTop: "12px" }}>
              <p>标题图片预览：</p>
              <div
                style={{
                  padding: "12px",
                  background: "#10090b",
                  border: "1px solid #4a2028",
                }}
              >
                <img
                  src={logoPreview}
                  alt="标题 PNG 预览"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "180px",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          )}

          {form.titleMode === "image" && !logoPreview && (
            <p style={{ color: "#e7a1a1" }}>
              当前尚未设置标题图片。请上传透明 PNG 后再保存。
            </p>
          )}
        </section>

        {/* 详情预览图管理 */}
        <section style={sectionStyle}>
          <h2>详情页预览图管理</h2>

          <p>
            已添加 {screenshots.length} 张。可以上传多张图片、删除图片或调整显示顺序。
          </p>

          <label style={{ display: "block", marginTop: "12px" }}>
            添加预览图片
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              style={fieldStyle}
              onChange={addScreenshots}
            />
          </label>

          {screenshots.length === 0 ? (
            <p style={{ opacity: 0.7 }}>暂时没有添加预览图。</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              {screenshots.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  style={{
                    minWidth: 0,
                    padding: "10px",
                    border: "1px solid #4a2028",
                  }}
                >
                  <p>第 {index + 1} 张</p>

                  {(item.preview || item.url) && (
                    <img
                      src={item.preview || item.url}
                      alt={`详情预览图 ${index + 1}`}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "150px",
                        objectFit: "contain",
                        background: "#10090b",
                      }}
                    />
                  )}

                  {item.file && (
                    <p style={{ fontSize: "12px" }}>
                      待上传：{item.file.name}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginTop: "10px",
                    }}
                  >
                    <button
                      type="button"
                      disabled={index === 0 || loading}
                      onClick={() => moveScreenshot(index, -1)}
                    >
                      ↑ 上移
                    </button>

                    <button
                      type="button"
                      disabled={
                        index === screenshots.length - 1 || loading
                      }
                      onClick={() => moveScreenshot(index, 1)}
                    >
                      ↓ 下移
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => removeScreenshot(index)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            删除会将图片从本游戏的预览列表中移除，但不会删除 GitHub 仓库中已经上传的原文件。
          </p>
        </section>

        {/* 历史版本 */}
        <section style={sectionStyle}>
          <h2>历史版本</h2>

          {history.map((item, index) => (
            <div className="history-item" key={index}>
              <input
                placeholder="版本"
                value={item.version || ""}
                onChange={(e) =>
                  changeHistory(index, "version", e.target.value)
                }
              />

              <input
                placeholder="日期"
                value={item.date || ""}
                onChange={(e) =>
                  changeHistory(index, "date", e.target.value)
                }
              />

              <input
                placeholder="蓝奏云"
                value={item.lanzou || ""}
                onChange={(e) =>
                  changeHistory(index, "lanzou", e.target.value)
                }
              />

              <input
                placeholder="123云盘"
                value={item.pan123 || ""}
                onChange={(e) =>
                  changeHistory(index, "pan123", e.target.value)
                }
              />

              <button
                type="button"
                disabled={loading}
                onClick={() => removeHistory(index)}
              >
                删除
              </button>
            </div>
          ))}

          <button
            type="button"
            disabled={loading}
            onClick={addHistory}
          >
            ＋ 添加历史版本
          </button>
        </section>

        <div className="form-buttons">
          <button onClick={save} disabled={loading}>
            {loading ? "正在上传并保存..." : "保存修改"}
          </button>

          <button onClick={toggleStatus} disabled={loading}>
            {form.status === "隐藏" ? "显示游戏" : "隐藏游戏"}
          </button>

          <button onClick={remove} disabled={loading}>
            永久删除
          </button>

          <button
            onClick={() => router.back()}
            disabled={loading}
          >
            返回
          </button>
        </div>
      </div>
    </main>
  );
}
