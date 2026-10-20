
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type HistoryItem = {
  version: string;
  date: string;
  lanzou: string;
  pan123: string;
};

type ScreenshotItem = {
  file: File;
  preview: string;
  url: string;
};

type UploadKind = "cover" | "background" | "logo" | "screenshot";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const RAW_PREFIX = "https://raw.githubusercontent.com/";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const INITIAL_FORM = {
  name: "",
  en: "",
  author: "",
  category: "",
  version: "",
  description: "",
  cover: "",
  lanzou: "",
  pan123: "",
  symbol: "✦",
  tags: [] as string[],
  status: "已发布",
};

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function validateImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error("只支持 PNG、JPG、WebP 图片");
  }

  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    throw new Error("图片不能为空，且不能超过 5 MB");
  }
}

async function readResponse(res: Response) {
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.success) {
    throw new Error(
      data?.message || `请求失败，HTTP ${res.status}`
    );
  }

  return data;
}

export default function NewGame() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);

  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [titleMode, setTitleMode] = useState<"text" | "image">("text");
  const [backgroundOpacity, setBackgroundOpacity] = useState(35);
  const [backgroundFit, setBackgroundFit] = useState<"cover" | "contain">(
    "cover"
  );

  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);

  useEffect(() => {
    return () => {
      [
        coverPreview,
        backgroundPreview,
        logoPreview,
        ...screenshots.map((item) => item.preview),
      ].forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [coverPreview, backgroundPreview, logoPreview, screenshots]);

  function change(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function selectImage(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
    previewSetter: (url: string) => void
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      validateImage(file);

      setter(file);
      previewSetter(URL.createObjectURL(file));
    } catch (error) {
      alert(error instanceof Error ? error.message : "图片格式错误");
      e.target.value = "";
    }
  }

  function selectCover(e: React.ChangeEvent<HTMLInputElement>) {
    selectImage(e, setCoverFile, setCoverPreview);
  }

  function selectBackground(e: React.ChangeEvent<HTMLInputElement>) {
    selectImage(e, setBackgroundFile, setBackgroundPreview);
  }

  function selectLogo(e: React.ChangeEvent<HTMLInputElement>) {
    selectImage(e, setLogoFile, setLogoPreview);
  }

  function selectScreenshots(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    try {
      if (screenshots.length + files.length > 100) {
        throw new Error("预览图最多只能添加 100 张");
      }

      files.forEach(validateImage);

      const added = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        url: "",
      }));

      setScreenshots((prev) => [...prev, ...added]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "图片格式错误");
    }

    e.target.value = "";
  }

  function removeScreenshot(index: number) {
    setScreenshots((prev) => {
      const target = prev[index];

      if (target?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }

      return prev.filter((_, i) => i !== index);
    });
  }

  function moveScreenshot(index: number, direction: -1 | 1) {
    setScreenshots((prev) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];

      return next;
    });
  }

  function addHistory() {
    setHistory((prev) => [
      ...prev,
      {
        version: "",
        date: getToday(),
        lanzou: "",
        pan123: "",
      },
    ]);
  }

  function changeHistory(
    index: number,
    key: keyof HistoryItem,
    value: string
  ) {
    setHistory((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      )
    );
  }

  function removeHistory(index: number) {
    setHistory((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadImage(
    id: number,
    file: File,
    kind: UploadKind,
    slot?: number
  ): Promise<string> {
    const fd = new FormData();

    fd.append("file", file);
    fd.append("id", String(id));

    if (kind !== "cover") {
      fd.append("kind", kind);
    }

    if (kind === "screenshot") {
      if (!slot || slot < 1 || slot > 100) {
        throw new Error("预览图序号无效");
      }

      fd.append("slot", String(slot));
    }

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const data = await readResponse(res);

    if (
      typeof data.url !== "string" ||
      !data.url.startsWith(RAW_PREFIX)
    ) {
      throw new Error("图片上传成功响应中缺少有效的图片 URL");
    }

    return data.url;
  }

  async function submit() {
    if (loading) return;

    if (!form.name.trim()) {
      alert("请填写游戏名称");
      return;
    }

    if (!form.author.trim()) {
      alert("请填写游戏作者");
      return;
    }

    if (!form.category.trim()) {
      alert("请填写游戏分类");
      return;
    }

    if (!form.version.trim()) {
      alert("请填写游戏版本");
      return;
    }

    if (titleMode === "image" && !logoFile) {
      alert("标题模式选择了图片，请上传标题 PNG");
      return;
    }

    setLoading(true);
    setProgress("正在创建游戏记录……");

    let gameId: number | null = null;

    try {
      const today = getToday();

      // 第一步：创建游戏基础记录。
      const createResponse = await fetch("/api/admin/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          author: form.author.trim(),
          category: form.category.trim(),
          version: form.version.trim(),
          cover: "",
          history,
          date: today,
          updateDate: today,
        }),
      });

      const created = await readResponse(createResponse);
      const id = Number(created.game?.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("游戏创建接口没有返回有效的游戏 ID");
      }

      gameId = id;

      // 第二步：上传图片。未选择的图片不会上传。
      let coverUrl = "";
      let backgroundUrl: string | null = null;
      let logoUrl: string | null = null;
      const screenshotUrls: string[] = [];

      if (coverFile) {
        setProgress("正在上传游戏封面……");
        coverUrl = await uploadImage(id, coverFile, "cover");
      }

      if (backgroundFile) {
        setProgress("正在上传详情背景……");
        backgroundUrl = await uploadImage(
          id,
          backgroundFile,
          "background"
        );
      }

      if (logoFile) {
        setProgress("正在上传标题图片……");
        logoUrl = await uploadImage(id, logoFile, "logo");
      }

      for (let i = 0; i < screenshots.length; i++) {
        const item = screenshots[i];

        if (item.file) {
          setProgress(
            `正在上传详情预览图…… (${i + 1}/${screenshots.length})`
          );

          const url = await uploadImage(
            id,
            item.file,
            "screenshot",
            i + 1
          );

          screenshotUrls.push(url);
        } else if (item.url) {
          screenshotUrls.push(item.url);
        }
      }

      // 第三步：一次 PUT 保存封面 URL 和全部详情设置。
      setProgress("正在保存游戏详情设置……");

      const updateResponse = await fetch(`/api/admin/games/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cover: coverUrl,
          titleMode,
          titleLogo: logoUrl,
          detailBackground: backgroundUrl,
          detailBackgroundOpacity: backgroundOpacity,
          detailBackgroundFit: backgroundFit,
          screenshots: screenshotUrls,
        }),
      });

      await readResponse(updateResponse);

      alert(`游戏发布成功！游戏 ID：${id}`);

      router.push("/admin/games");
      router.refresh();
    } catch (error) {
      console.error("发布游戏失败:", error);

      const message =
        error instanceof Error ? error.message : "未知错误";

      alert(
        gameId
          ? `游戏 ID ${gameId} 已创建，但后续上传或保存没有全部完成。\n错误：${message}\n请前往游戏管理页面编辑该游戏，不要直接重复创建。`
          : `创建游戏失败：${message}`
      );

      if (gameId) {
        router.push(`/admin/games/${gameId}`);
      }
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
  };

  const sectionStyle: React.CSSProperties = {
    marginTop: 28,
    paddingTop: 20,
    borderTop: "1px solid var(--line, #4a2028)",
  };

  const previewStyle: React.CSSProperties = {
    display: "block",
    maxWidth: "100%",
    maxHeight: 220,
    objectFit: "contain",
    marginTop: 12,
  };

  return (
    <main className="admin-page">
      <div className="admin-box game-form">
        <h1>添加游戏</h1>

        <p>
          填写基础信息和详情页设置。图片会上传到现有 GitHub
          图片仓库。
        </p>

        <h2 style={sectionStyle}>基础信息</h2>

        <div className="form-grid">
          <label>
            游戏名称 *
            <input
              name="name"
              value={form.name}
              onChange={change}
              style={inputStyle}
              required
            />
          </label>

          <label>
            英文名称
            <input
              name="en"
              value={form.en}
              onChange={change}
              style={inputStyle}
            />
          </label>

          <label>
            作者 *
            <input
              name="author"
              value={form.author}
              onChange={change}
              style={inputStyle}
              required
            />
          </label>

          <label>
            版本 *
            <input
              name="version"
              value={form.version}
              onChange={change}
              style={inputStyle}
              required
            />
          </label>

          <label>
            分类 *
            <input
              name="category"
              value={form.category}
              onChange={change}
              style={inputStyle}
              placeholder="例如：角色扮演"
              required
            />
          </label>

          <label>
            标识符
            <input
              name="symbol"
              value={form.symbol}
              onChange={change}
              style={inputStyle}
            />
          </label>

          <label>
            发布状态
            <select
              name="status"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
              style={inputStyle}
            >
              <option value="已发布">已发布</option>
              <option value="隐藏">隐藏</option>
              <option value="审核中">审核中</option>
              <option value="未通过">未通过</option>
            </select>
          </label>

          <label>
            标签（用英文逗号分隔）
            <input
              value={form.tags.join(", ")}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  tags: e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                }))
              }
              style={inputStyle}
              placeholder="喜羊羊, 恐怖, RPG"
            />
          </label>

          <label>
            游戏封面
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectCover}
              disabled={loading}
            />

            {coverPreview && (
              <img
                src={coverPreview}
                alt="封面预览"
                style={previewStyle}
              />
            )}
          </label>

          <label>
            蓝奏云链接
            <input
              name="lanzou"
              value={form.lanzou}
              onChange={change}
              style={inputStyle}
            />
          </label>

          <label>
            123 云盘链接
            <input
              name="pan123"
              value={form.pan123}
              onChange={change}
              style={inputStyle}
            />
          </label>
        </div>

        <label style={{ display: "block", marginTop: 18 }}>
          游戏介绍
          <textarea
            name="description"
            value={form.description}
            onChange={change}
            rows={5}
            style={inputStyle}
          />
        </label>

        <section style={sectionStyle}>
          <h2>详情页背景设置</h2>

          <label style={{ display: "block", marginTop: 12 }}>
            背景图片
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectBackground}
              disabled={loading}
            />

            {backgroundPreview && (
              <img
                src={backgroundPreview}
                alt="详情背景预览"
                style={previewStyle}
              />
            )}
          </label>

          <label style={{ display: "block", marginTop: 18 }}>
            背景透明度：{backgroundOpacity}%
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={backgroundOpacity}
              onChange={(e) =>
                setBackgroundOpacity(Number(e.target.value))
              }
              disabled={loading}
              style={inputStyle}
            />
            <small>数值范围为 0–100，具体视觉效果取决于详情页的实现。</small>
          </label>

          <label style={{ display: "block", marginTop: 18 }}>
            背景适配方式
            <select
              value={backgroundFit}
              onChange={(e) =>
                setBackgroundFit(e.target.value as "cover" | "contain")
              }
              disabled={loading}
              style={inputStyle}
            >
              <option value="cover">Cover：铺满区域，可能裁切</option>
              <option value="contain">Contain：完整显示，可能留白</option>
            </select>
          </label>
        </section>

        <section style={sectionStyle}>
          <h2>详情页标题设置</h2>

          <label style={{ display: "block", marginTop: 12 }}>
            标题显示模式
            <select
              value={titleMode}
              onChange={(e) =>
                setTitleMode(e.target.value as "text" | "image")
              }
              disabled={loading}
              style={inputStyle}
            >
              <option value="text">文字标题</option>
              <option value="image">透明 PNG 图片标题</option>
            </select>
          </label>

          {titleMode === "image" && (
            <label style={{ display: "block", marginTop: 18 }}>
              标题 PNG 图片 *
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={selectLogo}
                disabled={loading}
              />

              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="标题图片预览"
                  style={previewStyle}
                />
              )}

              <small>
                建议使用透明背景 PNG。上传接口同时支持 JPG 和 WebP。
              </small>
            </label>
          )}
        </section>

        <section style={sectionStyle}>
          <h2>详情页预览图</h2>

          <p>可以一次选择多张图片，按列表顺序展示。最多 100 张。</p>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={selectScreenshots}
            disabled={loading || screenshots.length >= 100}
          />

          {screenshots.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 16,
                marginTop: 18,
              }}
            >
              {screenshots.map((item, index) => (
                <div
                  key={`${item.preview}-${index}`}
                  style={{
                    border: "1px solid var(--line, #4a2028)",
                    padding: 10,
                    minWidth: 0,
                  }}
                >
                  <div>预览图 {index + 1}</div>

                  <img
                    src={item.preview}
                    alt={`预览图 ${index + 1}`}
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "contain",
                      marginTop: 8,
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => moveScreenshot(index, -1)}
                      disabled={loading || index === 0}
                    >
                      上移
                    </button>

                    <button
                      type="button"
                      onClick={() => moveScreenshot(index, 1)}
                      disabled={
                        loading || index === screenshots.length - 1
                      }
                    >
                      下移
                    </button>

                    <button
                      type="button"
                      onClick={() => removeScreenshot(index)}
                      disabled={loading}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={sectionStyle}>
          <h2>版本历史</h2>

          {history.map((item, index) => (
            <div
              key={index}
              className="history-item"
              style={{
                marginTop: 14,
                padding: 12,
                border: "1px solid var(--line, #4a2028)",
              }}
            >
              <label>
                版本号
                <input
                  value={item.version}
                  onChange={(e) =>
                    changeHistory(index, "version", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                更新日期
                <input
                  type="date"
                  value={item.date}
                  onChange={(e) =>
                    changeHistory(index, "date", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                蓝奏云链接
                <input
                  value={item.lanzou}
                  onChange={(e) =>
                    changeHistory(index, "lanzou", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                123 云盘链接
                <input
                  value={item.pan123}
                  onChange={(e) =>
                    changeHistory(index, "pan123", e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <button
                type="button"
                onClick={() => removeHistory(index)}
                disabled={loading}
              >
                删除此版本
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addHistory}
            disabled={loading}
            style={{ marginTop: 12 }}
          >
            添加版本
          </button>
        </section>

        <section style={sectionStyle}>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "正在保存，请勿关闭页面……" : "发布游戏"}
          </button>

          {loading && (
            <p role="status" aria-live="polite">
              {progress}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
