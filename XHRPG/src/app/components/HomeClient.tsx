"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomeClient({
  games,
  banners = [],
}: {
  games: any[];
  banners: any[];
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [search, setSearch] = useState("");

  const banner = banners[bannerIndex];

  // 打开个人空间
  async function openMySpace() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/uid/${data.user.id}`);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  }

  // 自动轮播
  useEffect(() => {
    if (!banners.length) return;

    const timer = setInterval(() => {
      setBannerIndex((index) => (index + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners]);

  // 读取登录状态
  useEffect(() => {
    try {
      const data = localStorage.getItem("user");

      if (data) {
        setUser(JSON.parse(data));
      }
    } catch {
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  // 退出登录
  function logout() {
    localStorage.removeItem("user");
    setUser(null);
    router.refresh();
  }

  // 搜索过滤
  const filteredGames = games.filter((game) => {
    const key = search.trim().toLowerCase();

    if (!key) return true;

    return (
      game.name?.toLowerCase().includes(key) ||
      game.en?.toLowerCase().includes(key) ||
      game.author?.toLowerCase().includes(key) ||
      game.category?.toLowerCase().includes(key)
    );
  });

  return (
    <main className="xhrpg-home">
      {/* 左侧抽屉 */}
      <aside
        className={open ? "drawer-nav open" : "drawer-nav"}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="logo-box">
          <b>喜灰</b>
          <span>RPG</span>
        </div>
      </aside>

      {/* 首页主体 */}
      <section className="content-area">
        {/* 顶部搜索和用户区域 */}
        <header className="top-bar">
          <input
            placeholder="搜索 RPG 游戏..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="user-area">
            {/* 未登录时不渲染登录或注册按钮 */}
            {user && (
              <>
                <div className="avatar">
                  {user.username?.charAt(0)}
                </div>

                <span className="username">
                  {user.username}
                </span>

                {user.role === "owner" && (
                  <button onClick={() => router.push("/admin")}>
                    后台管理
                  </button>
                )}

                <button onClick={logout}>
                  退出
                </button>
              </>
            )}
          </div>
        </header>

        {/* 首页轮播 */}
        {banner && (
          <section
            className="latest-box"
            style={{
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* 上一张 */}
            <button
              onClick={() =>
                setBannerIndex(
                  (bannerIndex - 1 + banners.length) % banners.length
                )
              }
            >
              ‹
            </button>

            <div
              className="latest-inner"
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
              }}
            >
              {/* 轮播封面 */}
              {banner.cover && (
                <img
                  src={banner.cover}
                  alt={banner.title || "轮播封面"}
                  style={{
                    width: banner.coverWidth,
                    height: banner.coverHeight,
                    position: "absolute",
                    left: `${banner.coverX}%`,
                    top: `${banner.coverY}%`,
                    objectFit: banner.coverFit,
                  }}
                />
              )}

              {/* 轮播文字 */}
              <div
                style={{
                  position: "absolute",
                  left: `${banner.textX}%`,
                  top: `${banner.textY}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <h1
                  style={{
                    fontSize: banner.titleSize,
                    color: banner.titleColor,
                  }}
                >
                  {banner.title}
                </h1>

                <p
                  style={{
                    fontSize: banner.descSize,
                    color: banner.descColor,
                  }}
                >
                  {banner.description}
                </p>
              </div>
            </div>

            {/* 下一张 */}
            <button
              onClick={() =>
                setBannerIndex(
                  (bannerIndex + 1) % banners.length
                )
              }
            >
              ›
            </button>
          </section>
        )}

        {/* 游戏库 */}
        <h2>游戏库</h2>

        <div className="game-grid">
          {filteredGames.map((game) => (
            <Link
              key={game.id}
              className="square-card"
              href={`/game/${game.id}`}
            >
              <div className="cover-box">
                <img
                  className="cover-img"
                  src={
                    game.cover ||
                    `/assets/games/games${game.id}.png`
                  }
                  alt={game.name}
                />
              </div>

              <div className="game-title">
                {game.name}
              </div>
            </Link>
          ))}

          {filteredGames.length === 0 && (
            <div>没有找到相关游戏</div>
          )}
        </div>
      </section>
    </main>
  );
}
