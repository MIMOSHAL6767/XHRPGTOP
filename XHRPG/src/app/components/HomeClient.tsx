"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import SiteHeader from "@/app/components/SiteHeader";

type ActivityItem = {
  id: number;
  title: string;
  cover?: string | null;
  background?: string | null;
  backgroundFit?: string | null;
  backgroundOpacity?: number | null;
  titleColor?: string | null;
  titleSize?: number | null;
  content?: string | null;
  showOnHome?: boolean;
  enabled?: boolean;
  sort?: number;
};

type ImageFit =
  | "contain"
  | "cover"
  | "fill"
  | "none"
  | "scale-down";

function getImageFit(value: unknown, fallback: ImageFit = "cover"): ImageFit {
  if (
    value === "contain" ||
    value === "cover" ||
    value === "fill" ||
    value === "none" ||
    value === "scale-down"
  ) {
    return value;
  }

  return fallback;
}

export default function HomeClient({
  games,
  banners = [],
  headerImage = null,
  activities = [],
}: {
  games: any[];
  banners: any[];
  headerImage?: string | null;
  activities?: ActivityItem[];
}) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"default" | "latest">(
    "default"
  );

  const banner = banners.length
    ? banners[bannerIndex % banners.length]
    : null;

  // 只展示已启用且允许在首页展示的活动
  const homeActivities = activities
    .filter(
      (activity) =>
        activity.enabled === true && activity.showOnHome === true
    )
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

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
  function cssSize(value: unknown, fallback: string): string {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    const str = String(value);
    return /^\d+(\.\d+)?$/.test(str) ? `${str}px` : str;
  }

  function percent(value: unknown, fallback: number): number {
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
            {/* 轮播背景图 */}
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

            {/* 背景渐变遮罩 */}
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
              {/* 轮播封面 */}
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
                    objectFit: getImageFit(banner.coverFit, "contain"),
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

        {/* 首页活动专区 */}
        {homeActivities.length > 0 && (
          <section
            className="home-activities"
            style={{
              width: "100%",
              marginTop: "32px",
              marginBottom: "36px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ margin: 0 }}>活动专区</h2>

              <Link
                href="/activities"
                style={{
                  color: "#e5484d",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                查看全部活动 →
              </Link>
            </div>

            <div
              className="home-activity-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "16px",
                width: "100%",
              }}
            >
              {homeActivities.map((activity) => (
                <Link
                  key={activity.id}
                  href={`/activities/${activity.id}`}
                  className="home-activity-card"
                  style={{
                    position: "relative",
                    display: "block",
                    minWidth: 0,
                    overflow: "hidden",
                    aspectRatio: "16 / 7",
                    backgroundColor: "#160c0f",
                    border: "1px solid #4a2028",
                    borderRadius: 0,
                    color: "#ffffff",
                    textDecoration: "none",
                  }}
                >
                  {/* 活动背景图；无背景时使用封面铺满 */}
                  {activity.background ? (
                    <img
                      src={activity.background}
                      alt=""
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: getImageFit(
                          activity.backgroundFit,
                          "cover"
                        ),
                        objectPosition: "center",
                      }}
                    />
                  ) : activity.cover ? (
                    <img
                      src={activity.cover}
                      alt=""
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center",
                      }}
                    />
                  ) : null}

                  {/* 活动背景遮罩 */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `rgba(0,0,0,${Math.min(
                        100,
                        Math.max(0, activity.backgroundOpacity ?? 35)
                      ) / 100})`,
                    }}
                  />

                  {/* 同时存在背景和封面时，将封面放在右侧 */}
                  {activity.cover && activity.background && (
                    <img
                      src={activity.cover}
                      alt=""
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        right: "5%",
                        top: "50%",
                        transform: "translateY(-50%)",
                        height: "76%",
                        width: "30%",
                        objectFit: "contain",
                        objectPosition: "center",
                      }}
                    />
                  )}

                  {/* 活动标题与入口 */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "flex-start",
                      padding: "clamp(12px, 3%, 28px)",
                      boxSizing: "border-box",
                      maxWidth:
                        activity.cover && activity.background
                          ? "72%"
                          : "100%",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: `clamp(16px, ${Math.max(
                          16,
                          Math.min(36, activity.titleSize ?? 24)
                        ) / 16}vw, ${Math.min(
                          36,
                          activity.titleSize ?? 24
                        )}px)`,
                        color: activity.titleColor || "#ffffff",
                        overflowWrap: "anywhere",
                        textShadow: "0 2px 8px rgba(0,0,0,0.75)",
                      }}
                    >
                      {activity.title}
                    </h3>

                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "12px",
                        padding: "6px 12px",
                        border: "1px solid rgba(255,255,255,0.65)",
                        background: "rgba(0,0,0,0.3)",
                        fontSize: "13px",
                        color: "#ffffff",
                      }}
                    >
                      查看活动 →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
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
            flex
