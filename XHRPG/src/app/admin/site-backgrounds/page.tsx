
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SiteBackground = {
  id: number;
  name: string;
  imageUrl: string;
  enabled: boolean;
  sort: number;
  overlayOpacity: number;
  blur: number;
};

export default function SiteBackgroundAdminPage() {
  const [items, setItems] = useState<SiteBackground[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [sort, setSort] = useState("0");
  const [overlayOpacity, setOverlayOpacity] = useState("45");
  const [blur, setBlur] = useState("0");
  const [file, setFile] = useState<File | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingSort, setEditingSort] = useState("0");
  const [editingOpacity, setEditingOpacity] = useState("45");
  const [editingBlur, setEditingBlur] = useState("0");
  const [editingEnabled, setEditingEnabled] = useState(true);

  async function loadItems() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/site-backgrounds", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "读取失败");
      }

      setItems(data.backgrounds || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function uploadImage() {
    if (!file) {
      throw new Error("请先选择背景图片");
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("kind", "siteBackground");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      throw new Error(data.error || "背景图片上传失败");
    }

    return data.url as string;
  }

  async function createBackground(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const imageUrl = await uploadImage();

      const response = await fetch("/api/admin/site-backgrounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          imageUrl,
          sort: Number(sort),
          overlayOpacity: Number(overlayOpacity),
          blur: Number(blur),
          enabled: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "保存背景失败");
      }

      setName("");
      setSort("0");
      setOverlayOpacity("45");
      setBlur("0");
      setFile(null);
      setMessage("背景已上传并保存");
      await loadItems();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: SiteBackground) {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingSort(String(item.sort));
    setEditingOpacity(String(item.overlayOpacity));
    setEditingBlur(String(item.blur));
    setEditingEnabled(item.enabled);
  }

  async function saveEdit() {
    if (editingId === null) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/site-backgrounds/${editingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingName,
            sort: Number(editingSort),
            overlayOpacity: Number(editingOpacity),
            blur: Number(editingBlur),
            enabled: editingEnabled,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "修改失败");
      }

      setEditingId(null);
      setMessage("背景设置已保存");
      await loadItems();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "修改失败");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(item: SiteBackground) {
    if (!window.confirm(`确定删除背景“${item.name}”吗？`)) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/site-backgrounds/${item.id}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "删除失败");
      }

      setMessage("背景记录已删除");
      if (editingId === item.id) setEditingId(null);
      await loadItems();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-page">
      <section className="site-background-admin">
        <div className="site-background-admin-top">
          <h1>网站背景管理</h1>
          <Link href="/admin">返回后台首页</Link>
        </div>

        <p className="site-background-admin-tip">
          上传背景后，已启用的图片会出现在网站右下角的背景选择面板中。
        </p>

        {message && (
          <p className="site-background-admin-message">{message}</p>
        )}

        <form
          className="site-background-admin-form"
          onSubmit={createBackground}
        >
          <h2>上传新背景</h2>

          <label>
            背景名称
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
            />
          </label>

          <label>
            背景图片
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
              required
            />
          </label>

          <div className="site-background-admin-grid">
            <label>
              排序
              <input
                type="number"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                required
              />
            </label>

            <label>
              默认遮罩（0–90）
              <input
                type="number"
                min="0"
                max="90"
                value={overlayOpacity}
                onChange={(event) =>
                  setOverlayOpacity(event.target.value)
                }
                required
              />
            </label>

            <label>
              默认模糊（0–20）
              <input
                type="number"
                min="0"
                max="20"
                value={blur}
                onChange={(event) => setBlur(event.target.value)}
                required
              />
            </label>
          </div>

          <button type="submit" disabled={busy}>
            {busy ? "处理中…" : "上传并保存背景"}
          </button>
        </form>

        <h2 className="site-background-list-title">已保存的背景</h2>

        {loading ? (
          <p>正在加载背景列表…</p>
        ) : items.length === 0 ? (
          <p>暂无背景，请先上传一张。</p>
        ) : (
          <div className="site-background-admin-list">
            {items.map((item) => (
              <article key={item.id} className="site-background-admin-item">
                <img src={item.imageUrl} alt={item.name} />

                <div className="site-background-admin-item-content">
                  {editingId === item.id ? (
                    <>
                      <label>
                        名称
                        <input
                          value={editingName}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                        />
                      </label>

                      <div className="site-background-admin-grid">
                        <label>
                          排序
                          <input
                            type="number"
                            value={editingSort}
                            onChange={(event) =>
                              setEditingSort(event.target.value)
                            }
                          />
                        </label>

                        <label>
                          遮罩（0–90）
                          <input
                            type="number"
                            min="0"
                            max="90"
                            value={editingOpacity}
                            onChange={(event) =>
                              setEditingOpacity(event.target.value)
                            }
                          />
                        </label>

                        <label>
                          模糊（0–20）
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={editingBlur}
                            onChange={(event) =>
                              setEditingBlur(event.target.value)
                            }
                          />
                        </label>
                      </div>

                      <label className="site-background-enabled">
                        <input
                          type="checkbox"
                          checked={editingEnabled}
                          onChange={(event) =>
                            setEditingEnabled(event.target.checked)
                          }
                        />
                        启用此背景
                      </label>

                      <div className="site-background-admin-actions">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void saveEdit()}
                        >
                          保存修改
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                        >
                          取消
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>{item.name}</h3>
                      <p>
                        排序：{item.sort}　遮罩：{item.overlayOpacity}%
                       　模糊：{item.blur}px
                      </p>
                      <p>状态：{item.enabled ? "已启用" : "已停用"}</p>

                      <div className="site-background-admin-actions">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                        >
                          编辑设置
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void deleteItem(item)}
                        >
                          删除记录
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
