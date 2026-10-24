"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SCROLL_KEY = "xhrpg_admin_games_scroll";

export default function GamesAdmin({
  games = [],
}: {
  games?: any[];
}) {
  const router = useRouter();

  const [keyword, setKeyword] = useState("");

  // 页面打开时，恢复进入编辑页面前保存的滚动位置
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(SCROLL_KEY);

    if (savedPosition === null) return;

    const scrollY = Number(savedPosition);

    if (!Number.isFinite(scrollY) || scrollY < 0) {
      sessionStorage.removeItem(SCROLL_KEY);
      return;
    }

    // 等页面渲染完成后恢复位置
    requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollY,
        behavior: "instant",
      });

      sessionStorage.removeItem(SCROLL_KEY);
    });
  }, []);

  // 进入编辑页面前保存当前位置
  function openEditPage() {
    sessionStorage.setItem(
      SCROLL_KEY,
      String(window.scrollY)
    );
  }

  const list = (games || []).filter((game) => {
    return (
      game.name?.includes(keyword) ||
      game.author?.includes(keyword)
    );
  });

  async function remove(id: number) {
    if (!confirm("确定永久删除这个游戏吗？")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "删除失败");
      }

      alert("删除成功");

      // 删除后清除旧位置，避免后续误恢复
      sessionStorage.removeItem(SCROLL_KEY);

      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "删除失败"
      );
    }
  }

  return (
    <main className="admin-page">
      <Link href="/admin">
        <button className="back-btn">
          ← 返回后台
        </button>
      </Link>

      <div className="admin-box games-admin">
        <h1>喜灰RPG 游戏管理</h1>

        <div className="admin-top">
          <Link href="/admin/games/new">
            <button className="admin-main-btn">
              + 添加游戏
            </button>
          </Link>

          <input
            className="game-search"
            placeholder="搜索游戏名称 / 作者"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <table className="game-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>封面</th>
              <th>名称</th>
              <th>版本</th>
              <th>作者</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>

          <tbody>
            {list.map((game) => (
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
                      alt={game.name}
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

                <td>
                  <Link
                    href={`/admin/games/${game.id}`}
                    onClick={openEditPage}
                  >
                    <button className="edit-btn">
                      编辑
                    </button>
                  </Link>

                  <button
                    className="delete-btn"
                    onClick={() => remove(game.id)}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {list.length === 0 && (
          <p className="empty">
            没有找到游戏
          </p>
        )}
      </div>
    </main>
  );
}
