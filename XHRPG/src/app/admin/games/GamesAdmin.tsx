
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SCROLL_KEY = "xhrpg_admin_games_scroll";

type GameItem = {
  id: number;
  name?: string;
  author?: string;
  cover?: string | null;
  version?: string;
  status?: string;
  submissionCredential?: string | null;
  [key: string]: any;
};

export default function GamesAdmin({
  games = [],
}: {
  games?: GameItem[];
}) {
  const router = useRouter();

  const [keyword, setKeyword] = useState("");
  const [credentials, setCredentials] = useState<Record<number, string>>({});
  const [visibleCredentials, setVisibleCredentials] = useState<Record<number, boolean>>({});
  const [credentialLoading, setCredentialLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const savedPosition = sessionStorage.getItem(SCROLL_KEY);

    if (savedPosition === null) return;

    const scrollY = Number(savedPosition);

    if (!Number.isFinite(scrollY) || scrollY < 0) {
      sessionStorage.removeItem(SCROLL_KEY);
      return;
    }

    requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollY,
        behavior: "instant",
      });

      sessionStorage.removeItem(SCROLL_KEY);
    });
  }, []);

  function openEditPage() {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  }

  const list = (games || []).filter((game) => {
    return (
      game.name?.includes(keyword) ||
      game.author?.includes(keyword)
    );
  });

  async function remove(id: number) {
    if (!confirm("确定永久删除这个游戏吗？")) return;

    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "删除失败");
      }

      alert("删除成功");
      sessionStorage.removeItem(SCROLL_KEY);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除失败");
    }
  }

  async function viewCredential(id: number) {
    if (credentials[id]) {
      setVisibleCredentials((old) => ({ ...old, [id]: !old[id] }));
      return;
    }

    setCredentialLoading((old) => ({ ...old, [id]: true }));

    try {
      const res = await fetch(`/api/admin/games/${id}/credential`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "获取投稿凭证失败");
      }

      if (!data.credential) {
        alert("该游戏没有投稿凭证，可能是站长手动创建的游戏。");
        return;
      }

      setCredentials((old) => ({ ...old, [id]: data.credential }));
      setVisibleCredentials((old) => ({ ...old, [id]: true }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "获取投稿凭证失败");
    } finally {
      setCredentialLoading((old) => ({ ...old, [id]: false }));
    }
  }

  async function copyCredential(id: number) {
    const credential = credentials[id];

    if (!credential) {
      alert("请先查看投稿凭证");
      return;
    }

    try {
      await navigator.clipboard.writeText(credential);
      alert("凭证已复制，请通过安全方式转交给投稿者");
    } catch {
      alert("复制失败，请展开凭证后手动选择并复制");
    }
  }

  async function regenerateCredential(game: GameItem) {
    if (
      !confirm(
        `确定为「${game.name || `游戏 #${game.id}`}」重新生成投稿凭证吗？\n\n新凭证生成后，旧凭证会立即失效。请确认能够将新凭证交还给投稿者。`
      )
    ) {
      return;
    }

    setCredentialLoading((old) => ({ ...old, [game.id]: true }));

    try {
      const res = await fetch(
        `/api/admin/games/${game.id}/credential`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok || !data.success || !data.credential) {
        throw new Error(data.message || "重新生成凭证失败");
      }

      setCredentials((old) => ({
        ...old,
        [game.id]: data.credential,
      }));

      setVisibleCredentials((old) => ({
        ...old,
        [game.id]: true,
      }));

      alert("新凭证已生成，旧凭证已失效。请立即复制并安全转交给投稿者。");
    } catch (error) {
      alert(error instanceof Error ? error.message : "重新生成凭证失败");
    } finally {
      setCredentialLoading((old) => ({ ...old, [game.id]: false }));
    }
  }

  return (
    <main className="admin-page">
      <Link href="/admin">
        <button className="back-btn">← 返回后台</button>
      </Link>

      <div className="admin-box games-admin">
        <h1>喜灰RPG 游戏管理</h1>

        <div className="admin-top">
          <Link href="/admin/games/new">
            <button className="admin-main-btn">+ 添加游戏</button>
          </Link>

          <input
            className="game-search"
            placeholder="搜索游戏名称 / 作者"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="game-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>封面</th>
                <th>名称</th>
                <th>版本</th>
                <th>作者</th>
                <th>状态</th>
                <th>投稿凭证</th>
                <th>操作</th>
              </tr>
            </thead>

            <tbody>
              {list.map((game) => {
                const loading = !!credentialLoading[game.id];
                const credential = credentials[game.id];
                const hasCredential = Boolean(
                  credential || game.submissionCredential
                );

                return (
                  <tr key={game.id}>
                    <td>{game.id}</td>

                    <td>
                      <div className="admin-cover-box">
                        <img
                          src={
                            game.cover ||
                            `/assets/games/games${game.id}.png`
                          }
                          className="admin-cover"
                          alt={game.name || "游戏封面"}
                        />
                      </div>
                    </td>

                    <td>{game.name}</td>
                    <td>{game.version}</td>
                    <td>{game.author}</td>

                    <td>
                      <span
                        className={
                          game.status === "隐藏"
                            ? "status hidden"
                            : "status"
                        }
                      >
                        {game.status}
                      </span>
                    </td>

                    <td style={{ minWidth: 220 }}>
                      {hasCredential ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {visibleCredentials[game.id] && credential ? (
                            <textarea
                              readOnly
                              rows={3}
                              value={credential}
                              aria-label={`${game.name}投稿凭证`}
                              onFocus={(event) =>
                                event.currentTarget.select()
                              }
                              style={{
                                width: "100%",
                                minWidth: 180,
                                boxSizing: "border-box",
                                resize: "vertical",
                                overflowWrap: "anywhere",
                                background: "#10090b",
                                color: "#f8eeee",
                                border: "1px solid #4a2028",
                                padding: 8,
                              }}
                            />
                          ) : (
                            <span style={{ color: "#bdaeb0", fontSize: 12 }}>
                              {credential ? "凭证已载入" : "凭证已设置"}
                            </span>
                          )}

                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            <button
                              type="button"
                              className="edit-btn"
                              disabled={loading}
                              onClick={() => viewCredential(game.id)}
                            >
                              {loading
                                ? "处理中…"
                                : visibleCredentials[game.id]
                                  ? "隐藏凭证"
                                  : "查看凭证"}
                            </button>

                            <button
                              type="button"
                              className="edit-btn"
                              disabled={loading || !credential}
                              onClick={() => copyCredential(game.id)}
                            >
                              复制
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              disabled={loading}
                              onClick={() => regenerateCredential(game)}
                            >
                              重新生成
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#bdaeb0", fontSize: 12 }}>
                          暂无投稿凭证
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <Link
                          href={`/admin/games/${game.id}`}
                          onClick={openEditPage}
                        >
                          <button className="edit-btn">编辑</button>
                        </Link>

                        <button
                          className="delete-btn"
                          onClick={() => remove(game.id)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {list.length === 0 && (
          <p className="empty">没有找到游戏</p>
        )}
      </div>
    </main>
  );
}
