
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from "react";
import SiteHeader from "@/app/components/SiteHeader";

type TimelineResponse = {
  content?: string;
  updatedAt?: string | null;
  canEdit?: boolean;
  error?: string;
};

type TimelineClientProps = {
  headerImage?: string | null;
};

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "transparent",
  color: "#f8eeee",
  padding: "20px 20px 60px",
  position: "relative",
  zIndex: 1,
};

const buttonStyle: CSSProperties = {
  background: "#8b1e2d",
  color: "#ffffff",
  border: "1px solid #a52a3a",
  borderRadius: 0,
  padding: "9px 14px",
  cursor: "pointer",
  fontSize: 14,
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "rgba(22, 12, 15, 0.9)",
  border: "1px solid #4a2028",
};

export default function TimelineClient({
  headerImage,
}: TimelineClientProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const [search, setSearch] = useState("");
  const [content, setContent] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fontSize, setFontSize] = useState("18");
  const [textColor, setTextColor] = useState("#f8eeee");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // 统一处理图片样式，确保编辑和查看状态表现一致。
  const applyImageStyles = useCallback((root: HTMLElement) => {
    root.querySelectorAll("img").forEach((image) => {
      image.style.maxWidth = "100%";
      image.style.width = "auto";
      image.style.height = "auto";
      image.style.maxHeight = "none";
      image.style.display = "block";
      image.style.margin = "16px auto";
      image.style.objectFit = "contain";
      image.style.visibility = "visible";
      image.style.opacity = "1";
    });
  }, []);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/timeline", {
        method: "GET",
        cache: "no-store",
      });

      const data: TimelineResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "读取大事记失败");
      }

      const nextContent = data.content || "";

      setContent(nextContent);
      setCanEdit(Boolean(data.canEdit));
      setUpdatedAt(data.updatedAt || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "读取大事记失败",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  // 仅在查看状态同步服务器内容。编辑状态下让 contentEditable 自己管理 DOM，
  // 避免上传图片或工具栏触发 React 重新渲染时覆盖用户正在编辑的 HTML。
  useEffect(() => {
    const editor = editorRef.current;

    if (loading || editing || !editor) return;

    if (editor.innerHTML !== content) {
      editor.innerHTML = content;
    }

    applyImageStyles(editor);
  }, [content, loading, editing, applyImageStyles]);

  // 保存编辑器选区，避免点击工具栏后丢失插入位置。
  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection) return;

    editor.focus();

    const savedRange = savedRangeRef.current;

    if (
      savedRange &&
      editor.contains(savedRange.commonAncestorContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return;
    }

    // 如果文件选择框导致浏览器丢失了光标，就把插入位置放到正文末尾，
    // 不要因为没有有效选区而让图片插入失败。
    const fallbackRange = document.createRange();
    fallbackRange.selectNodeContents(editor);
    fallbackRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(fallbackRange);
    savedRangeRef.current = fallbackRange.cloneRange();
  };

  const runCommand = (command: string, value?: string) => {
    if (!editing) return;

    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
  };

  const changeFontSize = (value: string) => {
    setFontSize(value);

    if (!editing) return;

    restoreSelection();
    document.execCommand("fontSize", false, "7");

    const editor = editorRef.current;

    if (editor) {
      editor.querySelectorAll("font[size='7']").forEach((font) => {
        const span = document.createElement("span");
        span.style.fontSize = `${value}px`;

        while (font.firstChild) {
          span.appendChild(font.firstChild);
        }

        font.replaceWith(span);
      });
    }

    saveSelection();
  };

  const changeColor = (value: string) => {
    setTextColor(value);
    runCommand("foreColor", value);
  };

  const insertHeading = (tag: "h2" | "h3" | "p") => {
    runCommand("formatBlock", tag);
  };

  const startEditing = () => {
    setError("");
    setMessage("");

    if (editorRef.current) {
      editorRef.current.innerHTML = content;
      applyImageStyles(editorRef.current);
    }

    setEditing(true);

    requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  };

  const cancelEditing = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
      applyImageStyles(editorRef.current);
    }

    savedRangeRef.current = null;
    setEditing(false);
    setError("");
    setMessage("");
  };

  const saveContent = async () => {
    const editor = editorRef.current;

    if (!editor) {
      setError("找不到大事记编辑器");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      applyImageStyles(editor);

      const html = editor.innerHTML;

      // 输出保存前图片信息，方便排查图片无法显示的问题。
      const images = Array.from(editor.querySelectorAll("img")).map(
        (image) => ({
          src: image.getAttribute("src"),
          loaded: image.complete && image.naturalWidth > 0,
          naturalWidth: image.naturalWidth,
        }),
      );

      console.log("[大事记] 保存前图片：", images);
      console.log("[大事记] 保存前 HTML：", html);

      const missingSrc = images.some(
        (image) => !image.src || !image.src.trim(),
      );

      if (missingSrc) {
        throw new Error("编辑器中存在没有图片地址的图片，请重新插入图片");
      }

      const response = await fetch("/api/timeline", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: html }),
      });

      const data: TimelineResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "保存失败");
      }

      const savedContent = data.content ?? html;

      setContent(savedContent);
      setUpdatedAt(data.updatedAt || null);

      if (editorRef.current) {
        editorRef.current.innerHTML = savedContent;
        applyImageStyles(editorRef.current);
      }

      setEditing(false);
      setMessage("大事记保存成功");
      savedRangeRef.current = null;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "保存失败，请稍后重试",
      );
    } finally {
      setSaving(false);
    }
  };

  const openImagePicker = () => {
    if (!editing || saving || uploading) return;

    saveSelection();
    imageInputRef.current?.click();
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // 允许重复选择同一个文件。
    event.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("只支持 JPG、PNG、WebP 和 GIF 图片");
      return;
    }

    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setError("图片大小必须大于 0 且不能超过 5 MB");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/timeline/upload", {
        method: "POST",
        body: formData,
      });

      const data: {
        success?: boolean;
        url?: string;
        error?: string;
      } = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "图片上传失败");
      }

      // 限制为 HTTP(S) 图片地址。
      let imageUrl: URL;

      try {
        imageUrl = new URL(data.url);
      } catch {
        throw new Error("上传接口返回的图片地址无效");
      }

      if (
        imageUrl.protocol !== "https:" &&
        imageUrl.protocol !== "http:"
      ) {
        throw new Error("图片地址必须使用 HTTP 或 HTTPS");
      }

      const editor = editorRef.current;

      if (!editor) {
        throw new Error("找不到编辑器");
      }

      if (!editing) {
        throw new Error("当前不是编辑模式，请先点击编辑大事记");
      }

      restoreSelection();

      const image = document.createElement("img");
      image.src = imageUrl.href;
      image.alt = file.name;
      image.title = file.name;
      // 编辑器内立即加载，避免懒加载导致刚插入时看起来像空白。
      image.loading = "eager";
      image.decoding = "async";

      image.style.maxWidth = "100%";
      image.style.width = "auto";
      image.style.height = "auto";
      image.style.maxHeight = "none";
      image.style.display = "block";
      image.style.margin = "16px auto";
      image.style.objectFit = "contain";
      image.style.visibility = "visible";
      image.style.opacity = "1";

      // 上传成功不代表原图一定能正常访问。
      image.onerror = () => {
        setError(
          `图片已上传到图床，但浏览器无法加载原图。请检查图片地址：${imageUrl.href}`,
        );
        setMessage("");
      };

      image.onload = () => {
        setError("");
        setMessage("图片已插入编辑器，请保存大事记以保留修改");
      };

      const selection = window.getSelection();

      if (
        selection &&
        selection.rangeCount > 0 &&
        editor.contains(
          selection.getRangeAt(0).commonAncestorContainer,
        )
      ) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(image);

        // 图片后面插入一个可继续输入的段落。
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        image.after(paragraph);

        range.setStart(paragraph, 0);
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editor.appendChild(image);
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        editor.appendChild(paragraph);
      }

      saveSelection();

      // 确认图片已经进入编辑器 DOM；后续保存会直接读取 editor.innerHTML。
      console.log("[大事记] 图片插入后数量：", editor.querySelectorAll("img").length);
      console.log("[大事记] 图片插入后 HTML 含 img：", /<img\b/i.test(editor.innerHTML));

      // 先提示插入成功；图片加载失败时 onerror 会覆盖此提示。
      setMessage("图片已插入编辑器，请保存大事记以保留修改");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "图片上传失败",
      );
    } finally {
      setUploading(false);
    }
  };

  const toolbarButton = (
    label: string,
    action: () => void,
    title?: string,
  ) => (
    <button
      key={label}
      type="button"
      title={title || label}
      style={secondaryButtonStyle}
      disabled={!editing || saving || uploading}
      onMouseDown={(event) => {
        event.preventDefault();
        saveSelection();
      }}
      onClick={action}
    >
      {label}
    </button>
  );

  return (
    <>
      <SiteHeader
        headerImage={headerImage}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <main style={pageStyle}>
        <div className="timeline-container">
          {loading ? (
            <div className="timeline-notice">正在加载大事记……</div>
          ) : (
            <>
              {error && (
                <div
                  className="timeline-alert timeline-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  className="timeline-alert timeline-success"
                  role="status"
                >
                  {message}
                </div>
              )}

              {editing && (
                <section className="editor-panel">
                  <div className="editor-panel-title">
                    <span>编辑工具</span>
                    <span className="editor-panel-hint">
                      修改完成后请点击保存
                    </span>
                  </div>

                  <div className="toolbar">
                    {toolbarButton("加粗", () => runCommand("bold"))}
                    {toolbarButton("斜体", () => runCommand("italic"))}
                    {toolbarButton("下划线", () =>
                      runCommand("underline"),
                    )}
                    {toolbarButton("删除线", () =>
                      runCommand("strikeThrough"),
                    )}
                    {toolbarButton("左对齐", () =>
                      runCommand("justifyLeft"),
                    )}
                    {toolbarButton("居中", () =>
                      runCommand("justifyCenter"),
                    )}
                    {toolbarButton("右对齐", () =>
                      runCommand("justifyRight"),
                    )}
                    {toolbarButton("项目符号", () =>
                      runCommand("insertUnorderedList"),
                    )}
                    {toolbarButton("编号列表", () =>
                      runCommand("insertOrderedList"),
                    )}
                    {toolbarButton("分隔线", () =>
                      runCommand("insertHorizontalRule"),
                    )}
                    {toolbarButton("H2 标题", () =>
                      insertHeading("h2"),
                    )}
                    {toolbarButton("H3 标题", () =>
                      insertHeading("h3"),
                    )}
                    {toolbarButton("正文段落", () =>
                      insertHeading("p"),
                    )}
                    {toolbarButton("插入图片", openImagePicker)}
                  </div>

                  <div className="toolbar-options">
                    <label className="toolbar-label">
                      字号
                      <select
                        value={fontSize}
                        onChange={(event) =>
                          changeFontSize(event.target.value)
                        }
                        disabled={!editing || saving || uploading}
                      >
                        {[
                          12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48,
                          56, 64, 72,
                        ].map((size) => (
                          <option key={size} value={size}>
                            {size}px
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="toolbar-label">
                      文字颜色
                      <input
                        aria-label="文字颜色"
                        type="color"
                        value={textColor}
                        onChange={(event) =>
                          changeColor(event.target.value)
                        }
                        disabled={!editing || saving || uploading}
                      />
                    </label>

                    <span className="toolbar-tip">
                      先选中文字，再使用字号或颜色工具
                    </span>
                  </div>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    onChange={uploadImage}
                  />

                  {uploading && (
                    <div className="editor-status">
                      正在上传图片……
                    </div>
                  )}
                </section>
              )}

              <section className="timeline-content-panel">
                <div className="content-panel-top">
                  <span className="content-panel-label">
                    <span className="status-dot" />
                    {editing ? "编辑模式" : "时间记录"}
                  </span>

                  {updatedAt && (
                    <span className="updated-at">
                      最近更新：
                      {new Date(updatedAt).toLocaleString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>

                <div
                  ref={editorRef}
                  className={`timeline-editor ${
                    editing ? "is-editing" : ""
                  }`}
                  contentEditable={editing}
                  suppressContentEditableWarning
                  spellCheck={editing}
                  onMouseUp={saveSelection}
                  onKeyUp={saveSelection}
                  onInput={saveSelection}
                  data-placeholder={
                    editing
                      ? "在这里编写大事记……可以输入文字、调整排版或插入图片。"
                      : "大事记内容正在等待添加。"
                  }
                />

                {!content.trim() && !editing && (
                  <div className="empty-hint">
                    暂无大事记内容，后续更新将在这里展示。
                  </div>
                )}
              </section>

              {canEdit && (
                <footer className="timeline-admin-footer">
                  {!editing ? (
                    <button
                      type="button"
                      style={buttonStyle}
                      onClick={startEditing}
                    >
                      编辑大事记
                    </button>
                  ) : (
                    <div className="editor-actions">
                      <button
                        type="button"
                        style={secondaryButtonStyle}
                        onClick={cancelEditing}
                        disabled={saving || uploading}
                      >
                        取消修改
                      </button>

                      <button
                        type="button"
                        style={buttonStyle}
                        onClick={saveContent}
                        disabled={saving || uploading}
                      >
                        {saving ? "正在保存……" : "保存大事记"}
                      </button>
                    </div>
                  )}
                </footer>
              )}

              {!canEdit && (
                <div className="read-only-note">
                  <span>—</span> 只读页面 <span>—</span>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
          border-radius: 0 !important;
        }

        .timeline-container {
          position: relative;
          max-width: 1050px;
          margin: 0 auto;
        }

        .timeline-content-panel,
        .editor-panel {
          border: 1px solid rgba(74, 32, 40, 0.92);
          background: rgba(22, 12, 15, 0.78);
          margin-top: 20px;
        }

        .content-panel-top {
          min-height: 48px;
          padding: 12px 18px;
          border-bottom: 1px solid rgba(74, 32, 40, 0.85);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          background: rgba(27, 13, 17, 0.78);
        }

        .content-panel-label {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #f4dfe2;
          font-size: 13px;
          letter-spacing: 1px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          background: #a52a3a;
          display: inline-block;
        }

        .updated-at {
          color: #bca4a9;
          font-size: 12px;
        }

        .timeline-editor {
          min-height: 320px;
          padding: 30px;
          color: #f8eeee;
          font-size: 18px;
          line-height: 2;
          overflow-wrap: anywhere;
          outline: none;
          background: transparent;
          overflow-x: auto;
        }

        .timeline-editor.is-editing {
          min-height: 420px;
          background: rgba(19, 10, 13, 0.88);
          box-shadow: inset 0 0 0 1px #6e2632;
        }

        .timeline-editor.is-editing:focus {
          box-shadow: inset 0 0 0 1px #a52a3a;
        }

        .timeline-editor:empty::before {
          content: attr(data-placeholder);
          color: #a38a90;
          pointer-events: none;
        }

        .timeline-editor h1,
        .timeline-editor h2,
        .timeline-editor h3,
        .timeline-editor h4 {
          color: #fff1f2;
          line-height: 1.5;
          margin: 24px 0 12px;
        }

        .timeline-editor h2 {
          border-left: 3px solid #8b1e2d;
          padding-left: 12px;
          font-size: 27px;
        }

        .timeline-editor h3 {
          font-size: 22px;
        }

        .timeline-editor p {
          margin: 12px 0;
        }

        .timeline-editor blockquote {
          border-left: 3px solid #8b1e2d;
          margin: 20px 0;
          padding: 10px 18px;
          color: #cbb4b9;
          background: rgba(29, 16, 20, 0.85);
        }

        .timeline-editor img {
          display: block;
          max-width: 100% !important;
          width: auto;
          height: auto !important;
          max-height: none !important;
          object-fit: contain;
          margin: 16px auto;
          visibility: visible;
          opacity: 1;
        }

        .timeline-editor a {
          color: #e46a7a;
          text-decoration: underline;
          overflow-wrap: anywhere;
        }

        .timeline-editor ul,
        .timeline-editor ol {
          padding-left: 28px;
        }

        .timeline-editor hr {
          border: 0;
          border-top: 1px solid #63303a;
          margin: 28px 0;
        }

        .empty-hint {
          color: #b19ba0;
          font-size: 13px;
          text-align: center;
          padding: 0 20px 28px;
        }

        .editor-panel {
          padding: 18px;
        }

        .editor-panel-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 15px;
          color: #f8eeee;
          font-size: 14px;
          font-weight: 700;
        }

        .editor-panel-hint,
        .toolbar-tip {
          font-size: 12px;
          font-weight: 400;
          color: #c0a8ad;
        }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .toolbar button,
        .editor-actions button,
        .timeline-admin-footer button {
          transition: background 0.15s ease;
        }

        .toolbar button:hover,
        .timeline-admin-footer button:hover {
          background: #a52a3a !important;
        }

        .toolbar button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .toolbar-options {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
          border-top: 1px solid rgba(74, 32, 40, 0.85);
          margin-top: 16px;
          padding-top: 15px;
        }

        .toolbar-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #d6c1c5;
          font-size: 13px;
        }

        .toolbar-label select {
          background: #10090b;
          color: #f8eeee;
          border: 1px solid #63303a;
          padding: 7px;
          outline: none;
        }

        .toolbar-label input[type="color"] {
          width: 35px;
          height: 30px;
          border: 1px solid #63303a;
          background: #10090b;
          padding: 2px;
          cursor: pointer;
        }

        .editor-status {
          color: #e6a6af;
          margin-top: 14px;
          font-size: 13px;
        }

        .timeline-admin-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(74, 32, 40, 0.85);
        }

        .editor-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .timeline-alert {
          padding: 12px 15px;
          margin: 14px 0;
          font-size: 13px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .timeline-error {
          border: 1px solid #8b1e2d;
          color: #ffb8c0;
          background: rgba(42, 13, 19, 0.95);
        }

        .timeline-success {
          border: 1px solid #315c45;
          color: #a6e5bd;
          background: rgba(16, 33, 23, 0.95);
        }

        .timeline-notice {
          padding: 50px 10px;
          color: #d0b9be;
          text-align: center;
          background: rgba(22, 12, 15, 0.72);
        }

        .read-only-note {
          margin-top: 28px;
          display: flex;
          justify-content: center;
          gap: 12px;
          color: #b09ba0;
          font-size: 11px;
          letter-spacing: 3px;
        }

        .read-only-note span {
          color: #8b1e2d;
        }

        @media (max-width: 600px) {
          .timeline-editor {
            padding: 20px 16px;
            font-size: 16px;
          }

          .editor-panel {
            padding: 12px;
          }

          .content-panel-top {
            padding: 12px;
          }

          .toolbar-options {
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}
