"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function UserTitleSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");

  const [user, setUser] = useState<any>(null);
  const [titles, setTitles] = useState<any[]>([]);
  const [allTitles, setAllTitles] = useState<any[]>([]);
  const [selectTitle, setSelectTitle] = useState("");
  const [loading, setLoading] = useState(false);

  // 加载用户称号
  async function load() {
    if (!uid) return;

    try {
      setLoading(true);

      const res = await fetch(
        `/api/admin/users/title/settings?uid=${encodeURIComponent(uid)}`
      );

      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setTitles(data.user?.userTitles || []);
      } else {
        alert(data.message || "加载失败");
      }
    } catch (e) {
      console.error(e);
      alert("加载用户称号失败");
    } finally {
      setLoading(false);
    }
  }

  // 加载全部称号
  async function loadTitles() {
    try {
      const res = await fetch("/api/admin/users/title/list");
      const data = await res.json();

      if (data.success) {
        setAllTitles(data.titles || []);
      } else {
        console.error(data.message || "加载称号列表失败");
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (!uid) return;

    void load();
    void loadTitles();

    // load 函数在本次 effect 中使用当前 uid 执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // 授予称号
  async function grant() {
    if (!uid) {
      alert("缺少用户 UID");
      return;
    }

    if (!selectTitle) {
      alert("请选择称号");
      return;
    }

    try {
      const res = await fetch("/api/admin/users/title/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: Number(uid),
          titleId: Number(selectTitle),
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("授予成功");
        await load();
      } else {
        alert(data.message || "授予失败");
      }
    } catch (e) {
      console.error(e);
      alert("授予称号失败");
    }
  }

  // 收回称号
  async function revoke(titleId: number) {
    if (!uid) {
      alert("缺少用户 UID");
      return;
    }

    if (!confirm("确定收回这个称号？")) return;

    try {
      const res = await fetch(
        `/api/admin/users/title?userId=${encodeURIComponent(uid)}&titleId=${encodeURIComponent(String(titleId))}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: Number(uid),
            titleId,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert("收回成功");
        await load();
      } else {
        alert(data.message || "收回失败");
      }
    } catch (e) {
      console.error(e);
      alert("收回称号失败");
    }
  }

  if (!uid) {
    return <main>未指定用户UID</main>;
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
        <button onClick={() => router.back()}>← 返回</button>

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
                        padding: "5px 15px",
                        borderRadius: "20px",
                        background: item.title.background,
                        color: item.title.color,
                        border: item.title.border,
                        boxShadow: item.title.shadow,
                        fontSize: item.title.size,
                      }}
                    >
                      {item.title.name}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => revoke(item.title.id)}>
                      收回
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

        <button onClick={grant}>授予</button>

        <p>授予后不会自动佩戴，用户需要进入个人设置自行开启。</p>
      </div>
    </main>
  );
}

export default function UserTitleSettings() {
  return (
    <Suspense fallback={<main className="admin-page">页面加载中...</main>}>
      <UserTitleSettingsContent />
    </Suspense>
  );
}
