
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const MAX_SIZE = 5 * 1024 * 1024;

export default function AdminHeaderPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [featuredIds, setFeaturedIds] = useState<number[]>([]);
  const [games, setGames] = useState<
    { id: number; name: string }[]
  >([]);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadHeader() {
      try {
        const response = await fetch("/api/admin/header", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "读取头图失败");
        }

        if (active) {
          setImageUrl(data.imageUrl ?? null);
          setPreview(data.imageUrl ?? "");
          setAnnouncement(data.announcement ?? "");
          setFeaturedIds(
            Array.isArray(data.featuredGameIds)
              ? data.featuredGameIds.map(Number)
              : []
          );
        }
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error ? error.message : "读取头图失败"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHeader();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadGames() {
      try {
        const response = await fetch("/api/admin/games", {
          cache: "no-store",
        });
        const data = await response.json();

        if (
          active &&
          response.ok &&
          data.success &&
          Array.isArray(data.games)
        ) {
          setGames(
            data.games.map((game: { id: number; name: string }) => ({
              id: game.id,
              name: game.name,
            }))
          );
        }
      } catch {
        // 游戏列表读取失败时仍可单独编辑公告。
      }
    }

    void loadGames();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function chooseFile(selected: File | undefined) {
    setMessage("");

    if (!selected) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(selected.type)) {
      setMessage("只支持 PNG、JPG 和 WebP 图片");
      return;
    }

    if (selected.size > MAX_SIZE) {
      setMessage("图片不能超过 5 MB");
      return;
    }

    setFile(selected);
  }

  async function saveHeader() {
    if (!file) {
      setMessage("请先选择要上传的图片");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "homeHeader");

      // 先上传到 GitHub 图片仓库
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.success || !uploadData.url) {
        throw new Error(uploadData.message || "图片上传失败");
      }

      // 再将图片地址保存到数据库
      const saveResponse = await fetch("/api/admin/header", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: uploadData.url,
        }),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok || !saveData.success) {
        throw new Error(saveData.message || "头图地址保存失败");
      }

      setImageUrl(saveData.imageUrl);
      setPreview(saveData.imageUrl);
      setFile(null);
      setMessage("首页头图保存成功");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "保存失败，请稍后重试"
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeHeader() {
    if (!window.confirm("确定移除首页头图吗？")) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/header", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: null }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "移除失败");
      }

      setImageUrl(null);
      setPreview("");
      setFile(null);
      setMessage("首页头图已移除");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "移除失败"
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleFeatured(id: number) {
    setFeaturedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 12) {
        setMessage("精选游戏最多选择 12 个");
        return current;
      }

      return [...current, id];
    });
  }

  async function saveHomeSettings() {
    setSavingSettings(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/header", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcement,
          featuredGameIds: featuredIds,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "保存失败");
      }

      setMessage("公告与精选游戏已保存");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "保存失败"
      );
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#10090b",
        color: "#f8eeee",
        padding: "32px 20px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <h1 style={{ fontSize: 26, margin: 0 }}>
            首页设置
          </h1>

          <Link
            href="/admin"
            style={{
              color: "#f8eeee",
              border: "1px solid #4a2028",
              padding: "10px 16px",
              textDecoration: "none",
            }}
          >
            返回管理后台
          </Link>
        </div>

        <section
          style={{
            background: "#160c0f",
            border: "1px solid #4a2028",
            padding: 24,
          }}
        >
          <p style={{ color: "#cbb8bc", marginTop: 0 }}>
            设置首页顶部的固定头图。该图片独立于首页 Banner 轮播，
            点击头图将返回首页。支持 PNG、JPG、WebP，最大 5 MB。
          </p>

          <h2 style={{ fontSize: 18, marginTop: 28 }}>
            当前头图预览
          </h2>

          <div
            style={{
              width: "100%",
              minHeight: 160,
              background: "#10090b",
              border: "1px solid #4a2028",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {loading ? (
              <p>正在读取头图……</p>
            ) : preview ? (
              <img
                src={preview}
                alt="首页头图预览"
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  maxHeight: 320,
                  objectFit: "contain",
                }}
              />
            ) : (
              <p style={{ color: "#9c858a" }}>
                暂未设置首页头图
              </p>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <label
              htmlFor="header-file"
              style={{ display: "block", marginBottom: 10 }}
            >
              选择新的头图
            </label>

            <input
              id="header-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={saving}
              onChange={(event) => {
                chooseFile(event.target.files?.[0]);
                event.target.value = "";
              }}
              style={{
                display: "block",
                width: "100%",
                color: "#f8eeee",
                padding: "12px 0",
              }}
            />

            {file && (
              <p style={{ color: "#cbb8bc", fontSize: 13 }}>
                已选择：{file.name}（
                {(file.size / 1024 / 1024).toFixed(2)} MB）
              </p>
            )}
          </div>

          {message && (
            <p
              role="status"
              style={{
                padding: 12,
                marginTop: 18,
                background: "#10090b",
                borderLeft: "3px solid #8b1e2d",
                overflowWrap: "anywhere",
              }}
            >
              {message}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 24,
            }}
          >
            <button
              type="button"
              disabled={saving || loading || !file}
              onClick={saveHeader}
              style={{
                padding: "12px 22px",
                background: saving || !file ? "#4a2028" : "#8b1e2d",
                color: "#fff",
                border: "none",
                cursor: saving || !file ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "正在保存……" : "上传并保存头图"}
            </button>

            <button
              type="button"
              disabled={saving || loading || !imageUrl}
              onClick={removeHeader}
              style={{
                padding: "12px 22px",
                background: "transparent",
                color: "#f8eeee",
                border: "1px solid #8b1e2d",
                cursor: saving || !imageUrl ? "not-allowed" : "pointer",
              }}
            >
              移除首页头图
            </button>
          </div>
        </section>

        <section
          style={{
            marginTop: 24,
            background: "#160c0f",
            border: "1px solid #4a2028",
            padding: 24,
          }}
        >
          <h2 style={{ fontSize: 18, marginTop: 0 }}>
            首页公告与精选游戏
          </h2>

          <label
            htmlFor="announcement"
            style={{ display: "block", marginBottom: 8 }}
          >
            公告（纯文本）
          </label>

          <textarea
            id="announcement"
            value={announcement}
            onChange={(event) =>
              setAnnouncement(event.target.value)
            }
            rows={8}
            placeholder="输入首页公告内容，仅支持纯文本"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              background: "#10090b",
              color: "#f8eeee",
              border: "1px solid #4a2028",
              font: "inherit",
              lineHeight: 1.7,
              resize: "vertical",
            }}
          />

          <h3 style={{ fontSize: 16, marginTop: 24 }}>
            精选游戏（最多 12 个，已选 {featuredIds.length} 个）
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(210px, 1fr))",
              gap: 8,
              maxHeight: 320,
              overflowY: "auto",
              padding: 4,
              border: "1px solid #2e1a1f",
            }}
          >
            {games.length > 0 ? (
              games.map((game) => {
                const active = featuredIds.includes(game.id);

                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => toggleFeatured(game.id)}
                    style={{
                      padding: "9px 12px",
                      textAlign: "left",
                      color: active ? "#fff" : "#cbb8bc",
                      background: active
                        ? "#8b1e2d"
                        : "transparent",
                      border: "1px solid #4a2028",
                      cursor: "pointer",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {active ? "✓ " : ""}
                    {game.name}
                  </button>
                );
              })
            ) : (
              <p style={{ color: "#9c858a", margin: 8 }}>
                正在读取游戏列表……
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={savingSettings}
            onClick={saveHomeSettings}
            style={{
              marginTop: 20,
              padding: "12px 22px",
              background: savingSettings ? "#4a2028" : "#8b1e2d",
              color: "#fff",
              border: "none",
              cursor: savingSettings ? "not-allowed" : "pointer",
            }}
          >
            {savingSettings ? "正在保存……" : "保存公告与精选"}
          </button>
        </section>
      </div>
    </main>
  );
}
