"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TitleItem = {
  id: number;
  name: string;
  color: string;
  background: string;
  border: string;
  shadow: string;
  size: number;
};

type ApiResult = {
  success?: boolean;
  message?: string;
  titles?: TitleItem[];
};

async function readResponse(res: Response): Promise<ApiResult> {
  try {
    return (await res.json()) as ApiResult;
  } catch {
    return {
      success: false,
      message: `服务器返回了无法识别的响应（HTTP ${res.status}）`,
    };
  }
}

export default function TitleAdminForm() {
  const router = useRouter();

  const [titles, setTitles] = useState<TitleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [granting, setGranting] = useState(false);

  // 创建称号
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [background, setBackground] = useState("#333333");
  const [border, setBorder] = useState("none");
  const [shadow, setShadow] = useState("");
  const [size, setSize] = useState(14);

  // 授予称号
  const [userId, setUserId] = useState("");
  const [titleId, setTitleId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/users/title/list", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await readResponse(res);

      if (!res.ok || !data.success || !Array.isArray(data.titles)) {
        throw new Error(data.message || "获取称号列表失败");
      }

      setTitles(data.titles);
    } catch (error) {
      console.error("加载称号列表失败:", error);
      alert(
        error instanceof Error
          ? error.message
          : "加载称号列表失败，请稍后重试"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 创建称号
  async function createTitle() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("请输入称号名称");
      return;
    }

    if (trimmedName.length > 30) {
      alert("称号名称不能超过 30 个字符");
      return;
    }

    if (!Number.isInteger(size) || size < 8 || size > 72) {
      alert("字号必须是 8 到 72 之间的整数");
      return;
    }

    if (creating) return;

    setCreating(true);

    try {
      const res = await fetch("/api/admin/users/title/create", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          color,
          background,
          border: border.trim() || "none",
          shadow: shadow.trim(),
          size,
        }),
      });

      const data = await readResponse(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "创建称号失败");
      }

      alert("创建成功");
      setName("");
      await load();
    } catch (error) {
      console.error("创建称号失败:", error);
      alert(
        error instanceof Error
          ? error.message
          : "创建失败，请稍后重试"
      );
    } finally {
      setCreating(false);
    }
  }

  // 删除称号
  async function deleteTitle(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      alert("称号 ID 无效");
      return;
    }

    if (!window.confirm("确定删除该称号？请确认不会影响已有用户数据。")) {
      return;
    }

    if (deletingId !== null) return;

    setDeletingId(id);

    try {
      const res = await fetch(
        `/api/admin/users/title/delete?id=${encodeURIComponent(String(id))}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      const data = await readResponse(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "删除称号失败");
      }

      alert("删除成功");

      if (titleId === String(id)) {
        setTitleId("");
      }

      await load();
    } catch (error) {
      console.error("删除称号失败:", error);
      alert(
        error instanceof Error
          ? error.message
          : "删除失败，请稍后重试"
      );
    } finally {
      setDeletingId(null);
    }
  }

  // 授予用户称号
  async function grant() {
    const uid = userId.trim();
    const tid = titleId.trim();

    if (!uid || !tid) {
      alert("请输入用户 UID 并选择称号");
      return;
    }

    if (!/^[1-9]\d*$/.test(uid) || !/^[1-9]\d*$/.test(tid)) {
      alert("用户 UID 和称号 ID 必须是正整数");
      return;
    }

    const parsedUserId = Number(uid);
    const parsedTitleId = Number(tid);

    if (
      !Number.isSafeInteger(parsedUserId) ||
      !Number.isSafeInteger(parsedTitleId)
    ) {
      alert("用户 UID 或称号 ID 超出有效范围");
      return;
    }

    if (granting) return;

    setGranting(true);

    try {
      const res = await fetch("/api/admin/users/title/grant", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: parsedUserId,
          titleId: parsedTitleId,
        }),
      });

      const data = await readResponse(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "授予称号失败");
      }

      alert("授予成功");
      setUserId("");
    } catch (error) {
      console.error("授予称号失败:", error);
      alert(
        error instanceof Error
          ? error.message
          : "授予失败，请稍后重试"
      );
    } finally {
      setGranting(false);
    }
  }

  return (
    <main className="admin-page">
      <div
        className="admin-box"
        style={{
          width: "1200px",
          maxWidth: "95%",
        }}
      >
        <button type="button" onClick={() => router.push("/admin")}>
          ← 返回后台
        </button>

        <h1>用户称号管理</h1>

        <hr />

        <h2>创建称号</h2>

        <div
          style={{
            display: "grid",
            gap: "10px",
            maxWidth: "500px",
          }}
        >
          <label htmlFor="title-name">称号名称</label>
          <input
            id="title-name"
            placeholder="请输入称号名称"
            value={name}
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
          />

          <label htmlFor="title-color">文字颜色</label>
          <input
            id="title-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />

          <label htmlFor="title-background">背景颜色</label>
          <input
            id="title-background"
            type="color"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          />

          <label htmlFor="title-border">边框</label>
          <input
            id="title-border"
            placeholder="例如 1px solid gold"
            value={border}
            maxLength={100}
            onChange={(e) => setBorder(e.target.value)}
          />

          <label htmlFor="title-shadow">阴影</label>
          <input
            id="title-shadow"
            placeholder="例如 0 0 10px red"
            value={shadow}
            maxLength={100}
            onChange={(e) => setShadow(e.target.value)}
          />

          <label htmlFor="title-size">字号（8–72）</label>
          <input
            id="title-size"
            type="number"
            min={8}
            max={72}
            step={1}
            value={size}
            onChange={(e) => {
              const value = e.target.value;
              setSize(value === "" ? 0 : Number(value));
            }}
          />
        </div>

        <h3>预览</h3>

        <span
          style={{
            display: "inline-block",
            padding: "6px 18px",
            borderRadius: "20px",
            background,
            color,
            border,
            boxShadow: shadow || "none",
            fontSize: Number.isFinite(size) ? `${size}px` : "14px",
            fontWeight: "bold",
          }}
        >
          {name.trim() || "示例称号"}
        </span>

        <br />
        <br />

        <button
          type="button"
          onClick={createTitle}
          disabled={creating}
        >
          {creating ? "创建中..." : "创建称号"}
        </button>

        <hr />

        <h2>称号列表</h2>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "加载中..." : "刷新列表"}
        </button>

        {loading && titles.length === 0 ? (
          <p>正在加载称号列表...</p>
        ) : titles.length === 0 ? (
          <p>暂无称号</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th>ID</th>
                  <th>名称</th>
                  <th>预览</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {titles.map((title) => (
                  <tr key={title.id}>
                    <td>{title.id}</td>
                    <td>{title.name}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "5px 15px",
                          borderRadius: "20px",
                          background: title.background,
                          color: title.color,
                          border: title.border,
                          boxShadow: title.shadow || "none",
                          fontSize: `${title.size}px`,
                        }}
                      >
                        {title.name}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void deleteTitle(title.id)}
                        disabled={deletingId !== null}
                      >
                        {deletingId === title.id ? "删除中..." : "删除"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <hr />

        <h2>授予用户</h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <input
            type="number"
            min={1}
            step={1}
            placeholder="用户 UID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />

          <select
            value={titleId}
            onChange={(e) => setTitleId(e.target.value)}
          >
            <option value="">选择称号</option>

            {titles.map((title) => (
              <option key={title.id} value={title.id}>
                {title.id} - {title.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={grant}
            disabled={granting}
          >
            {granting ? "授予中..." : "授予"}
          </button>
        </div>

        <p>授予后不会自动显示，用户需要在个人设置中自行开启佩戴。</p>
      </div>
    </main>
  );
}
