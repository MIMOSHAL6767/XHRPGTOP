"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EditBanner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const router = useRouter();

  const [form, setForm] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/banner/${id}`);

      const data = await res.json();

      if (data.banner) {
        setForm(data.banner);
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

  async function save() {
    setLoading(true);

    const res = await fetch(
      `/api/admin/banner/${id}`,

      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(form),
      }
    );

    const data = await res.json();

    if (data.success) {
      alert("修改成功");

      router.push("/admin/banner");
    } else {
      alert("修改失败");
    }

    setLoading(false);
  }

  async function remove() {
    if (!confirm("确定删除这个轮播吗？")) return;

    await fetch(
      `/api/admin/banner/${id}`,

      {
        method: "DELETE",
      }
    );

    router.push("/admin/banner");
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

        <div className="form-grid">
          <label>
            标题
            <input name="title" value={form.title || ""} onChange={change} />
          </label>

          <label>
            标题颜色
            <input
              name="titleColor"
              value={form.titleColor || ""}
              onChange={change}
            />
          </label>

          <label>
            标题大小
            <input
              name="titleSize"
              value={form.titleSize || ""}
              onChange={change}
            />
          </label>

          <label>
            标题X位置(%)
            <input
              name="titleX"
              value={form.titleX || ""}
              onChange={change}
            />
          </label>

          <label>
            标题Y位置(%)
            <input
              name="titleY"
              value={form.titleY || ""}
              onChange={change}
            />
          </label>

          <label>
            简介字体大小
            <input
              name="descSize"
              value={form.descSize || ""}
              onChange={change}
            />
          </label>

          <label>
            简介颜色
            <input
              name="descColor"
              value={form.descColor || ""}
              onChange={change}
            />
          </label>

          <label>
            简介X位置(%)
            <input name="descX" value={form.descX || ""} onChange={change} />
          </label>

          <label>
            简介Y位置(%)
            <input name="descY" value={form.descY || ""} onChange={change} />
          </label>

          <label>
            背景图片
            <input
              name="background"
              value={form.background || ""}
              onChange={change}
            />
          </label>

          <label>
            封面图片
            <input
              name="cover"
              value={form.cover || ""}
              onChange={change}
            />
          </label>

          <label>
            封面宽度
            <input
              name="coverWidth"
              value={form.coverWidth || ""}
              onChange={change}
            />
          </label>

          <label>
            封面高度
            <input
              name="coverHeight"
              value={form.coverHeight || ""}
              onChange={change}
            />
          </label>

          <label>
            封面X位置(%)
            <input
              name="coverX"
              value={form.coverX || ""}
              onChange={change}
            />
          </label>

          <label>
            封面Y位置(%)
            <input
              name="coverY"
              value={form.coverY || ""}
              onChange={change}
            />
          </label>
        </div>

        <label>
          轮播简介
          <textarea
            name="description"
            value={form.description || ""}
            onChange={change}
          />
        </label>

        <label>
          启用状态
          <select
            name="enabled"
            value={form.enabled ? "true" : "false"}
            onChange={(e) => {
              setForm({
                ...form,

                enabled: e.target.value === "true",
              });
            }}
          >
            <option value="true">启用</option>

            <option value="false">关闭</option>
          </select>
        </label>

        <div className="form-buttons">
          <button disabled={loading} onClick={save}>
            保存修改
          </button>

          <button onClick={remove}>删除轮播</button>

          <button onClick={() => router.back()}>返回</button>
        </div>
      </div>
    </main>
  );
}
