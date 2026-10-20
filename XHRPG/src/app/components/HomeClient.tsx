
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import SiteHeader from "@/app/components/SiteHeader";

export default function HomeClient({
  games,
  banners = [],
  headerImage = null,
}: {
  games: any[];
  banners: any[];
  headerImage?: string | null;
}) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"default" | "latest">("default");

  const banner = banners.length
    ? banners[bannerIndex % banners.length]
    : null;

  // 自动轮播
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setBannerIndex((index) => (index + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length]);

  // 首页搜索和排序
  const filteredGames = games
    .filter((game) => {
      const key = search.trim().toLowerCase();

      if (!key) return true;

      return (
        game.name?.toLowerCase().includes(key) ||
        game.en?.toLowerCase().includes(key) ||
        game.author?.toLowerCase().includes(key) ||
        game.category?.toLowerCase().includes(key)
      );
    })
    .sort((a, b) => {
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;

      return sortOrder === "default" ? idA - idB : idB - idA;
    });

  // 兼容数字、"40" 和 "40px"
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
    <main
      className="xhrpg-home"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        minHeight: "100vh",
        margin: 0,
      }}
    >
      {/* 公共头图、导航栏、搜索栏和用户信息 */}
      <SiteHeader
        headerImage={headerImage}
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* 首页主体 */}
      <section
        className="content-area"
        style={{
          position: "relative",
          width: "min(100% - 32px, 1440px)",
          maxWidth: "1440px",
          minWidth: 0,
          margin: "0 auto",
          padding: "24px 0 40px",
          boxSizing: "border-box",
          alignSelf: "center",
        }}
      >
        {/* 首页轮播 */}
        {banner && (
          <section
            className="latest-box"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "100%",
              marginLeft: "auto",
              marginRight: "auto",
              height: "500px",
              minHeight: "320px",
              overflow: "hidden",
              isolation: "isolate",
              borderRadius: 0,
              backgroundColor: "#171717",
            }}
          >
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

            <div
              className="latest-inner"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 2,
              }}
            >
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
                    border: "none",
                    outline: "none",
                    boxShadow: "none",
                    background: "transparent",
                    WebkitAppearance: "none",
                    filter: "none",
                  }}
                />
              )}

              {/* 轮播标题 */}
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

              {/* 轮播简介 */}
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
                  borderRadius: 0,
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
                  borderRadius: 0,
                }}
              >
                ›
              </button>
            )}
          </section>
        )}

        {/* 首页游戏库标题和排序 */}
        <div
          className="game-library-heading"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ margin: 0 }}>游戏库</h2>

          <div
            role="group"
            aria-label="游戏排序方式"
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              aria-pressed={sortOrder === "default"}
              onClick={() => setSortOrder("default")}
              style={{
                padding: "8px 14px",
                borderRadius: 0,
                border:
                  sortOrder === "default"
                    ? "1px solid #e5484d"
                    : "1px solid #444",
                background:
                  sortOrder === "default" ? "#e5484d" : "transparent",
                color: "#fff",
                cursor: "pointer",
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              默认排序
            </button>

            <button
              type="button"
              aria-pressed={sortOrder === "latest"}
              onClick={() => setSortOrder("latest")}
              style={{
                padding: "8px 14px",
                borderRadius: 0,
                border:
                  sortOrder === "latest"
                    ? "1px solid #e5484d"
                    : "1px solid #444",
                background:
                  sortOrder === "latest" ? "#e5484d" : "transparent",
                color: "#fff",
                cursor: "pointer",
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              最新上传
            </button>
          </div>
        </div>

        {/* 首页游戏卡片 */}
        <div
          className="game-grid"
          style={{
            width: "100%",
            maxWidth: "100%",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
          {filteredGames.map((game) => (
            <Link
              key={game.id}
              className="square-card"
              href={`/game/${game.id}`}
            >
              <div className="cover-box">
                <img
                  className="cover-img"
                  src={game.cover || `/assets/games/games${game.id}.png`}
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
