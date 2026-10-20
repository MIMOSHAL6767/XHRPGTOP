
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UserDetailData = {
  id: number | string;
  avatar?: string | null;
  username: string;
  role: string;
  createdAt?: string | null;
  hidden?: boolean;
  banUntil?: string | null;
  muteUntil?: string | null;
  ipRecords?: string[];
  downloads?: {
    id: number | string;
    gameName?: string | null;
    createdAt?: string | null;
  }[];
  banHistory?: {
    id: number | string;
    createdAt?: string | null;
    reason?: string | null;
  }[];
  muteHistory?: {
    id: number | string;
    createdAt?: string | null;
    reason?: string | null;
  }[];
  adminNote?: string | null;
};

export default function UserDetailForm({ id }: { id: string }) {
  const router = useRouter();

  const [user, setUser] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/admin/users/${encodeURIComponent(id)}`,
          { cache: "no-store" }
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "加载用户详情失败");
        }

        if (!data.user) {
          throw new Error("用户不存在");
        }

        if (!cancelled) {
          setUser(data.user);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "加载失败，请稍后重试"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-box">
          <h1>加载中...</h1>
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="admin-page">
        <div className="admin-box">
          <h1>{error || "用户不存在"}</h1>
          <button type="button" onClick={() => router.back()}>
            ← 返回用户列表
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-box">
        <button type="button" onClick={() => router.back()}>
          ← 返回用户列表
        </button>

        <h1>用户详情</h1>

        <section className="user-detail">
          <h2>基本信息</h2>

          <div>
            头像：
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.username} 的头像`}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              "暂无头像"
            )}
          </div>

          <p>
            UID：<strong>{user.id}</strong>
          </p>

          <p>
            用户名：<strong>{user.username}</strong>
          </p>

          <p>权限：{user.role}</p>

          <p>
            注册时间：
            {user.createdAt
              ? new Date(user.createdAt).toLocaleString()
              : "未知"}
          </p>
        </section>

        <hr />

        <section>
          <h2>账号状态</h2>

          <p>
            当前状态：
            {user.hidden
              ? "隐藏用户"
              : user.banUntil
                ? "封禁中"
                : user.muteUntil
                  ? "禁言中"
                  : "正常"}
          </p>

          <p>
            封禁结束：
            {user.banUntil
              ? new Date(user.banUntil).toLocaleString()
              : "无"}
          </p>

          <p>
            禁言结束：
            {user.muteUntil
              ? new Date(user.muteUntil).toLocaleString()
              : "无"}
          </p>
        </section>

        <hr />

        <section>
          <h2>IP 记录</h2>

          {user.ipRecords?.length ? (
            user.ipRecords.map((ip, index) => (
              <p key={`${ip}-${index}`}>{ip}</p>
            ))
          ) : (
            <p>暂无 IP 记录</p>
          )}
        </section>

        <hr />

        <section>
          <h2>游戏下载记录</h2>

          {user.downloads?.length ? (
            user.downloads.map((item) => (
              <div key={item.id}>
                <p>游戏：{item.gameName || "未知"}</p>
                <p>
                  时间：
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : "未知"}
                </p>
              </div>
            ))
          ) : (
            <p>暂无下载记录</p>
          )}
        </section>

        <hr />

        <section>
          <h2>封禁历史</h2>

          {user.banHistory?.length ? (
            user.banHistory.map((item) => (
              <div key={item.id}>
                <p>
                  时间：
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : "未知"}
                </p>
                <p>原因：{item.reason || "未填写"}</p>
              </div>
            ))
          ) : (
            <p>暂无记录</p>
          )}
        </section>

        <hr />

        <section>
          <h2>禁言历史</h2>

          {user.muteHistory?.length ? (
            user.muteHistory.map((item) => (
              <div key={item.id}>
                <p>
                  时间：
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : "未知"}
                </p>
                <p>原因：{item.reason || "未填写"}</p>
              </div>
            ))
          ) : (
            <p>暂无记录</p>
          )}
        </section>

        <hr />

        <section>
          <h2>管理员备注</h2>

          <textarea
            value={user.adminNote || ""}
            readOnly
            aria-label="管理员备注"
            style={{
              width: "100%",
              height: "120px",
            }}
          />
        </section>
      </div>
    </main>
  );
}
