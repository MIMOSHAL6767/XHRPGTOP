
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

  const banner = banners.length
    ? banners[bannerIndex % banners.length]
    : null;

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
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setBannerIndex((index) => (index + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length]);

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

  function logout() {
    localStorage.removeItem("user");
    setUser(null);
    router.refresh();
  }

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

  // 兼容数据库里可能保存的数字、"40" 或 "40px"
  function cssSize(value: unknown, fallback: string) {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    const str = String(value);
    return /^\d+(\.\d+)?$/.test(str) ? `${str}px` : str;
  }

  function percent(value: unknown, fallback: number) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

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

                <button onClick={logout}>退出</button>
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
              width: "100%",
              height: "420px",
              minHeight: "320px",
              overflow: "hidden",
              isolation: "isolate",
              borderRadius: "12px",
              backgroundColor: "#171717",
            }}
          >
            {/* 背景图：铺满整个轮播区域 */}
            {banner.background && (
              <img
                key={banner.background}
                src={banner.background}
                alt=""
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  zIndex: 0,
                }}
              />
            )}

            {/* 背景遮罩，保证文字可读 */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.45), rgba(0,0,0,0.05))",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />

            {/* 轮播内容 */}
            <div
              className="latest-inner"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 2,
              }}
            >
              {/* 封面：按百分比定位，并以图片中心作为定位点 */}
              {banner.cover && (
                <img
                  key={banner.cover}
                  src={banner.cover}
                  alt={banner.title || "轮播封面"}
                  style={{
                    position: "absolute",
                    width: `min(${cssSize(
                      banner.coverWidth,
                      "300px"
                    )}, 45%)`,
                    height: `min(${cssSize(
                      banner.coverHeight,
                      "300px"
                    )}, 90%)`,
                    left: `${percent(banner.coverX, 50)}%`,
                    top: `${percent(banner.coverY, 50)}%`,
                    transform: "translate(-50%, -50%)",
                    objectFit: banner.coverFit || "contain",
                    objectPosition: "center",
                    zIndex: 3,
                  }}
                />
              )}

              {/* 标题：读取后台的 titleX / titleY */}
              <div
                style={{
                  position: "absolute",
                  left: `${percent(banner.titleX, 50)}%`,
                  top: `${percent(banner.titleY, 30)}%`,
                  transform: "translate(-50%, -50%)",
                  maxWidth: "48%",
                  zIndex: 4,
                  overflowWrap: "anywhere",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: cssSize(banner.titleSize, "40px"),
                    color: banner.titleColor || "#ffffff",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    textShadow: "0 2px 8px rgba(0,0,0,0.65)",
                  }}
                >
                  {banner.title}
                </h1>
              </div>

              {/* 简介：读取后台的 descX / descY */}
              <div
                style={{
                  position: "absolute",
                  left: `${percent(banner.descX, 50)}%`,
                  top: `${percent(banner.descY, 50)}%`,
                  transform: "translate(-50%, -50%)",
                  width: "min(42%, 560px)",
                  zIndex: 4,
                  overflowWrap: "anywhere",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: cssSize(banner.descSize, "18px"),
                    color: banner.descColor || "#ffffff",
                    whiteSpace: "pre-wrap",
                    textShadow: "0 2px 8px rgba(0,0,0,0.65)",
                  }}
                >
                  {banner.description}
                </p>
              </div>
            </div>

            {/* 上一张 */}
            {banners.length > 1 && (
              <button
                type="button"
                aria-label="上一张轮播图"
                onClick={() =>
                  setBannerIndex(
                    (index) => (index - 1 + banners.length) % banners.length
                  )
                }
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 5,
                }}
              >
                ‹
              </button>
            )}

            {/* 下一张 */}
            {banners.length > 1 && (
              <button
                type="button"
                aria-label="下一张轮播图"
                onClick={() =>
                  setBannerIndex((index) => (index + 1) % banners.length)
                }
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 5,
                }}
              >
                ›
              </button>
            )}
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

              <div className="game-title">{game.name}</div>
            </Link>
          ))}

          {filteredGames.length === 0 && <div>没有找到相关游戏</div>}
        </div>
      </section>
    </main>
  );
}
