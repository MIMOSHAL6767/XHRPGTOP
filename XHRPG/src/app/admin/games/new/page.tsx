"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGame() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
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
  });

  const [history, setHistory] = useState<any[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  // 释放本地图片预览的 URL，避免重复选择图片时泄漏资源
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function change(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function selectCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("只支持 PNG、JPG、WebP 图片");
      e.target.value = "";
      return;
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      alert("图片不能为空，且不能超过 5 MB");
      e.target.value = "";
      return;
    }

    setCoverFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function addHistory() {
    setHistory((prev) => [
      ...prev,
      {
        version: "",
        date: "",
        lanzou: "",
        pan123: "",
      },
    ]);
  }

  function changeHistory(
    index: number,
    key: string,
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

  async function readResponse(res: Response) {
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      throw new Error(
        data?.message || `请求失败，HTTP ${res.status}`
      );
    }

    return data;
  }

  async function uploadCover(id: number): Promise<string> {
    if (!coverFile) return "";

    const fd = new FormData();
    fd.append("file", coverFile);
    fd.append("id", String(id));

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const data = await readResponse(res);

    if (
      typeof data.url !== "string" ||
      !data.url.startsWith("https://raw.githubusercontent.com/")
    ) {
      throw new Error("上传接口没有返回有效的 GitHub Raw 图片地址");
    }

    return data.url;
  }

  async function submit() {
    if (loading) return;

    if (!form.name.trim()) {
      alert("请填写游戏名称");
      return;
    }

    setLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];

      // 第一步：创建游戏记录
      const createResponse = await fetch("/api/admin/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
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

      // 第二步：有选择封面才上传
      if (coverFile) {
        const coverUrl = await uploadCover(id);

        // 第三步：保存 GitHub 图片 URL 到数据库
        const updateResponse = await fetch(
          `/api/admin/games/${id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cover: coverUrl,
            }),
          }
        );

        await readResponse(updateResponse);
      }

      alert(
        coverFile
          ? "游戏发布成功，封面上传并保存成功"
          : "游戏发布成功（未选择封面）"
      );

      router.push("/admin/games");
      router.refresh();
    } catch (error) {
      console.error("发布游戏失败:", error);

      alert(
        error instanceof Error
          ? error.message
          : "保存失败，请检查网络和服务器日志"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-box game-form">
        <h1>添加游戏</h1>

        <div className="form-grid">
          <label>
            游戏名称
            <input
              name="name"
              value={form.name}
              onChange={change}
            />
          </label>

          <label>
            英文名称
            <input
              name="en"
              value={form.en}
              onChange={change}
            />
          </label>

          <label>
            作者
            <input
              name="author"
              value={form.author}
              onChange={change}
            />
          </label>

          <label>
            版本
            <input
              name="version"
              value={form.version}
              onChange={change}
            />
          </label>

          <label>
            分类
            <input
              name="category"
              value={form.category}
              onChange={change}
            />
          </label>

          <label>
            游戏封面
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectCover}
            />

            {preview && (
              <img
                src={preview}
                alt="封面预览"
                style={{
                  width: "180px",
                  marginTop: "10px",
                }}
              )}
          </label>

          <label>
            蓝奏云链接
            <input
              name="lanzou"
              value={form.lanzou}
              onChange={change}
            />
          </label>

          <label>
            123 云盘链接
            <input
              name="pan123"
              value={form.pan123}
              onChange={change}
            />
          </label>
        </div>

        <label>
