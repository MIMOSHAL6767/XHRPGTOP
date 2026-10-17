
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UserItem = {
  id: number;
  avatar?: string | null;
  username: string;
  nickname?: string | null;
  role: string;
  hidden?: boolean;
  banUntil?: string | null;
  muteUntil?: string | null;
  createdAt: string;
};

export default function UsersAdminForm() {
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<UserItem | null>(null);
  const [action, setAction] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [nickname, setNickname] = useState("");
  const [myRole, setMyRole] = useState("");
  const [error, setError] = useState("");

  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/admin/users?keyword=${encodeURIComponent(keyword)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "加载用户失败");
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "加载用户失败，请稍后重试";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.user) {
        setMyRole("");
        return;
      }

      setMyRole(data.user.role || "");
    } catch {
      setMyRole("");
    }
  }, []);

  useEffect(() => {
    void load();
    void loadMe();
  }, [load, loadMe]);

  function openTime(user: UserItem, type: string) {
    setTarget(user);
    setAction(type);
    setDate("");
    setTime("");
  }

  function openNickname(user: UserItem) {
    setTarget(user);
    setAction("nickname");
    setNickname(user.nickname || "");
  }

  async function update(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "操作失败");
    }

    alert("操作成功");
    await load();
  }

  async function confirmTime() {
    if (!target) return;

    if (!date || !time) {
      alert("请选择日期和时间");
      return;
    }

    const value = `${date} ${time}`;
    const body: Record<string, unknown> = {
      id: target.id,
    };

    if (action === "ban") {
      body.banUntil = value;
    } else if (action === "mute") {
      body.muteUntil = value;
    } else {
      return;
    }

    try {
      await update(body);
      setTarget(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "操作失败");
    }
  }

  async function confirmNickname() {
    if (!target) return;

    if (!nickname.trim()) {
      alert("昵称不能为空");
      return;
    }

    try {
      await update({
        id: target.id,
        type: "nickname",
        nickname: nickname.trim(),
      });

      setTarget(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "修改昵称失败");
    }
  }

  async function updateUser(user: UserItem, type: string) {
    if (busyUserId !== null) return;

    const body: Record<string, unknown> = {
      id: user.id,
    };

    if (type === "hide") {
      body.hidden = !user.hidden;
    } else if (type === "unban") {
      body.banUntil = null;
    } else if (type === "unmute") {
      body.muteUntil = null;
    } else {
      return;
    }

    try {
      setBusyUserId(user.id);
      await update(body);
    } catch (e) {
      alert(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyUserId(null);
    }
  }

  async function removeUser(user: UserItem) {
    if (user.role === "owner") {
      alert("站长账号不可删除");
      return;
    }

    if (busyUserId !== null) return;

    if (!confirm("确定删除该用户？此操作无法撤销。")) {
      return;
    }

    try {
      setBusyUserId(user.id);

      const res = await fetch(
        `/api/admin/users?id=${encodeURIComponent(String(user.id))}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "删除失败");
      }

      alert("删除成功");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusyUserId(null);
    }
  }

  function openTitleManage(user: UserItem) {
    router.push(
      `/admin/users/title/settings?uid=${encodeURIComponent(String(user.id))}`
    );
  }

  return (
    <main className="admin-page">
      <div
        className="admin-box"
        style={{
          width: "1500px",
          maxWidth: "95vw",
        }}
      >
        <button type="button" onClick={() => router.push("/admin")}>
          ← 返回后台
        </button>

        <h1>用户管理</h1>

        <div>
          <input
            style={{
              width: "320px",
              maxWidth: "100%",
              padding: "10px",
            }}
            placeholder="搜索用户名 / 昵称 / UID"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
          />

          <button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? "搜索中..." : "搜索"}
          </button>
        </div>

        {error && <p role="alert">{error}</p>}

        <table
          style={{
            width: "100%",
            marginTop: "20px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th>头像</th>
              <th>UID</th>
              <th>用户名</th>
              <th>昵称</th>
              <th>权限</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`${user.username} 的头像`}
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span>暂无头像</span>
                  )}
                </td>

                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.nickname || "-"}</td>
                <td>{user.role}</td>

                <td>
                  {user.hidden
                    ? "隐藏"
                    : user.banUntil
                      ? "封禁"
                      : user.muteUntil
                        ? "禁言"
                        : "正常"}
                </td>

                <td>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleString()
                    : "-"}
                </td>

                <td>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {myRole === "owner" && user.role !== "owner" && (
                      <>
                        <button
                          type="button"
                          onClick={() => openNickname(user)}
                        >
                          修改昵称
                        </button>

                        <button
                          type="button"
                          onClick={() => openTitleManage(user)}
                        >
                          称号管理
                        </button>
                      </>
                    )}

                    {user.role === "owner" ? (
                      <span>站长保护</span>
                    ) : (
                      <>
                        {user.banUntil ? (
                          <button
                            type="button"
                            disabled={busyUserId !== null}
                            onClick={() => void updateUser(user, "unban")}
                          >
                            解除封禁
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openTime(user, "ban")}
                          >
                            封禁
                          </button>
                        )}

                        {user.muteUntil ? (
                          <button
                            type="button"
                            disabled={busyUserId !== null}
                            onClick={() => void updateUser(user, "unmute")}
                          >
                            解除禁言
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openTime(user, "mute")}
                          >
                            禁言
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={busyUserId !== null}
                          onClick={() => void updateUser(user, "hide")}
                        >
                          {user.hidden ? "取消隐藏" : "隐藏"}
                        </button>

                        <button
                          type="button"
                          disabled={busyUserId !== null}
                          onClick={() => void removeUser(user)}
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={8}>没有找到用户</td>
              </tr>
            )}
          </tbody>
        </table>

        {target && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(0,0,0,.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
          >
            <div
              style={{
                background: "#222",
                color: "#fff",
                padding: "30px",
                borderRadius: "15px",
                maxWidth: "95vw",
              }}
            >
              {action === "nickname" ? (
                <>
                  <h2>修改昵称</h2>

                  <input
                    value={nickname}
                    maxLength={20}
                    onChange={(e) => setNickname(e.target.value)}
                    style={{ padding: "8px" }}
                  />

                  <button type="button" onClick={() => void confirmNickname()}>
                    确定
                  </button>
                </>
              ) : (
                <>
                  <h2>{action === "ban" ? "设置封禁时间" : "设置禁言时间"}</h2>

                  <label>
                    日期
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>

                  <label>
                    时间
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </label>

                  <button type="button" onClick={() => void confirmTime()}>
                    确定
                  </button>
                </>
              )}

              <button type="button" onClick={() => setTarget(null)}>
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
