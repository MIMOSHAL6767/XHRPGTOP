"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import SiteHeader from "@/app/components/SiteHeader";
import FloatingWidget from "@/app/components/FloatingWidget";

type HomeGame = {
  id: number;
  name: string;
  en?: string | null;
  author: string;
  category: string;
  version: string;
  description: string;
  cover: string;
  downloads: number;
  date: string;
  createdAt: string | Date;
  tags: unknown;
  gameStatus: string;
};

type WeeklyGame = HomeGame & { weeklyIncrease: number };

type ActivityItem = {
  id: number;
  title: string;
  cover?: string | null;
  background?: string | null;
  backgroundFit?: string | null;
  backgroundOpacity?: number | null;
  titleColor?: string | null;
  titleSize?: number | null;
};

type BannerItem = {
  id: number;
  name?: string;
  background?: string | null;
  cover?: string | null;
  title?: string;
  description?: string;
  titleColor?: string | null;
  titleSize?: number | null;
  buttonUrl?: string | null;
};

function coverOf(game: HomeGame) {
  return game.cover?.trim() || `/assets/games/games${game.id}.png`;
}

function tagList(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags
      .filter((tag): tag is string => typeof tag === "string")
      .slice(0, 3);
  }

  return [];
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

export default function HomeClient({
  latestGames = [],
  hotGames = [],
  featuredGames = [],
  weeklyGame = null,
  announcement = "",
  banners = [],
  headerImage = null,
  activities = [],
  stats = { totalGames: 0, totalDownloads: 0, weekNew: 0 },
}: {
  latestGames?: HomeGame[];
  hotGames?: HomeGame[];
  featuredGames?: HomeGame[];
  weeklyGame?: WeeklyGame | null;
  announcement?: string;
  banners?: BannerItem[];
  headerImage?: string | null;
  activities?: ActivityItem[];
  stats?: {
    totalGames: number;
    totalDownloads: number;
    weekNew: number;
  };
}) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [previousBannerIndex, setPreviousBannerIndex] = useState<
    number | null
  >(null);
  const [bannerLightboxOpen, setBannerLightboxOpen] = useState(false);
  const [showAllHot, setShowAllHot] = useState(false);

  function changeBanner(index: number) {
    if (!banners.length) return;

    const next = ((index % banners.length) + banners.length) % banners.length;

    setBannerIndex((current) => {
      if (next === current) return current;
      setPreviousBannerIndex(current);
      return next;
    });
  }

  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      changeBanner(bannerIndex + 1);
    }, 6000);

    return () => clearInterval(timer);
  }, [banners.length, bannerIndex]);

  const visibleHot = showAllHot ? hotGames : hotGames.slice(0, 3);
  const visibleActivities = activities.slice(0, 2);
  const editorialGame = latestGames[0] || null;
  const latestRest = latestGames.slice(1);
  const activeBannerIndex = banners.length
    ? bannerIndex % banners.length
    : 0;
  const activeBanner = banners[activeBannerIndex] || null;

  useEffect(() => {
    if (!bannerLightboxOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setBannerLightboxOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [bannerLightboxOpen]);

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
      <SiteHeader headerImage={headerImage} />

      <div className="home-wrap">
        {/* 顶部：轮播 + 公告 */}
        <section className="home-top">
          <div className="home-banner">
            {banners.length > 0 ? (
              <div className="home-banner-stage">
                {banners.map((item, index) => {
                  const active = index === activeBannerIndex;
                  const previous = index === previousBannerIndex;
                  const image =
                    item.background || item.cover || "";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (active) setBannerLightboxOpen(true);
                      }}
                      className={
                        active
                          ? "home-banner-slide active"
                          : previous
                            ? "home-banner-slide previous"
                            : "home-banner-slide hidden-slide"
                      }
                      style={{ backgroundImage: `url("${image}")` }}
                      aria-hidden={!active}
                      aria-label={`查看轮播大图：${
                        item.title || item.name || ""
                      }`}
                      tabIndex={active ? 0 : -1}
                    >
                      <div className="home-banner-shade" />
                      <div className="home-banner-text">
                        <h2
                          style={{
                            color: item.titleColor || "#fff",
                            fontSize: item.titleSize
                              ? `${item.titleSize}px`
                              : undefined,
                          }}
                        >
                          {item.title || item.name || ""}
                        </h2>
                        {item.description && (
                          <p>{item.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="home-banner-placeholder">
                暂无轮播内容
              </div>
            )}

            {banners.length > 1 && (
              <>
                <button
                  type="button"
                  className="home-banner-arrow prev"
                  aria-label="上一张"
                  onClick={() =>
                    changeBanner(bannerIndex - 1)
                  }
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  className="home-banner-arrow next"
                  aria-label="下一张"
                  onClick={() =>
                    changeBanner(bannerIndex + 1)
                  }
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {banners.length > 0 && (
              <div className="home-banner-thumbs">
                {banners.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      index === activeBannerIndex
                        ? "home-banner-thumb active"
                        : "home-banner-thumb"
                    }
                    onClick={() => changeBanner(index)}
                    aria-label={`切换到第 ${index + 1} 张轮播`}
                  >
                    <img
                      src={item.cover || item.background || ""}
                      alt=""
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="home-stats">
              <div>
                <b>{stats.totalGames}</b>
                <span>收录游戏</span>
              </div>
              <div>
                <b>{stats.weekNew}</b>
                <span>本周新增</span>
              </div>
              <div>
                <b>{stats.totalDownloads.toLocaleString("zh-CN")}</b>
                <span>累计点击</span>
              </div>
            </div>
          </div>

          <aside className="home-announcement">
            <h3>公告</h3>
            <div className="home-announcement-body">
              {announcement?.trim() || "暂无公告"}
            </div>
          </aside>
        </section>

        {/* 最新上传 + 本周热门 */}
        <section className="home-columns home-columns-main">
          <div className="home-main-col">
            <div className="home-section-head">
              <h3>最新上传</h3>
            </div>

            {editorialGame && (
              <Link
                href={`/game/${editorialGame.id}`}
                className="home-editorial"
              >
                <div className="home-editorial-cover">
                  <img
                    src={coverOf(editorialGame)}
                    alt={editorialGame.name}
                  />
                </div>

                <div className="home-editorial-body">
                  <h4>{editorialGame.name}</h4>
                  <p>
                    {editorialGame.description || "暂无简介"}
                  </p>
                  <div className="home-editorial-meta">
                    <span>{editorialGame.author || "未知作者"}</span>
                    <span>{editorialGame.category || "未分类"}</span>
                    <span>{formatDate(editorialGame.date)}</span>
                  </div>
                </div>
              </Link>
            )}

            <div className="home-latest-grid">
              {latestRest.map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="home-card"
                >
                  <img src={coverOf(game)} alt={game.name} />
                  <span>{game.name}</span>
                </Link>
              ))}

              <Link
                href="/games?sort=latest"
                className="home-card home-card-more"
              >
                <span className="home-more-label">
                  <span>查看</span>
                  <span>更多</span>
                </span>
              </Link>
            </div>
          </div>

          <aside className="home-side-col">
            <div className="home-section-head">
              <h3>本周热门</h3>
            </div>

            {weeklyGame ? (
              <Link
                href={`/game/${weeklyGame.id}`}
                className="home-weekly-card"
              >
                <img
                  src={coverOf(weeklyGame)}
                  alt={weeklyGame.name}
                />
                <div className="home-weekly-info">
                  <b>{weeklyGame.name}</b>
                  <span>
                    单周点击量增加{" "}
                    {weeklyGame.weeklyIncrease}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="home-empty">本周暂无点击数据</div>
            )}
          </aside>
        </section>

        {/* 活动 + 精选游戏 */}
        <section className="home-columns home-columns-secondary">
          <div className="home-main-col">
            <div className="home-section-head">
              <h3>活动</h3>
              <Link href="/activities">查看全部 <ArrowRight size={13} /></Link>
            </div>

            <div className="home-activity-list">
              {visibleActivities.length > 0 ? (
                visibleActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/activities/${activity.id}`}
                    className="home-activity-card"
                  >
                    <img
                      src={
                        activity.background ||
                        activity.cover ||
                        ""
                      }
                      alt={activity.title}
                    />
                    <div className="home-activity-shade" />
                    <div className="home-activity-text">
                      <b
                        style={{
                          color:
                            activity.titleColor || "#fff",
                        }}
                      >
                        {activity.title}
                      </b>
                      <span>查看活动 <ArrowRight size={12} /></span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="home-empty">暂无首页活动</div>
              )}
            </div>
          </div>

          <aside className="home-main-col">
            <div className="home-section-head">
              <h3>精选游戏</h3>
            </div>

            <div className="home-featured-grid">
              {featuredGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="home-card"
                >
                  <img src={coverOf(game)} alt={game.name} />
                  <span>{game.name}</span>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        {/* 热门游戏：默认 3 个，查看更多就地展开 */}
        <section className="home-hot">
          <h2>热门游戏</h2>

          <div className="home-hot-list">
            {visibleHot.map((game) => (
              <Link
                key={game.id}
                href={`/game/${game.id}`}
                className="home-hot-row"
              >
                <img src={coverOf(game)} alt={game.name} />

                <div className="home-hot-info">
                  <b>{game.name}</b>
                  <span className="home-hot-author">
                    {game.author || "未知作者"}
                  </span>
                  <p>{game.description || "暂无简介"}</p>
                </div>

                <div className="home-hot-side">
                  <span>上传日期：{formatDate(game.date)}</span>
                  <span>点击量：{game.downloads}</span>
                  <div className="home-hot-tags">
                    {tagList(game.tags).map((tag) => (
                      <em key={tag}>{tag}</em>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {hotGames.length > 3 && (
            <button
              type="button"
              className="home-hot-more"
              onClick={() => setShowAllHot((value) => !value)}
            >
              {showAllHot ? "收起" : "查看更多"}
            </button>
          )}
        </section>
      </div>

      {bannerLightboxOpen && activeBanner && (
        <div
          className="home-banner-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setBannerLightboxOpen(false)}
        >
          <button
            type="button"
            className="home-banner-lightbox-close"
            aria-label="关闭"
            onClick={() => setBannerLightboxOpen(false)}
          >
            <X size={18} />
          </button>

          <img
            src={activeBanner.background || activeBanner.cover || ""}
            alt={activeBanner.title || activeBanner.name || "轮播大图"}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      <FloatingWidget />
    </main>
  );
}
