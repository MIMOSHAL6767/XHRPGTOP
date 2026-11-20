"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CommentItem = {
  id: string;
  body: string;
  author: string;
  avatarUrl: string | null;
  createdAt: string;
  discussionTitle: string;
  discussionUrl: string;
};

export default function CommentsAdminClient() {
  const router = useRouter();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [configured, setConfigured] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/comments", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "加载评论失败");
      }

      setConfigured(Boolean(data.configured));
      setComments(Array.isArray(data.comments) ? data.comments : []);

      if (data.message) setMessage(String(data.message));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "加载评论失败"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(comment: CommentItem) {
    if (!confirm("确定删除这条评论？操作会同步删除 GitHub 上的内容。")) {
      return;
    }

    try {
      setDeletingId(comment.id);

      const response = await fetch("/api/admin/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: comment.id }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "删除失败");
      }

      setComments((items) =>
        items.filter((item) => item.id !== comment.id)
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <main className="admin-page">
      <div
        className="admin-box"
        style={{ width: "1100px", maxWidth: "95vw" }}
      >
        <button type="button" onClick={() => router.push("/admin")}>
          ← 返回后台
        </button>

        <h1>评论管理</h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <span>共 {comments.length} 条评论</span>

          <button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>

        {message && (
          <p role="alert" style={{ color: "#d08a8a" }}>
            {message}
          </p>
        )}

        {!configured ? null : comments.length === 0 && !loading ? (
          <p>暂无评论。玩家在游戏详情页发表评论后会出现在这里。</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {comments.map((comment) => (
              <article
                key={comment.id}
                style={{
                  display: "flex",
                  gap: "14px",
                  padding: "14px 16px",
                  background: "#1c1315",
                  border: "1px solid #3a2a2d",
                }}
              >
                {comment.avatarUrl ? (
                  <img
                    src={comment.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    style={{ borderRadius: "50%", flex: "0 0 auto" }}
                  />
                ) : (
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#3a2a2d",
                      flex: "0 0 auto",
                    }}
                  />
                )}

                <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px 14px",
                      alignItems: "baseline",
                      marginBottom: "6px",
                    }}
                  >
                    <strong>{comment.author}</strong>

                    <a
                      href={comment.discussionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#c9aeb2", fontSize: "13px" }}
                    >
                      {comment.discussionTitle || "查看讨论"}
                    </a>

                    <span style={{ color: "#9e858a", fontSize: "12px" }}>
                      {new Date(comment.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      lineHeight: 1.7,
                    }}
                  >
                    {comment.body}
                  </p>
                </div>

                <button
                  type="button"
                  className="delete-btn"
                  disabled={deletingId === comment.id}
                  onClick={() => void remove(comment)}
                  style={{ alignSelf: "flex-start", flex: "0 0 auto" }}
                >
                  {deletingId === comment.id ? "删除中…" : "删除"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
