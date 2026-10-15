"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EditGameClient({
  id,
}: {
  id: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  // 获取游戏
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/games/${id}`);
        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "获取游戏失败，请确认已登录站长账号");
          return;
        }

        if (data.game) {
          setForm(data.game);
          setHistory(data.game.history || []);
          setPreview(data.game.cover || "");
        } else {
          alert(data.message || "没有找到这个游戏");
        }
      } catch (e) {
        console.error("获取游戏失败:", e);
        alert("获取游戏失败，请检查网络连接");
      }
    }

    load();
  }, [id]);

  function change(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function selectCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("只支持 PNG、JPG、WebP 图片");
      e.target.value = "";
      return;
    }

    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      alert("图片不能为空，且不能超过 5 MB");
      e.target.value = "";
      return;
    }

    setCoverFile(file);

    setPreview(URL.createObjectURL(file));
  }

  function changeHistory(index: number, key: string, value: string) {
    const list = [...history];

    list[index][key] = value;

    setHistory(list);
  }

  function addHistory() {
    setHistory([
      ...history,
      {
        version: "",
        date: "",
        lanzou: "",
        pan123: "",
      },
    ]);
  }

  function removeHistory(index: number) {
    setHistory(history.filter((_, i) => i !== index));
  }

  async function uploadCover(): Promise<string> {
    if (!coverFile) return form.cover || "";

    const fd = new FormData();

    fd.append("file", coverFile);
    fd.append("id", id);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      throw new Error(
        data?.message || `封面上传失败（HTTP ${res.status}）`
      );
    }

    if (
      typeof data.url !== "string" ||
      !data.url.startsWith("https://raw.githubusercontent.com/")
    ) {
      throw new Error("上传接口没有返回有效的 GitHub Raw 图片地址");
    }

    return data.url;
  }

  async function save() {
    if (!form || loading) return;

    setLoading(true);

    try {
      let cover = form.cover;

      if (coverFile) {
        cover = await uploadCover();
      }

      const res = await fetch(`/api/admin/games/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          cover,
          history,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "修改失败");
      }

      alert("修改成功");

      router.push("/admin/games");
    } catch (e) {
      console.error("保存游戏或上传封面失败:", e);

      alert(
        e instanceof Error
          ? e.message
          : "保存失败，请检查网络和服务器日志"
      );
    } finally {
      setLoading(false);
    }
  }

  // 隐藏 / 显示
  async function toggleStatus() {
    if (!form || loading) return;

    const newStatus = form.status === "隐藏" ? "已发布" : "隐藏";

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "修改游戏状态失败");
      }

      setForm({
        ...form,
        status: newStatus,
      });

      alert(newStatus === "隐藏" ? "游戏已隐藏" : "游戏已显示");
    } catch (e) {
      console.error("修改游戏状态失败:", e);

      alert(
        e instanceof Error ? e.message : "修改游戏状态失败"
      );
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm("确定永久删除这个游戏吗？")) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "删除失败");
      }

      alert("删除成功");

      router.push("/admin/games");
    } catch (e) {
      console.error("删除游戏失败:", e);

      alert(e instanceof Error ? e.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  if (!form) {
    return (
      <main className="admin-page">
        <div className="admin-box">
          <h1>加载游戏中...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-box game-form">
        <h1>编辑游戏</h1>

        <p>
          当前状态：
          <strong>{form.status}</strong>
        </p>

        <div className="form-grid">
          <label>
            游戏名称
            <input
              name="name"
              value={form.name || ""}
              onChange={change}
            />
          </label>

          <label>
            英文名称
            <input
              name="en"
              value={form.en || ""}
              onChange={change}
            />
          </label>

          <label>
            作者
            <input
              name="author"
              value={form.author || ""}
              onChange={change}
            />
          </label>

          <label>
            版本
            <input
              name="version"
              value={form.version || ""}
              onChange={change}
            />
          </label>

          <label>
            分类
            <input
              name="category"
              value={form.category || ""}
              onChange={change}
            />
          </label>

          <label>
            重新上传封面
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectCover}
            />

            {preview && (
              <img
                src={preview}
                alt="游戏封面预览"
                style={{
                  width: "180px",
                  marginTop: "10px",
                }}
              />
            )}
          </label>

          <label>
            蓝奏云
            <input
              name="lanzou"
              value={form.lanzou || ""}
              onChange={change}
            />
          </label>

          <label>
            123云盘
            <input
              name="pan123"
              value={form.pan123 || ""}
              onChange={change}
            />
          </label>
        </div>

        <label>
          游戏简介
          <textarea
            name="description"
            value={form.description || ""}
            onChange={change}
          />
        </label>

        <h2>历史版本</h2>

        {history.map((item, index) => (
          <div className="history-item" key={index}>
            <input
              placeholder="版本"
              value={item.version || ""}
              onChange={(e) =>
                changeHistory(index, "version", e.target.value)
              }
            />

            <input
              placeholder="日期"
              value={item.date || ""}
              onChange={(e) =>
                changeHistory(index, "date", e.target.value)
              }
            />

            <input
              placeholder="蓝奏云"
              value={item.lanzou || ""}
              onChange={(e) =>
                changeHistory(index, "lanzou", e.target.value)
              }
            />

            <input
              placeholder="123云盘"
              value={item.pan123 || ""}
              onChange={(e) =>
                changeHistory(index, "pan123", e.target.value)
              }
            />

            <button
              type="button"
              onClick={() => removeHistory(index)}
            >
              删除
            </button>
          </div>
        ))}

        <button type="button" onClick={addHistory}>
          ＋ 添加历史版本
        </button>

        <div className="form-buttons">
          <button onClick={save} disabled={loading}>
            {loading ? "处理中..." : "保存修改"}
          </button>

          <button onClick={toggleStatus} disabled={loading}>
            {form.status === "隐藏" ? "显示游戏" : "隐藏游戏"}
          </button>

          <button onClick={remove} disabled={loading}>
            永久删除
          </button>

          <button
            onClick={() => router.back()}
            disabled={loading}
          >
            返回
          </button>
        </div>
      </div>
    </main>
  );
}
