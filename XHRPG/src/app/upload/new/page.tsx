"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Question = {
  id: number;
  question: string;
};

type GameStatus =
  | "更新中"
  | "完结"
  | "Demo"
  | "弃坑"
  | "断更"
  | "预告";

type HistoryItem = {
  version: string;
  date: string;
  lanzou: string;
  pan123: string;
};

type ScreenshotItem = {
  file: File;
  preview: string;
};

type GameForm = {
  name: string;
  en: string;
  author: string;
  category: string;
  version: string;
  description: string;
  lanzou: string;
  pan123: string;
  gameStatus: GameStatus;
  tags: string[];
};

type ImageSetter = (file: File | null) => void;
type PreviewSetter = (preview: string) => void;

const INITIAL_FORM: GameForm = {
  name: "",
  en: "",
  author: "",
  category: "",
  version: "",
  description: "",
  lanzou: "",
  pan123: "",
  gameStatus: "更新中",
  tags: [],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_SCREENSHOTS = 5;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #4a2028",
  borderRadius: 0,
  background: "#10090b",
  color: "#f8eeee",
  marginTop: 6,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 18,
  color: "#f8eeee",
};

const sectionStyle: React.CSSProperties = {
  borderTop: "1px solid #4a2028",
  paddingTop: 22,
  marginTop: 28,
};

const buttonStyle: React.CSSProperties = {
  borderRadius: 0,
  border: "1px solid #8b1e2d",
  background: "#8b1e2d",
  color: "#fff",
  padding: "10px 16px",
  cursor: "pointer",
};

async function readResponse(response: Response) {
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message || `请求失败，HTTP ${response.status}`,
    );
  }

  return data;
}

function validateImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error("只支持 PNG、JPG、WebP 图片");
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new Error("图片不能为空，且不能超过 5 MB");
  }
}

function today() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

function createHistoryItem(): HistoryItem {
  return {
    version: "",
    date: today(),
    lanzou: "",
    pan123: "",
  };
}

function normalizeText(value: string) {
  return value.trim();
}

