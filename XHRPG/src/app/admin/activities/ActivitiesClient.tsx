
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ActivityItem = {
  id: number;
  title: string;
  cover: string | null;
  background: string | null;
  backgroundFit: string;
  backgroundOpacity: number;
  titleColor: string;
  titleSize: number;
  content: string;
  showOnHome: boolean;
  enabled: boolean;
  sort: number;
};

type ActivityForm = Omit<ActivityItem, "id">;

const emptyForm: ActivityForm = {
  title: "",
  cover: null,
  background: null,
  backgroundFit: "cover",
  backgroundOpacity: 35,
  titleColor: "#ffffff",
  titleSize: 36,
  content: "",
  showOnHome: false,
  enabled: true,
  sort: 0,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  background: "#10090b",
  color: "#f8eeee",
  border: "1px solid #4a2028",
  borderRadius: 0,
  padding: "10px 12px",
  outlineColor: "#a52a3a",
};

const buttonStyle: React.CSSProperties = {
  background: "#8b1e2d",
  color: "#fff",
  border: "1px solid #a52a3a",
  borderRadius: 0,
  padding: "9px 13px",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#211216",
  border: "1px solid #4a2028",
};

export default function ActivitiesClient() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [form, setForm] = useState<ActivityForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<
    "cover" | "background" | "inline"
  >("cover");

  const loadActivities = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/activities", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "获取活动列表失败");
      }

      setActivities(result.activities || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "获取活动列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  function updateForm<K extends keyof ActivityForm>(
    key: K,
    value: ActivityForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setMessage("");

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(activity: ActivityItem) {
    setEditingId(activity.id);

    const nextForm: ActivityForm = {
      title: activity.title || "",
      cover: activity.cover,
      background: activity.background,
      backgroundFit: activity.backgroundFit || "cover",
      backgroundOpacity: activity.backgroundOpacity ?? 35,
      titleColor: activity.titleColor || "#ffffff",
      titleSize: activity.titleSize ?? 36,
      content: activity.content || "",
      showOnHome: activity.showOnHome,
      enabled: activity.enabled,
      sort: activity.sort ?? 0,
    };

    setForm(nextForm);
    setMessage("");

    if (editorRef.current) {
      editorRef.current.innerHTML = nextForm.content;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(file: File): Promise<string> {
    const data = new FormData();
    data.append("file", file);

    const response = await fetch("/api/upload/activity", {
      method: "POST",
      body: data,
    });

    const result = await response.json();

    if (!response.ok || !result.success || !result.url) {
      throw new Error(result.message || "图片上传失败");
    }

    return result.url as string;
  }

  async function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("请选择图片文件。");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("图片不能超过 5 MB。");
      return;
    }

    try {
      setMessage("正在上传图片……");
      const url = await uploadImage(file);

      if (uploadTarget === "cover") {
        updateForm("cover", url);
      } else if (uploadTarget === "background") {
        updateForm("background", url);
      } else {
        const editor = editorRef.current;

        if (editor) {
          editor.focus();
          document.execCommand("insertImage", false, url);
          updateForm("content", editor.innerHTML);
        }
      }

      setMessage("图片上传成功。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片上传失败");
    }
  }

  function runEditorCommand(command: string, value?: string) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, value);
    updateForm("content", editor.innerHTML);
  }

  function insertLink() {
    const url = window.prompt("请输入链接地址（https:// 或 http://）");
    if (!url) return;

    if (!/^https?:\/\//i.test(url)) {
      setMessage("链接必须以 http:// 或 https:// 开头。");
      return;
    }

    runEditorCommand("createLink", url);
  }

  async function saveActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setMessage("请先填写活动标题。");
      return;
    }

    const content = editorRef.current?.innerHTML ?? form.content;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/activities/${editingId}`
          : "/api/admin/activities",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, content }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "保存活动失败");
      }

      setMessage(editingId ? "活动修改成功。" : "活动创建成功。");
      await loadActivities();

      if (!editingId && result.activity) {
        startEdit(result.activity as ActivityItem);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存活动失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteActivity(activity: ActivityItem) {
    if (!window.confirm(`确定永久删除活动「${activity.title}」吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/activities/${activity.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "删除活动失败");
      }

      if (editingId === activity.id) {
        startNew();
      }

      setMessage("活动已删除。");
      await loadActivities();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除活动失败");
    }
  }

  async function toggleField(
    activity: ActivityItem,
    field: "enabled" | "showOnHome",
  ) {
    const updated = { ...activity, [field]: !activity[field] };

    try {
      const response = await fetch(`/api/admin/activities/${activity.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "修改状态失败");
      }

      setMessage("活动状态已更新。");
      await loadActivities();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "修改状态失败");
    }
  }

  const fieldLabel: React.CSSProperties = {
    display: "block",
    color: "#d8c4c8",
    fontSize: 14,
    marginBottom: 7,
  };

  return (
    <div>
      {message && (
        <div
          role="status"
          style={{
            border: "1px solid #4a2028",
            background: "#211216",
            padding: "12px 14px",
            marginBottom: 18,
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </div>
      )}

      <section
        style={{
          background: "#160c0f",
          border: "1px solid #4a2028",
          padding: 20,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 21 }}>
            {editingId ? `编辑活动 #${editingId}` : "新建活动"}
          </h2>

          {editingId !== null && (
            <button type="button" style={secondaryButtonStyle} onClick={startNew}>
              取消编辑 / 新建
            </button>
          )}
        </div>

        <form onSubmit={saveActivity}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 18,
            }}
          >
            <label>
              <span style={fieldLabel}>活动标题 *</span>
              <input
                style={inputStyle}
                maxLength={200}
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                required
              />
            </label>

            <label>
              <span style={fieldLabel}>标题颜色</span>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="color"
                  value={form.titleColor}
                  onChange={(event) =>
                    updateForm("titleColor", event.target.value)
                  }
                  style={{
                    width: 48,
                    height: 40,
                    background: "#10090b",
                    border: "1px solid #4a2028",
                    borderRadius: 0,
                  }}
                />
                <input
                  style={inputStyle}
                  value={form.titleColor}
                  onChange={(event) =>
                    updateForm("titleColor", event.target.value)
                  }
                  pattern="^#[0-9a-fA-F]{6}$"
                />
              </div>
            </label>

            <label>
              <span style={fieldLabel}>标题字号（12–96）</span>
              <input
                style={inputStyle}
                type="number"
                min={12}
                max={96}
                value={form.titleSize}
                onChange={(event) =>
                  updateForm("titleSize", Number(event.target.value))
                }
              />
            </label>

            <label>
              <span style={fieldLabel}>排序（数字越小越靠前）</span>
              <input
                style={inputStyle}
                type="number"
                value={form.sort}
                onChange={(event) =>
                  updateForm("sort", Number(event.target.value))
                }
              />
            </label>

            <label>
              <span style={fieldLabel}>详情背景图适配</span>
              <select
                style={inputStyle}
                value={form.backgroundFit}
                onChange={(event) =>
                  updateForm("backgroundFit", event.target.value)
                }
              >
                <option value="cover">铺满背景（cover）</option>
                <option value="contain">完整显示（contain）</option>
              </select>
            </label>

            <label>
              <span style={fieldLabel}>
                背景遮罩透明度：{form.backgroundOpacity}%
              </span>
              <input
                style={{ ...inputStyle, padding: "10px 0" }}
                type="range"
                min={0}
                max={100}
                value={form.backgroundOpacity}
                onChange={(event) =>
                  updateForm("backgroundOpacity", Number(event.target.value))
                }
              />
              <small style={{ color: "#bba9ac" }}>
                数值越高，背景图片越清晰。
              </small>
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
              marginTop: 22,
            }}
          >
            <div>
              <span style={fieldLabel}>活动宣传图</span>
              {form.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.cover}
                  alt="活动宣传图预览"
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "contain",
                    background: "#10090b",
                    border: "1px solid #4a2028",
                    marginBottom: 10,
                  }}
                />
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => {
                    setUploadTarget("cover");
                    coverInputRef.current?.click();
                  }}
                >
                  上传宣传图
                </button>
                {form.cover && (
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => updateForm("cover", null)}
                  >
                    移除宣传图
                  </button>
                )}
              </div>
            </div>

            <div>
              <span style={fieldLabel}>详情页背景图</span>
              {form.background && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.background}
                  alt="活动背景图预览"
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "contain",
                    background: "#10090b",
                    border: "1px solid #4a2028",
                    marginBottom: 10,
                  }}
                />
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => {
                    setUploadTarget("background");
                    backgroundInputRef.current?.click();
                  }}
                >
                  上传背景图
                </button>
                {form.background && (
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => updateForm("background", null)}
                  >
                    移除背景图
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <span style={fieldLabel}>活动正文（富文本）</span>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                padding: 10,
                border: "1px solid #4a2028",
                background: "#211216",
                marginBottom: 0,
              }}
            >
              <button type="button" style={secondaryButtonStyle} onClick={() => runEditorCommand("bold")}>
                加粗
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={() => runEditorCommand("italic")}>
                斜体
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={() => runEditorCommand("underline")}>
                下划线
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={() => runEditorCommand("formatBlock", "h2")}>
                二级标题
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={() => runEditorCommand("formatBlock", "h3")}>
                三级标题
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={() => runEditorCommand("insertUnorderedList")}>
                无序列表
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={() => runEditorCommand("insertOrderedList")}>
                有序列表
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={insertLink}>
                插入链接
              </button>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  setUploadTarget("inline");
                  inlineImageInputRef.current?.click();
                }}
              >
                上传正文图片
              </button>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#d8c4c8",
                  fontSize: 13,
                }}
              >
                文字颜色
                <input
                  type="color"
                  defaultValue="#f8eeee"
                  onChange={(event) =>
                    runEditorCommand("foreColor", event.target.value)
                  }
                  style={{ width: 34, height: 30, borderRadius: 0 }}
                />
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#d8c4c8",
                  fontSize: 13,
                }}
              >
                字号
                <select
                  defaultValue="3"
                  onChange={(event) =>
                    runEditorCommand("fontSize", event.target.value)
                  }
                  style={{
                    background: "#10090b",
                    color: "#f8eeee",
                    border: "1px solid #4a2028",
                    borderRadius: 0,
                    padding: 5,
                  }}
                >
                  <option value="2">小</option>
                  <option value="3">正常</option>
                  <option value="4">较大</option>
                  <option value="5">大</option>
                  <option value="6">特大</option>
                </select>
              </label>
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(event) =>
                updateForm("content", event.currentTarget.innerHTML)
              }
              data-placeholder="在这里输入活动正文。可以设置文字颜色、标题、列表、链接和图片。"
              style={{
                minHeight: 320,
                padding: 18,
                background: "#10090b",
                color: "#f8eeee",
                border: "1px solid #4a2028",
                outlineColor: "#a52a3a",
                lineHeight: 1.9,
                overflowWrap: "anywhere",
              }}
            />

            <small style={{ color: "#bba9ac", display: "block", marginTop: 8 }}>
              提示：先选中文字，再使用颜色或字号工具。插入图片后，保存活动即可保存正文。
            </small>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 22,
              marginTop: 22,
              padding: "16px 0",
              borderTop: "1px solid #4a2028",
              borderBottom: "1px solid #4a2028",
            }}
          >
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => updateForm("enabled", event.target.checked)}
              />
              活动上架（公众可访问）
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.showOnHome}
                onChange={(event) =>
                  updateForm("showOnHome", event.target.checked)
                }
              />
              在首页展示
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button type="submit" disabled={saving} style={buttonStyle}>
              {saving ? "正在保存……" : editingId ? "保存修改" : "创建活动"}
            </button>
            <button type="button" style={secondaryButtonStyle} onClick={startNew}>
              重置表单
            </button>
          </div>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={handleImageChange}
          />
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={handleImageChange}
          />
          <input
            ref={inlineImageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={handleImageChange}
          />
        </form>
      </section>

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <h2 style={{ fontSize: 21, margin: 0 }}>已有活动</h2>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => void loadActivities()}
          >
            刷新列表
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#bba9ac" }}>正在读取活动列表……</p>
        ) : activities.length === 0 ? (
          <p style={{ color: "#bba9ac" }}>目前还没有活动，请在上方创建。</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {activities.map((activity) => (
              <article
                key={activity.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px minmax(0, 1fr)",
                  gap: 16,
                  padding: 14,
                  background: "#160c0f",
                  border: "1px solid #4a2028",
                }}
              >
                <div
                  style={{
                    aspectRatio: "16 / 10",
                    background: "#211216",
                    overflow: "hidden",
                  }}
                >
                  {activity.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activity.cover}
                      alt={activity.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        color: "#bba9ac",
                        fontSize: 12,
                      }}
                    >
                      无宣传图
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: "0 0 8px", overflowWrap: "anywhere" }}>
                    {activity.title}
                  </h3>

                  <p
                    style={{
                      margin: "0 0 12px",
                      color: "#bba9ac",
                      fontSize: 13,
                      lineHeight: 1.8,
                    }}
                  >
                    ID：{activity.id}　排序：{activity.sort}
                    <br />
                    状态：{activity.enabled ? "已上架" : "已下架"}　
                    首页：{activity.showOnHome ? "展示" : "不展示"}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => startEdit(activity)}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => void toggleField(activity, "enabled")}
                    >
                      {activity.enabled ? "下架" : "上架"}
                    </button>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => void toggleField(activity, "showOnHome")}
                    >
                      {activity.showOnHome ? "取消首页展示" : "设为首页展示"}
                    </button>
                    {activity.enabled && (
                      <a
                        href={`/activities/${activity.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...secondaryButtonStyle,
                          textDecoration: "none",
                        }}
                      >
                        查看详情
                      </a>
                    )}
                    <button
                      type="button"
                      style={{
                        ...secondaryButtonStyle,
                        borderColor: "#a52a3a",
                        color: "#ffb6bd",
                      }}
                      onClick={() => void deleteActivity(activity)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #806e72;
          pointer-events: none;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
        }
        @media (max-width: 520px) {
          article {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
