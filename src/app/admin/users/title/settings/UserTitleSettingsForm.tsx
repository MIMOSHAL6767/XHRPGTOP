"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Title = {
  id: number;
  name: string;
  color: string;
  background: string;
  border: string;
  shadow: string;
  size: number;
};

type UserTitle = {
  id: number;
  title: Title;
};

type UserInfo = {
  id: number;
  username: string;
  nickname?: string | null;
  userTitles?: UserTitle[];
};

type ApiResult = {
  success?: boolean;
  message?: string;
  user?: UserInfo;
  titles?: Title[];
};

async function readResponse(res: Response): Promise<ApiResult> {
  try {
    return (await res.json()) as ApiResult;
  } catch {
    return {
      success: false,
      message: `服务器响应异常（HTTP ${res.status}）`,
    };
  }
}

function UserTitleSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");

  const [user, setUser] = useState<UserInfo | null>(null);
  const [titles, setTitles] = useState<UserTitle[]>([]);
  const [allTitles, setAllTitles] = useState<Title[]>([]);
  const [selectTitle, setSelectTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const validUid =
    uid !== null && /^[1-9]\d*$/.test(uid) && Number.isSafeInteger(Number(uid));

  // 加载用户信息和已拥有的称号
  const load = useCallback(async () => {
    if (!validUid || !uid) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/admin/users/title/settings?uid=${encodeURIComponent(uid)}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      const data = await readResponse(res);

      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.message || "加载用户称号失败");
      }

      setUser(data.user);
      setTitles(data.user.userTitles || []);
    } catch (error) {
      console.error("加载用户称号失败:", error);
      alert(
        error instanceof Error ? error.message : "加载用户称号失败，请稍后重试"
      );
    } finally {
      setLoading(false);
    }
  }, [uid, validUid]);

  // 加载全部可用称号
  const loadTitles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users/title/list", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await readResponse(res);

      if (!res.ok || !data.success || !Array.isArray(data.titles)) {
        throw new Error(data.message || "加载称号列表失败");
      }

      setAllTitles(data.titles);
    } catch (error) {
      console.error("加载称号列表失败:", error);
      alert(
        error instanceof Error ? error.message : "加载称号列表失败"
      );
    }
  }, []);

  useEffect(() => {
    if (!validUid) return;

    void load();
    void loadTitles();
  }, [validUid, load, loadTitles]);

  // 授予称号
  async function grant() {
    if (!validUid || !uid) {
      alert("用户 UID 无效");
      return;
    }

    if (!selectTitle || !/^[1-9]\d*$/.test(selectTitle)) {
      alert("请选择有效称号");
      return;
    }

    const userId = Number(uid);
    const titleId = Number(selectTitle);

    if (
      !Number.isSafeInteger(userId) ||
      !Number.isSafeInteger(titleId)
    ) {
      alert("用户 UID 或称号 ID 无效");
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
        body: JSON.stringify({ userId, titleId }),
      });

      const data = await readResponse(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "授予称号失败");
      }

      alert("授予成功");
      setSelectTitle("");
      await load();
    } catch (error) {
      console.error("授予称号失败:", error);
      alert(error instanceof Error ? error.message : "授予称号失败");
    } finally {
      setGranting(false);
    }
  }

  // 收回称号
  async function revoke(titleId: number) {
    if (!validUid || !uid) {
      alert("用户 UID 无效");
      return;
    }

    if (!Number.isSafeInteger(titleId) || titleId <= 0) {
      alert("称号 ID 无效");
      return;
    }

    if (!window.confirm("确定收回这个称号？")) return;
    if (revokingId !== null) return;

    setRevokingId(titleId);

    try {
      const params = new URLSearchParams({
        userId: uid,
        titleId: String(titleId),
      });

      const res = await fetch(`/api/admin/users/title?${params.toString()}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      const data = await readResponse(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "收回称号失败");
      }

      alert("收回成功");
      await load();
    } catch (error) {
      console.error("收回称号失败:", error);
      alert(error instanceof Error ? error.message : "收回称号失败");
    } finally {
      setRevokingId(null);
    }
  }

  if (!uid) {
    return <main className="admin-page">未指定用户 UID</main>;
  }

  if (!validUid) {
    return <main className="admin-page">用户 UID 格式无效</main>;
  }

  return (
    <main className="admin-page">
      <div
        className="admin-box"
        style={{
          width: "1000px",
          maxWidth: "95%",
        }}
      >
        <button type="button" onClick={() => router.back()}>
          ← 返回
        </button>

        <h1>用户称号管理</h1>

        {user && (
          <>
            <h2>用户信息</h2>
            <div>
              UID：{user.id}
              <br />
              用户名：{user.username}
              <br />
              昵称：{user.nickname || "-"}
            </div>
          </>
        )}

        <hr />

        <h2>已有称号</h2>

        {loading ? (
          <p>加载中...</p>
        ) : titles.length === 0 ? (
          <p>暂无拥有称号</p>
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
                  <th>称号</th>
                  <th>预览</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {titles.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title.id}</td>
                    <td>{item.title.name}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "5px 15px",
                          borderRadius: "20px",
                          background: item.title.background,
                          color: item.title.color,
                          border: item.title.border,
                          boxShadow: item.title.shadow || "none",
                          fontSize: `${item.title.size}px`,
                        }}
                      >
                        {item.title.name}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void revoke(item.title.id)}
                        disabled={revokingId !== null}
                      >
                        {revokingId === item.title.id ? "收回中..." : "收回"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <hr />

        <h2>授予新称号</h2>

        <select
          value={selectTitle}
          onChange={(e) => setSelectTitle(e.target.value)}
        >
          <option value="">选择称号</option>

          {allTitles.map((title) => (
            <option key={title.id} value={title.id}>
              {title.id} - {title.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={grant}
          disabled={granting || !selectTitle}
        >
          {granting ? "授予中..." : "授予"}
        </button>

        <p>授予后不会自动佩戴，用户需要进入个人设置自行开启。</p>
      </div>
    </main>
  );
}

export default function UserTitleSettingsForm() {
  return (
    <Suspense fallback={<main className="admin-page">页面加载中...</main>}>
      <UserTitleSettingsContent />
    </Suspense>
  );
}