export default function PublicNewGamePage() {
  const [form, setForm] = useState<GameForm>(INITIAL_FORM);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  const [backgroundFile, setBackgroundFile] =
    useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [titleMode, setTitleMode] = useState<"text" | "image">(
    "text",
  );

  const [backgroundOpacity, setBackgroundOpacity] = useState(35);

  const [backgroundFit, setBackgroundFit] = useState<
    "cover" | "contain"
  >("cover");

  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [questionLoading, setQuestionLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [credential, setCredential] = useState("");
  const [createdGameName, setCreatedGameName] = useState("");

  // 统一追踪当前页面创建的 blob 图片地址，防止预览图长期占用内存。
  const previewUrlsRef = useRef<Set<string>>(new Set());

  const createPreview = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.add(url);
    return url;
  }, []);

  const releasePreview = useCallback((url: string) => {
    if (!url.startsWith("blob:")) return;
    if (!previewUrlsRef.current.has(url)) return;

    URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(url);
  }, []);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      previewUrlsRef.current.clear();
    };
  }, []);

  const loadQuestion = useCallback(async () => {
    setQuestionLoading(true);

    try {
      const response = await fetch(
        "/api/upload/verification-question",
        {
          cache: "no-store",
        },
      );

      const data = await readResponse(response);

      if (
        !data.question ||
        typeof data.question.id !== "number" ||
        typeof data.question.question !== "string"
      ) {
        throw new Error("服务器返回的验证题目格式不正确");
      }

      setQuestion(data.question);
      setAnswer("");
    } catch (error) {
      setQuestion(null);

      console.error("获取投稿验证题目失败:", error);
    } finally {
      setQuestionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuestion();
  }, [loadQuestion]);

  function change(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }) as GameForm);
  }

  function chooseImage(
    event: React.ChangeEvent<HTMLInputElement>,
    setter: ImageSetter,
    previewSetter: PreviewSetter,
    pngOnly = false,
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    try {
      if (pngOnly && file.type !== "image/png") {
        throw new Error(
          "标题图片必须使用 PNG 格式，以保留透明背景",
        );
      }

      validateImage(file);

      const preview = createPreview(file);

      // 只有在新图片验证成功后，才替换原图片。
      if (input.name === "cover") {
        releasePreview(coverPreview);
      } else if (input.name === "background") {
        releasePreview(backgroundPreview);
      } else if (input.name === "logo") {
        releasePreview(logoPreview);
      }

      setter(file);
      previewSetter(preview);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "图片格式错误",
      );

      input.value = "";
    }
  }

  function addTag() {
    const tag = normalizeText(tagInput);

    if (!tag) return;

    if (form.tags.includes(tag)) {
      setTagInput("");
      return;
    }

    setForm((previous) => ({
      ...previous,
      tags: [...previous.tags, tag],
    }));

    setTagInput("");
  }

  function removeTag(index: number) {
    setForm((previous) => ({
      ...previous,
      tags: previous.tags.filter((_, i) => i !== index),
    }));
  }

  function addHistory() {
    setHistory((previous) => [
      ...previous,
      createHistoryItem(),
    ]);
  }

  function changeHistory(
    index: number,
    key: keyof HistoryItem,
    value: string,
  ) {
    setHistory((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  function removeHistory(index: number) {
    setHistory((previous) =>
      previous.filter((_, i) => i !== index),
    );
  }

  // 详情预览图最多 5 张，同时限制单张图片的格式和大小。
  function addScreenshots(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);

    if (!files.length) return;

    try {
      const remaining = MAX_SCREENSHOTS - screenshots.length;

      if (remaining <= 0) {
        throw new Error(
          `详情预览图最多只能添加 ${MAX_SCREENSHOTS} 张。`,
        );
      }

      if (files.length > remaining) {
        throw new Error(
          `详情预览图最多 ${MAX_SCREENSHOTS} 张，你还可以添加 ${remaining} 张。`,
        );
      }

      files.forEach(validateImage);

      const newItems: ScreenshotItem[] = files.map((file) => ({
        file,
        preview: createPreview(file),
      }));

      setScreenshots((previous) => [
        ...previous,
        ...newItems,
      ]);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "预览图选择失败",
      );
    } finally {
      // 允许用户再次选择相同的文件。
      input.value = "";
    }
  }

  function moveScreenshot(index: number, direction: -1 | 1) {
    setScreenshots((previous) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= previous.length) {
        return previous;
      }

      const next = [...previous];

      [next[index], next[nextIndex]] = [
        next[nextIndex],
        next[index],
      ];

      return next;
    });
  }

  function removeScreenshot(index: number) {
    const target = screenshots[index];

    if (target) {
      releasePreview(target.preview);
    }

    setScreenshots((previous) =>
      previous.filter((_, i) => i !== index),
    );
  }

  function cleanHistory() {
    return history
      .map((item) => ({
        version: normalizeText(item.version),
        date: normalizeText(item.date),
        lanzou: normalizeText(item.lanzou),
        pan123: normalizeText(item.pan123),
      }))
      .filter(
        (item) =>
          item.version ||
          item.date ||
          item.lanzou ||
          item.pan123,
      );
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading || credential) return;

    if (
      !form.name.trim() ||
      !form.author.trim() ||
      !form.version.trim() ||
      !form.category.trim()
    ) {
      alert("请填写游戏名称、作者、版本并填写分类");
      return;
    }

    if (!coverFile) {
      alert("请上传游戏封面");
      return;
    }

    if (titleMode === "image" && !logoFile) {
      alert("标题模式选择了 PNG 图片，请上传标题图片");
      return;
    }

    if (screenshots.length > MAX_SCREENSHOTS) {
      alert(`详情预览图最多只能上传 ${MAX_SCREENSHOTS} 张。`);
      return;
    }

    if (!question || !answer.trim()) {
      alert("请完成下方人机验证");
      return;
    }

    if (
      !["弃坑", "断更", "预告"].includes(form.gameStatus) &&
      !form.lanzou.trim() &&
      !form.pan123.trim()
    ) {
      alert(
        "请至少填写蓝奏云或 123 云盘中的一个下载链接",
      );
      return;
    }

    setLoading(true);

    try {
      // 当前接口仅正式接收封面，其他图片尚未上传到正式存储。
      setProgress("正在上传封面到临时仓库……");

      const imageForm = new FormData();

      imageForm.append("file", coverFile);
      imageForm.append("questionId", String(question.id));
      imageForm.append("answer", answer.trim());

      const imageResponse = await fetch(
        "/api/upload/submission-image",
        {
          method: "POST",
          body: imageForm,
        },
      );

      const imageData = await readResponse(imageResponse);

      if (
        typeof imageData.path !== "string" ||
        !imageData.path.trim()
      ) {
        throw new Error(
          "临时封面上传成功，但服务器没有返回图片路径",
        );
      }

      setProgress("正在提交游戏资料……");

      const payload = {
        name: normalizeText(form.name),
        en: normalizeText(form.en),
        author: normalizeText(form.author),
        category: normalizeText(form.category),
        version: normalizeText(form.version),
        description: form.description.trim(),
        lanzou: normalizeText(form.lanzou),
        pan123: normalizeText(form.pan123),
        gameStatus: form.gameStatus,
        coverPath: imageData.path,
        questionId: question.id,
        answer: answer.trim(),
        tags: form.tags
          .map(normalizeText)
          .filter(Boolean),
        titleMode,
        detailBackgroundOpacity: backgroundOpacity,
        detailBackgroundFit: backgroundFit,
        history: cleanHistory(),
        screenshotsCount: screenshots.length,
        hasDetailBackground: Boolean(backgroundFile),
        hasTitleLogo: Boolean(logoFile),
      };

      const submitResponse = await fetch(
        "/api/upload/submit-game",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const submitData = await readResponse(submitResponse);

      if (
        typeof submitData.credential !== "string" ||
        !submitData.credential.trim()
      ) {
        throw new Error("服务器没有返回编辑凭证");
      }

      setCredential(submitData.credential);
      setCreatedGameName(normalizeText(form.name));
      setProgress("");
    } catch (error) {
      console.error("用户投稿失败:", error);

      alert(
        error instanceof Error
          ? error.message
          : "投稿失败，请稍后重试",
      );
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  async function copyCredential() {
    try {
      await navigator.clipboard.writeText(credential);
      alert("凭证已复制，请妥善保存");
    } catch {
      alert("复制失败，请手动选择并复制凭证");
    }
  }

  if (credential) {
    return (
      <main className="admin-page">
        <div
          className="admin-box game-form"
          style={{ maxWidth: 760, margin: "0 auto" }}
        >
          <h1>投稿提交成功</h1>

          <p>
            游戏「{createdGameName}」已提交，当前状态为：
            <strong>审核中</strong>。
          </p>

          <p>
            审核通过后，游戏才会显示在网站公开游戏库中。
          </p>

          <section style={sectionStyle}>
            <h2>你的专属编辑凭证</h2>

            <p style={{ color: "#e7b76a" }}>
              请立即保存凭证。后续编辑这份投稿需要使用它。
              请勿将凭证公开分享给他人。
            </p>

            <textarea
              readOnly
              value={credential}
              rows={3}
              style={inputStyle}
              onFocus={(event) =>
                event.currentTarget.select()
              }
            />

            <button
              type="button"
              onClick={copyCredential}
              style={{ ...buttonStyle, marginTop: 12 }}
            >
              复制凭证
            </button>
          </section>

          <p style={{ marginTop: 24 }}>
            <Link href="/upload">
              返回上传游戏页面
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div
        className="admin-box game-form"
        style={{ maxWidth: 1000, margin: "0 auto" }}
      >
        <h1>新建游戏投稿</h1>

        <p>
          请填写游戏资料并完成验证。提交后需要等待站长审核，
          审核通过后才会公开展示。
        </p>

        <form onSubmit={submit}>
          <section
            style={{ ...sectionStyle, marginTop: 20 }}
          >
            <h2>基础信息</h2>

            <div
              className="form-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                marginTop: 16,
              }}
            >
              <label style={labelStyle}>
                游戏名称 *
                <input
                  name="name"
                  value={form.name}
                  onChange={change}
                  maxLength={120}
                  required
                  disabled={loading}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                英文名称
                <input
                  name="en"
                  value={form.en}
                  onChange={change}
                  maxLength={120}
                  disabled={loading}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                作者 *
                <input
                  name="author"
                  value={form.author}
                  onChange={change}
                  maxLength={120}
                  required
                  disabled={loading}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                游戏版本 *
                <input
                  name="version"
                  value={form.version}
                  onChange={change}
                  maxLength={80}
                  required
                  disabled={loading}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                游戏分类 *
                <input
                  name="category"
                  type="text"
                  value={form.category}
                  onChange={change}
                  maxLength={40}
                  required
                  disabled={loading}
                  placeholder="例如：角色扮演、解谜探索"
                  style={inputStyle}
                />

                <small
                  style={{
                    display: "block",
                    marginTop: 6,
                    opacity: 0.7,
                  }}
                >
                  可以自行填写分类，方便为不同类型的同人游戏建立索引。
                </small>
              </label>

              <label style={labelStyle}>
                作品状态 *
                <select
                  name="gameStatus"
                  value={form.gameStatus}
                  onChange={change}
                  disabled={loading}
                  style={inputStyle}
                >
                  <option value="更新中">更新中</option>
                  <option value="完结">完结</option>
                  <option value="Demo">Demo</option>
                  <option value="弃坑">弃坑</option>
                  <option value="断更">断更</option>
                  <option value="预告">预告</option>
                </select>
              </label>
            </div>
          </section>

          <section style={sectionStyle}>
            <h2>游戏标签</h2>

            <p>输入标签后点击添加。标签可以帮助玩家检索游戏。</p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 12,
              }}
            >
              <input
                value={tagInput}
                onChange={(event) =>
                  setTagInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="输入标签，例如：恐怖"
                disabled={loading}
                maxLength={40}
                style={{
                  ...inputStyle,
                  flex: "1 1 220px",
                  width: "auto",
                  marginTop: 0,
                }}
              />

              <button
                type="button"
                onClick={addTag}
                disabled={loading || !tagInput.trim()}
                style={buttonStyle}
              >
                添加标签
              </button>
            </div>

            {form.tags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {form.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      border: "1px solid #4a2028",
                      background: "#160c0f",
                    }}
                  >
                    {tag}

                    <button
                      type="button"
                      aria-label={`删除标签 ${tag}`}
                      onClick={() => removeTag(index)}
                      disabled={loading}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section style={sectionStyle}>
            <h2>游戏封面</h2>

            <label style={labelStyle}>
              游戏封面 *
              <input
                name="cover"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  chooseImage(
                    event,
                    setCoverFile,
                    setCoverPreview,
                  )
                }
                required
                disabled={loading}
                style={{ ...inputStyle, padding: 8 }}
              />

              <small>
                支持 PNG、JPG、WebP，最大 5 MB。
                封面会先存入临时仓库，审核通过后再同步到正式仓库。
              </small>

              {coverPreview && (
                <img
                  src={coverPreview}
                  alt="游戏封面预览"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: 280,
                    objectFit: "contain",
                    marginTop: 12,
                    border: "1px solid #4a2028",
                  }}
                />
              )}
            </label>
          </section>

          <section style={sectionStyle}>
            <h2>下载链接与游戏介绍</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              <label style={labelStyle}>
                蓝奏云链接
                <input
                  name="lanzou"
                  type="url"
                  value={form.lanzou}
                  onChange={change}
                  disabled={loading}
                  style={inputStyle}
                  placeholder="https://..."
                />
              </label>

              <label style={labelStyle}>
                123 云盘链接
                <input
                  name="pan123"
                  type="url"
                  value={form.pan123}
                  onChange={change}
                  disabled={loading}
                  style={inputStyle}
                  placeholder="https://..."
                />
              </label>
            </div>

            <p style={{ fontSize: 14, opacity: 0.8 }}>
              更新中、完结、Demo 等正常状态至少填写一个下载链接。
              弃坑、断更、预告可以暂时不填写。
            </p>

            <label style={labelStyle}>
              游戏介绍
              <textarea
                name="description"
                value={form.description}
                onChange={change}
                rows={5}
                maxLength={5000}
                disabled={loading}
                style={inputStyle}
              />
            </label>
          </section>

          <section style={sectionStyle}>
            <h2>详情页背景设置</h2>

            <p>
              可为游戏详情页设置独立背景，审核通过后应用。
            </p>

            <label style={labelStyle}>
              背景图片
              <input
                name="background"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  chooseImage(
                    event,
                    setBackgroundFile,
                    setBackgroundPreview,
                  )
                }
                disabled={loading}
                style={{ ...inputStyle, padding: 8 }}
              />

              {backgroundPreview && (
                <img
                  src={backgroundPreview}
                  alt="详情背景预览"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: 260,
                    objectFit: "contain",
                    marginTop: 12,
                    border: "1px solid #4a2028",
                  }}
                />
              )}
            </label>

            <label style={labelStyle}>
              背景透明度：{backgroundOpacity}%
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={backgroundOpacity}
                onChange={(event) =>
                  setBackgroundOpacity(
                    Number(event.target.value),
                  )
                }
                disabled={loading}
                style={{ ...inputStyle, padding: 0 }}
              />

              <small>数值范围 0–100。</small>
            </label>

            <label style={labelStyle}>
              背景适配方式
              <select
                value={backgroundFit}
                onChange={(event) =>
                  setBackgroundFit(
                    event.target.value as "cover" | "contain",
                  )
                }
                disabled={loading}
                style={inputStyle}
              >
                <option value="cover">
                  Cover：铺满区域，可能裁切
                </option>
                <option value="contain">
                  Contain：完整显示，可能留白
                </option>
              </select>
            </label>
          </section>

          <section style={sectionStyle}>
            <h2>详情页标题设置</h2>

            <label style={labelStyle}>
              标题显示模式
              <select
                value={titleMode}
                onChange={(event) =>
                  setTitleMode(
                    event.target.value as "text" | "image",
                  )
                }
                disabled={loading}
                style={inputStyle}
              >
                <option value="text">文字标题</option>
                <option value="image">透明 PNG 图片标题</option>
              </select>
            </label>

            {titleMode === "image" && (
              <label style={labelStyle}>
                标题 PNG 图片 *
                <input
                  name="logo"
                  type="file"
                  accept="image/png"
                  onChange={(event) =>
                    chooseImage(
                      event,
                      setLogoFile,
                      setLogoPreview,
                      true,
                    )
                  }
                  disabled={loading}
                  style={{ ...inputStyle, padding: 8 }}
                />

                <small>
                  必须使用 PNG 格式，以便保留透明背景。
                </small>

                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="标题 PNG 预览"
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      maxHeight: 180,
                      objectFit: "contain",
                      marginTop: 12,
                      border: "1px solid #4a2028",
                    }}
                  />
                )}
              </label>
            )}
          </section>

          <section style={sectionStyle}>
            <h2>详情页预览图</h2>

            <p>
              可以一次选择多张图片，按列表顺序展示，最多{" "}
              {MAX_SCREENSHOTS} 张。支持 PNG、JPG、WebP，单张图片最大 5 MB。
            </p>

            <p
              style={{
                fontSize: 14,
                color: "#e7b76a",
                marginTop: 8,
              }}
            >
              已添加 {screenshots.length}/{MAX_SCREENSHOTS} 张
            </p>

            <label style={labelStyle}>
              选择预览图
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={addScreenshots}
                disabled={
                  loading ||
                  screenshots.length >= MAX_SCREENSHOTS
                }
                style={{ ...inputStyle, padding: 8 }}
              />
            </label>

            {screenshots.length >= MAX_SCREENSHOTS && (
              <p style={{ fontSize: 13, opacity: 0.75 }}>
                已达到预览图数量上限。如需更换图片，请先删除已有图片。
              </p>
            )}

            {screenshots.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 16,
                  marginTop: 18,
                }}
              >
                {screenshots.map((item, index) => (
                  <div
                    key={`${item.preview}-${index}`}
                    style={{
                      border: "1px solid #4a2028",
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
                        height: 130,
                        objectFit: "contain",
                        marginTop: 8,
                      }}
                    />

                    <p
                      style={{
                        fontSize: 12,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.file.name}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          moveScreenshot(index, -1)
                        }
                        disabled={loading || index === 0}
                        style={buttonStyle}
                      >
                        上移
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveScreenshot(index, 1)
                        }
                        disabled={
                          loading ||
                          index === screenshots.length - 1
                        }
                        style={buttonStyle}
                      >
                        下移
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeScreenshot(index)
                        }
                        disabled={loading}
                        style={buttonStyle}
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

            <p>
              可填写已有历史版本的版本号、日期及下载链接。
            </p>

            {history.map((item, index) => (
              <div
                key={index}
                style={{
                  marginTop: 14,
                  padding: 14,
                  border: "1px solid #4a2028",
                }}
              >
                <h3>历史版本 {index + 1}</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: 12,
                  }}
                >
                  <label style={labelStyle}>
                    版本号
                    <input
                      value={item.version}
                      onChange={(event) =>
                        changeHistory(
                          index,
                          "version",
                          event.target.value,
                        )
                      }
                      disabled={loading}
                      style={inputStyle}
                    />
                  </label>

                  <label style={labelStyle}>
                    更新日期
                    <input
                      type="date"
                      value={item.date}
                      onChange={(event) =>
                        changeHistory(
                          index,
                          "date",
                          event.target.value,
                        )
                      }
                      disabled={loading}
                      style={inputStyle}
                    />
                  </label>

                  <label style={labelStyle}>
                    蓝奏云链接
                    <input
                      type="url"
                      value={item.lanzou}
                      onChange={(event) =>
                        changeHistory(
                          index,
                          "lanzou",
                          event.target.value,
                        )
                      }
                      disabled={loading}
                      style={inputStyle}
                      placeholder="https://..."
                    />
                  </label>

                  <label style={labelStyle}>
                    123 云盘链接
                    <input
                      type="url"
                      value={item.pan123}
                      onChange={(event) =>
                        changeHistory(
                          index,
                          "pan123",
                          event.target.value,
                        )
                      }
                      disabled={loading}
                      style={inputStyle}
                      placeholder="https://..."
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => removeHistory(index)}
                  disabled={loading}
                  style={buttonStyle}
                >
                  删除此版本
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addHistory}
              disabled={loading}
              style={{ ...buttonStyle, marginTop: 12 }}
            >
              添加版本
            </button>
          </section>

          <section style={sectionStyle}>
            <h2>人机验证</h2>

            {questionLoading ? (
              <p>正在获取验证题目……</p>
            ) : question ? (
              <>
                <p>{question.question}</p>

                <label style={labelStyle}>
                  请输入答案 *
                  <input
                    value={answer}
                    onChange={(event) =>
                      setAnswer(event.target.value)
                    }
                    required
                    disabled={loading}
                    style={inputStyle}
                  />
                </label>

                <button
                  type="button"
                  onClick={loadQuestion}
                  disabled={loading || questionLoading}
                  style={buttonStyle}
                >
                  更换题目
                </button>
              </>
            ) : (
              <>
                <p>
                  当前无法获取验证题目，请检查验证题库是否存在已启用的问题。
                </p>

                <button
                  type="button"
                  onClick={loadQuestion}
                  disabled={questionLoading || loading}
                  style={buttonStyle}
                >
                  重新获取题目
                </button>
              </>
            )}
          </section>

          {progress && (
            <p
              role="status"
              aria-live="polite"
              style={{ marginTop: 18 }}
            >
              {progress}
            </p>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 24,
            }}
          >
            <button
              type="submit"
              disabled={
                loading ||
                questionLoading ||
                !question ||
                !answer.trim()
              }
              style={{
                ...buttonStyle,
                padding: "12px 24px",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "正在提交……" : "提交审核"}
            </button>

            <Link
              href="/upload"
              style={{
                display: "inline-flex",
                alignItems: "center",
                border: "1px solid #4a2028",
                padding: "12px 24px",
              }}
            >
              返回上传游戏
            </Link>
          </div>

          <p
            style={{
              fontSize: 13,
              opacity: 0.72,
              marginTop: 18,
            }}
          >
            注意：当前版本的投稿接口正式上传封面。详情背景、标题图和预览图目前仅支持前端选择与预览；标签、版本历史及其他详情设置是否保存，取决于后端投稿 API 是否接收并写入这些字段。需要这些功能实际生效时，还需要同步扩展对应的 API 和数据库保存逻辑。
          </p>
        </form>
      </div>
    </main>
  );
}
