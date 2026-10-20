"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BannerFormData = {
  id?: number;
  title?: string | null;
  titleColor?: string | null;
  titleSize?: string | null;
  titleX?: number | string | null;
  titleY?: number | string | null;
  descSize?: string | null;
  descColor?: string | null;
  descX?: number | string | null;
  descY?: number | string | null;
  background?: string | null;
  cover?: string | null;
  coverWidth?: string | null;
  coverHeight?: string | null;
  coverX?: number | string | null;
  coverY?: number | string | null;
  description?: string | null;
  enabled?: boolean;
  [key: string]: unknown;
};

export default function EditBannerForm({ id }: { id: string }) {
  const router = useRouter();

  const [form, setForm] = useState<BannerFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/admin/banner/${encodeURIComponent(id)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "加载轮播图失败");
        }

        if (!data.banner) {
          throw new Error("没有找到这个轮播图");
        }

        if (!cancelled) {
          setForm(data.banner);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载失败，请稍后重试");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function change(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) =>
      prev
        ? {
            ...prev,
            [name]: value,
          }
        : prev
    );
  }

  async function save() {
    if (!form || loading || deleting) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/admin/banner/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "修改失败");
      }

      alert("修改成功");
      router.push("/admin/banner");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "修改失败，请稍后重试";
      setError(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!form || loading || deleting) return;
    if (!confirm("确定删除这个轮播吗？此操作无法撤销。")) return;

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(
        `/api/admin/banner/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "删除失败");
      }

      alert("删除成功");
      router.push("/admin/banner");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "删除失败，请稍后重试";
      setError(message);
      alert(message);
    } finally {
      setDeleting(false);
    }
  }

  if (error && !form) {
    return (
      <main className="admin-page">
        <div className="admin-box">
          <h1>无法加载轮播图</h1>
          <p>{error}</p>
          <button type="button" onClick={() => router.back()}>
            返回
          </button>
        </div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="admin-page">
        <div className="admin-box">
          <h1>加载中...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-box game-form">
        <h1>编辑首页轮播</h1>

        {error && <p role="alert">{error}</p>}

        <div className="form-grid">
          <label>
            标题
            <input name="title" value={form.title ?? ""} onChange={change} />
          </label>

          <label>
            标题颜色
            <input
              name="titleColor"
              value={form.titleColor ?? ""}
              onChange={change}
            />
          </label>

          <label>
            标题大小
            <input
              name="titleSize"
              value={form.titleSize ?? ""}
              onChange={change}
            />
          </label>

          <label>
            标题 X 位置 (%)
            <input
              name="titleX"
              value={String(form.titleX ?? "")}
              onChange={change}
            />
          </label>

          <label>
            标题 Y 位置 (%)
            <input
              name="titleY"
              value={String(form.titleY ?? "")}
              onChange={change}
            />
          </label>

          <label>
            简介字体大小
            <input
              name="descSize"
              value={form.descSize ?? ""}
              onChange={change}
            />
          </label>

          <label>
            简介颜色
            <input
              name="descColor"
              value={form.descColor ?? ""}
              onChange={change}
            />
          </label>

          <label>
            简介 X 位置 (%)
            <input
              name="descX"
              value={String(form.descX ?? "")}
              onChange={change}
            />
          </label>

          <label>
            简介 Y 位置 (%)
            <input
              name="descY"
              value={String(form.descY ?? "")}
              onChange={change}
            />
          </label>

          <label>
            背景图片 URL
            <input
              name="background"
              value={form.background ?? ""}
              onChange={change}
            />
          </label>

          <label>
            封面图片 URL
            <input
              name="cover"
              value={form.cover ?? ""}
              onChange={change}
            />
          </label>

          <label>
            封面宽度
            <input
              name="coverWidth"
              value={form.coverWidth ?? ""}
              onChange={change}
            />
          </label>

          <label>
            封面高度
            <input
              name="coverHeight"
              value={form.coverHeight ?? ""}
              onChange={change}
            />
          </label>

          <label>
            封面 X 位置 (%)
            <input
              name="coverX"
              value={String(form.coverX ?? "")}
              onChange={change}
            />
          </label>

          <label>
            封面 Y 位置 (%)
            <input
              name="coverY"
              value={String(form.coverY ?? "")}
              onChange={change}
            />
          </label>
        </div>

        <label>
          轮播简介
          <textarea
            name="description"
            value={form.description ?? ""}
            onChange={change}
          />
        </label>

        <label>
          启用状态
          <select
            name="enabled"
            value={form.enabled ? "true" : "false"}
            onChange={(e) => {
              setForm((prev) =>
                prev
                  ? {
                      ...prev,
                      enabled: e.target.value === "true",
                    }
                  : prev
              );
            }}
          >
            <option value="true">启用</option>
            <option value="false">关闭</option>
          </select>
        </label>

        <div className="form-buttons">
          <button
            type="button"
            disabled={loading || deleting}
            onClick={save}
          >
            {loading ? "正在保存..." : "保存修改"}
          </button>

          <button
            type="button"
            disabled={loading || deleting}
            onClick={remove}
          >
            {deleting ? "正在删除..." : "删除轮播"}
          </button>

          <button
            type="button"
            disabled={loading || deleting}
            onClick={() => router.back()}
          >
            返回
          </button>
        </div>
      </div>
    </main>
  );
}
