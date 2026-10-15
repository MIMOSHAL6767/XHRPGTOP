"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewBanner() {
  const router = useRouter();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);

  const [preview, setPreview] = useState("");
  const [backgroundPreview, setBackgroundPreview] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    cover: "",
    background: "",
    titleSize: "40px",
    titleColor: "#ffffff",
    titleX: "50",
    titleY: "30",
    descSize: "18px",
    descColor: "#ffffff",
    descX: "50",
    descY: "50",
    coverWidth: "300px",
    coverHeight: "300px",
    coverX: "50",
    coverY: "50",
    coverFit: "contain",
    enabled: true,
  });

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // 选择封面图片
  function selectImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  // 选择背景图片
  function selectBackground(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackgroundFile(file);
    setBackgroundPreview(URL.createObjectURL(file));
  }

  // 上传图片到 GitHub 的 banner 目录
  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload/banner", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();

    if (!res.ok || !data.success || !data.url) {
      throw new Error(
        data.message || `图片上传失败（HTTP ${res.status}）`
      );
    }

    return data.url;
  }

  // 保存轮播图
  async function save() {
    if (saving) return;

    setSaving(true);

    try {
      let cover = form.cover;
      let background = form.background;

      // 上传封面图片
      if (imageFile) {
        cover = await uploadFile(imageFile);
      }

      // 上传背景图片
      if (backgroundFile) {
        background = await uploadFile(backgroundFile);
      }

      // 如果选择了图片却没有获得有效 URL，则不创建数据库记录
      if (imageFile && !cover) {
        throw new Error("封面图片上传失败，没有获取到图片地址");
      }

      if (backgroundFile && !background) {
        throw new Error("背景图片上传失败，没有获取到图片地址");
      }

      // 创建轮播图数据库记录
      const res = await fetch("/api/admin/banner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          cover,
          background,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || `轮播图保存失败（HTTP ${res.status}）`
        );
      }

      alert("轮播图添加成功");
      router.push("/admin/banner");
      router.refresh();
    } catch (e) {
      console.error("保存轮播图失败：", e);

      alert(
        e instanceof Error
          ? e.message
          : "保存失败，请检查网络或服务器日志"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-box game-form">
        <h1>添加首页轮播图</h1>

        <div className="form-grid">
          <label>
            标题
            <input
              name="title"
              value={form.title}
              onChange={change}
            />
          </label>

          <label>
            背景图片上传
            <input
              type="file"
              accept="image/*"
              onChange={selectBackground}
            />

            {backgroundPreview && (
              <img
                src={backgroundPreview}
                alt="背景图片预览"
                style={{
                  width: "400px",
                  height: "220px",
                  objectFit: "cover",
                  marginTop: "10px",
                }}
              />
            )}
          </label>

          <label>
            角色/封面图片上传
            <input
              type="file"
              accept="image/*"
              onChange={selectImage}
            />

            {preview && (
              <img
                src={preview}
                alt="封面图片预览"
                style={{
                  width: "300px",
                  height: "300px",
                  objectFit: "contain",
                  marginTop: "10px",
                }}
              />
            )}
          </label>

          <label>
            标题字体大小
            <input
              name="titleSize"
              value={form.titleSize}
              onChange={change}
            />
          </label>

          <label>
            标题颜色
            <input
              name="titleColor"
              value={form.titleColor}
              onChange={change}
            />
          </label>

          <label>
            标题 X 位置 %
            <input
              name="titleX"
              value={form.titleX}
              onChange={change}
            />
          </label>

          <label>
            标题 Y 位置 %
            <input
              name="titleY"
              value={form.titleY}
              onChange={change}
            />
          </label>

          <label>
            简介
            <textarea
              name="description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </label>

          <label>
            简介字体大小
            <input
              name="descSize"
              value={form.descSize}
              onChange={change}
            />
          </label>

          <label>
            简介颜色
            <input
              name="descColor"
              value={form.descColor}
              onChange={change}
            />
          </label>

          <label>
            简介 X 位置 %
            <input
              name="descX"
              value={form.descX}
              onChange={change}
            />
          </label>

          <label>
            简介 Y 位置 %
            <input
              name="descY"
              value={form.descY}
              onChange={change}
            />
          </label>

          <label>
            封面宽度
            <input
              name="coverWidth"
              value={form.coverWidth}
              onChange={change}
            />
          </label>

          <label>
            封面高度
            <input
              name="coverHeight"
              value={form.coverHeight}
              onChange={change}
            />
          </label>

          <label>
            封面 X 位置 %
            <input
              name="coverX"
              value={form.coverX}
              onChange={change}
            />
          </label>

          <label>
            封面 Y 位置 %
            <input
              name="coverY"
              value={form.coverY}
              onChange={change}
            />
          </label>

          <label>
            封面适配
            <input
              name="coverFit"
              value={form.coverFit}
              onChange={change}
            />
          </label>
        </div>

        <div className="form-buttons">
          <button
            type="button"
            onClick={save}
            disabled={saving}
          >
            {saving ? "正在上传并保存..." : "保存轮播图"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => router.back()}
          >
            返回
          </button>
        </div>
      </div>
    </main>
  );
}
