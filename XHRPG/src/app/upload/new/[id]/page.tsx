
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
};

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
};

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

async function readResponse(response: Response) {
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message || `请求失败，HTTP ${response.status}`
    );
  }

  return data;
}

export default function PublicNewGamePage() {
  const [form, setForm] = useState<GameForm>(INITIAL_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [questionLoading, setQuestionLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [credential, setCredential] = useState("");
  const [createdGameName, setCreatedGameName] = useState("");

  const loadQuestion = useCallback(async () => {
    setQuestionLoading(true);

    try {
      const response = await fetch(
        "/api/upload/verification-question",
        { cache: "no-store" }
      );

      const data = await readResponse(response);
      setQuestion(data.question);
      setAnswer("");
    } catch (error) {
      setQuestion(null);
      alert(
        error instanceof Error
          ? error.message
          : "无法获取验证题目"
      );
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
    >
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }) as GameForm);
  }

  function selectCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("封面只支持 PNG、JPG、WebP 格式");
      event.target.value = "";
      return;
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      alert("封面不能为空，且不能超过 5 MB");
      event.target.value = "";
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || credential) return;

    if (!form.name.trim()) {
      alert("请填写游戏名称");
      return;
    }

    if (!form.author.trim()) {
      alert("请填写作者");
      return;
    }

    if (!form.version.trim()) {
      alert("请填写版本");
      return;
    }

    if (!form.category) {
      alert("请选择游戏分类");
      return;
    }

    if (!coverFile) {
      alert("请上传游戏封面");
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
      alert("请至少填写蓝奏云或 123 云盘中的一个下载链接");
      return;
    }

    setLoading(true);

    try {
      // 第一步：上传封面到临时仓库。
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
        }
      );

      const imageData = await readResponse(imageResponse);

      if (typeof imageData.path !== "string") {
        throw new Error("临时封面上传成功，但没有返回图片路径");
      }

      // 第二步：提交游戏资料，由服务器强制设置为审核中。
      setProgress("正在提交游戏资料……");

      const submitResponse = await fetch(
        "/api/upload/submit-game",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            en: form.en.trim(),
            author: form.author.trim(),
            category: form.category,
            version: form.version.trim(),
            description: form.description.trim(),
            lanzou: form.lanzou.trim(),
            pan123: form.pan123.trim(),
            gameStatus: form.gameStatus,
            coverPath: imageData.path,
            questionId: question.id,
            answer: answer.trim(),
          }),
        }
      );

      const submitData = await readResponse(submitResponse);

      if (
        typeof submitData.credential !== "string" ||
        !submitData.credential
      ) {
        throw new Error("投稿已响应，但服务器没有返回编辑凭证");
      }

      setCredential(submitData.credential);
      setCreatedGameName(form.name.trim());
      setProgress("");
    } catch (error) {
      console.error("用户投稿失败:", error);

      alert(
        error instanceof Error
          ? error.message
          : "投稿失败，请稍后重试"
      );

      // 保留表单内容，方便用户重试。
      // 如果图片已上传但投稿未创建，后续还需接入临时图片清理接口。
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
            游戏「{createdGameName}」已经提交，当前状态为：
            <strong>审核中</strong>。
          </p>

          <p>
            审核通过后，游戏才会显示在网站公开游戏库中。
          </p>

          <div
            style={{
              border: "1px solid #4a2028",
              padding: 18,
              marginTop: 20,
              overflowWrap: "anywhere",
            }}
          >
            <h2>你的专属编辑凭证</h2>

            <p style={{ color: "#e7b76a" }}>
              请立即保存凭证。后续编辑这份投稿需要使用它。
            </p>

            <textarea
              readOnly
              value={credential}
              rows={3}
              style={inputStyle}
              onFocus={(event) => event.currentTarget.select()}
            />

            <button
              type="button"
              onClick={copyCredential}
              style={{ marginTop: 12, borderRadius: 0 }}
            >
              复制凭证
            </button>
          </div>

          <div style={{ marginTop: 24 }}>
            <Link href="/upload">返回上传游戏页面</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div
        className="admin-box game-form"
        style={{ maxWidth: 900, margin: "0 auto" }}
      >
        <h1>新建游戏投稿</h1>

        <p>
          请填写游戏资料并完成验证。提交后需要等待站长审核，
          审核通过后才会公开展示。
        </p>

        <form onSubmit={submit}>
          <div
            className="form-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
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
              <select
                name="category"
                value={form.category}
                onChange={change}
                required
                disabled={loading}
                style={inputStyle}
              >
                <option value="">请选择分类</option>
                <option value="角色扮演">角色扮演</option>
                <option value="动作冒险">动作冒险</option>
                <option value="策略战棋">策略战棋</option>
                <option value="恐怖悬疑">恐怖悬疑</option>
                <option value="模拟经营">模拟经营</option>
              </select>
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

          <label style={labelStyle}>
            游戏封面 *
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectCover}
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

          <div
            className="form-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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

          <section
            style={{
              border: "1px solid #4a2028",
              padding: 18,
              marginTop: 24,
            }}
          >
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
                    onChange={(event) => setAnswer(event.target.value)}
                    required
                    disabled={loading}
                    style={inputStyle}
                  />
                </label>

                <button
                  type="button"
                  onClick={loadQuestion}
                  disabled={loading || questionLoading}
                  style={{ borderRadius: 0 }}
                >
                  更换题目
                </button>
              </>
            ) : (
              <p>
                当前无法获取验证题目，请稍后重试。
              </p>
            )}
          </section>

          {progress && (
            <p role="status" style={{ marginTop: 18 }}>
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
                borderRadius: 0,
                padding: "12px 24px",
                cursor: loading ? "wait" : "pointer",
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
        </form>
      </div>
    </main>
  );
}
