
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
            首页头图设置
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
      </div>
    </main>
  );
}
