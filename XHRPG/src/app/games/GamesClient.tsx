"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SiteHeader from "@/app/components/SiteHeader";

type GameStatus = "完结" | "更新中" | "Demo" | "弃坑" | "断更";

type GameItem = {
  id: number;
  name: string;
  en: string | null;
  author: string;
  category: string;
  version: string;
  cover: string;
  tags: string[];
  downloads: number;
  createdAt: string;
  gameStatus?: string | null;
};

type Props = {
  games: GameItem[];
  headerImage?: string | null;
};

const RED = "#8b1e2d";
const RED_HOVER = "#a52a3a";
const BG = "#10090b";
const PANEL = "#160c0f";
const LINE = "#4a2028";
const TEXT = "#f8eeee";
const MUTED = "#c9aeb2";
const PAGE_SIZE = 20;

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function normalizeDownloads(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function formatUploadDate(value: string): string {
  if (!value) return "日期未知";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "日期未知";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getStatusLabel(status?: string | null): GameStatus {
  const value = (status ?? "").trim().toLowerCase();

  switch (value) {
    case "完结":
    case "已完结":
    case "已完成":
    case "完成版":
      return "完结";

    case "demo":
    case "试玩":
    case "体验版":
      return "Demo";

    case "弃坑":
    case "已弃坑":
      return "弃坑";

    case "断更":
    case "已断更":
      return "断更";

    case "更新中":
    case "连载":
    case "开发中":
    case "制作中":
      return "更新中";

    default:
      return "更新中";
  }
}

function getStatusColor(status: GameStatus): string {
  switch (status) {
    case "完结":
      return "#287a45";
    case "更新中":
      return "#d97706";
    case "Demo":
      return "#7b2cbf";
    case "弃坑":
      return "#68616a";
    case "断更":
      return "#a83232";
    default:
      return "#d97706";
  }
}

export default function GamesClient({
  games,
  headerImage = null,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [sortOrder, setSortOrder] = useState("default");
  const [urlInitialized, setUrlInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const normalizedGames = useMemo(
    () =>
      games.map((game) => ({
        ...game,
        tags: normalizeTags(game.tags),
        downloads: normalizeDownloads(game.downloads),
        author:
          typeof game.author === "string" ? game.author.trim() : "",
        category:
          typeof game.category === "string" ? game.category.trim() : "",
      })),
    [games]
  );

  const authors = useMemo(() => {
    const counts = new Map<string, number>();

    normalizedGames.forEach((game) => {
      if (game.author) {
        counts.set(
          game.author,
          (counts.get(game.author) ?? 0) + 1
        );
      }
    });

    return Array.from(counts.entries())
      .filter(([, count]) => count > 2)
      .map(([author]) => author)
      .sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [normalizedGames]);

  const allTags = useMemo(
    () =>
      Array.from(
        new Set(normalizedGames.flatMap((game) => game.tags))
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [normalizedGames]
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedGames
            .map((game) => game.category)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [normalizedGames]
  );

  const validSelectedTags = useMemo(
    () => selectedTags.filter((tag) => allTags.includes(tag)),
    [selectedTags, allTags]
  );

  const validSelectedAuthors = useMemo(
    () => selectedAuthors.filter((author) => authors.includes(author)),
    [selectedAuthors, authors]
  );

  useEffect(() => {
    if (urlInitialized) return;

    const params = new URLSearchParams(window.location.search);
    const urlTags = params.getAll("tag");
    const urlCategory = params.get("category");

    setSelectedTags(
      Array.from(
        new Set(
          urlTags
            .map((tag) => tag.trim())
            .filter((tag) => allTags.includes(tag))
        )
      )
    );

    setSelectedCategory(
      urlCategory && categories.includes(urlCategory)
        ? urlCategory
        : "全部"
    );

    setUrlInitialized(true);
  }, [allTags, categories, urlInitialized]);

  useEffect(() => {
    if (!urlInitialized) return;

    function handlePopState() {
      const params = new URLSearchParams(window.location.search);

      setSelectedTags(
        Array.from(
          new Set(
            params
              .getAll("tag")
              .map((tag) => tag.trim())
              .filter((tag) => allTags.includes(tag))
          )
        )
      );

      const category = params.get("category");

      setSelectedCategory(
        category && categories.includes(category)
          ? category
          : "全部"
      );

      setCurrentPage(1);
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [allTags, categories, urlInitialized]);

  useEffect(() => {
    if (!urlInitialized) return;

    const url = new URL(window.location.href);

    url.searchParams.delete("tag");
    url.searchParams.delete("category");

    validSelectedTags.forEach((tag) => {
      url.searchParams.append("tag", tag);
    });

    if (
      selectedCategory !== "全部" &&
      categories.includes(selectedCategory)
    ) {
      url.searchParams.set("category", selectedCategory);
    }

    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (next !== current) {
      window.history.replaceState(null, "", next);
    }
  }, [
    validSelectedTags,
    selectedCategory,
    categories,
    urlInitialized,
  ]);

  const filteredGames = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = normalizedGames.filter((game) => {
      const matchesSearch =
        !keyword ||
        [
          game.name,
          game.en ?? "",
          game.author,
          game.category,
          game.version,
          game.gameStatus ?? "",
          ...game.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesAuthor =
        validSelectedAuthors.length === 0 ||
        validSelectedAuthors.includes(game.author);

      const matchesTags =
        validSelectedTags.length === 0 ||
        validSelectedTags.some((tag) => game.tags.includes(tag));

      const matchesCategory =
        selectedCategory === "全部" ||
        game.category === selectedCategory;

      return (
        matchesSearch &&
        matchesAuthor &&
        matchesTags &&
        matchesCategory
      );
    });

    if (sortOrder === "latest") {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime() ||
          b.id - a.id
      );
    } else if (sortOrder === "downloads") {
      result.sort(
        (a, b) => b.downloads - a.downloads || a.id - b.id
      );
    } else {
      result.sort((a, b) => a.id - b.id);
    }

    return result;
  }, [
    normalizedGames,
    search,
    validSelectedAuthors,
    validSelectedTags,
    selectedCategory,
    sortOrder,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    validSelectedAuthors,
    validSelectedTags,
    selectedCategory,
    sortOrder,
  ]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredGames.length / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, pageCount);

  const pageGames = useMemo(
    () =>
      filteredGames.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
      ),
    [filteredGames, safePage]
  );

  const toggleValue = useCallback(
    (
      value: string,
      selected: string[],
      setSelected: (values: string[]) => void
    ) => {
      setSelected(
        selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value]
      );
    },
    []
  );

  function clearFilters() {
    setSearch("");
    setSelectedAuthors([]);
    setSelectedTags([]);
    setSelectedCategory("全部");
    setSortOrder("default");
    setCurrentPage(1);
  }

  function filterButtonStyle(active: boolean) {
    return {
      border: `1px solid ${active ? RED : LINE}`,
      background: active ? RED : PANEL,
      color: TEXT,
      padding: "8px 13px",
      fontSize: 13,
      cursor: "pointer",
      borderRadius: 0,
      whiteSpace: "nowrap" as const,
      transition:
        "background-color 180ms ease, border-color 180ms ease",
    };
  }

  const sectionStyle = {
    border: `1px solid ${LINE}`,
    background: "rgba(22, 12, 15, 0.78)",
    padding: 16,
    marginBottom: 14,
    borderRadius: 0,
  };

  const labelStyle = {
    fontSize: 14,
    fontWeight: 700 as const,
    color: TEXT,
    marginBottom: 12,
  };

  const pageButtonStyle = (
    active = false,
    disabled = false
  ) => ({
    minWidth: 38,
    height: 38,
    padding: "0 10px",
    border: `1px solid ${active ? RED : LINE}`,
    background: active ? RED : PANEL,
    color: disabled ? "#77575d" : TEXT,
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: 0,
    fontSize: 13,
  });

  const visiblePages: (number | "ellipsis")[] = [];

  const pageNumbers = Array.from(
    { length: pageCount },
    (_, i) => i + 1
  ).filter(
    (page) =>
      page === 1 ||
      page === pageCount ||
      Math.abs(page - safePage) <= 2
  );

  pageNumbers.forEach((page, index) => {
    if (
      index > 0 &&
      page - pageNumbers[index - 1] > 1
    ) {
      visiblePages.push("ellipsis");
    }

    visiblePages.push(page);
  });

  return (
    <main
      className="games-page"
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "transparent",
        color: TEXT,
        margin: 0,
        padding: "0 0 60px",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 1,
        isolation: "isolate",
      }}
    >
      <SiteHeader
        headerImage={headerImage}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <section
        className="games-content"
        style={{
          width: "min(calc(100% - 32px), 1440px)",
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "32px 0 0",
          boxSizing: "border-box",
        }}
      >
        <div className="games-heading">
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.4,
              fontWeight: 800,
            }}
          >
            游戏库
          </h1>

          <p
            style={{
              color: "#d0bfc2",
              fontSize: 14,
              lineHeight: 1.8,
              margin: "8px 0 0",
            }}
          >
            探索游戏、查找作者，发现更多喜灰 RPG 作品。
          </p>
        </div>

        <div style={sectionStyle}>
          <label
            htmlFor="games-search"
            style={{ ...labelStyle, display: "block" }}
          >
            搜索游戏
          </label>

          <input
            id="games-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="输入游戏名、英文名、作者、版本或关键词……"
            style={{
              boxSizing: "border-box",
              width: "100%",
              padding: "12px 14px",
              background: BG,
              color: TEXT,
              border: `1px solid ${LINE}`,
              borderRadius: 0,
              outlineColor: RED,
              fontSize: 14,
            }}
          />
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>游戏分类</div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedCategory("全部")}
              aria-pressed={selectedCategory === "全部"}
              style={filterButtonStyle(selectedCategory === "全部")}
            >
              全部
            </button>

            {categories.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
                style={filterButtonStyle(
                  selectedCategory === category
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <div
            style={{
              ...labelStyle,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>游戏标签</span>
            <span
              style={{
                color: "#bca0a5",
                fontSize: 12,
                fontWeight: 400,
              }}
            >
              可多选 · 满足任意一个已选标签即可
            </span>
          </div>

          {allTags.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {allTags.map((tag) => {
                const active = validSelectedTags.includes(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      toggleValue(
                        tag,
                        validSelectedTags,
                        setSelectedTags
                      )
                    }
                    style={filterButtonStyle(active)}
                  >
                    {active ? "✓ " : ""}
                    {tag}
                  </button>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                color: "#bca0a5",
                fontSize: 13,
                margin: 0,
              }}
            >
              当前已发布游戏还没有可用标签。
            </p>
          )}

          {validSelectedTags.length > 0 && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                fontSize: 12,
                color: "#d5b9bd",
              }}
            >
              <span>当前选中：</span>

              {validSelectedTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "3px 7px",
                    border: `1px solid ${RED}`,
                    color: TEXT,
                    background: "rgba(139, 30, 45, 0.12)",
                  }}
                >
                  {tag}
                </span>
              ))}

              <button
                type="button"
                onClick={() => setSelectedTags([])}
                style={{
                  border: "none",
                  background: "transparent",
                  color: RED_HOVER,
                  cursor: "pointer",
                  padding: "3px 0",
                }}
              >
                清除标签
              </button>
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <div
            style={{
              ...labelStyle,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>游戏作者</span>

            <span
              style={{
                color: "#bca0a5",
                fontSize: 12,
                fontWeight: 400,
              }}
            >
              自动读取数据库 · 可多选
            </span>
          </div>

          {authors.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {authors.map((author) => {
                const active = validSelectedAuthors.includes(author);

                return (
                  <button
                    key={author}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      toggleValue(
                        author,
                        validSelectedAuthors,
                        setSelectedAuthors
                      )
                    }
                    style={filterButtonStyle(active)}
                  >
                    {active ? "✓ " : ""}
                    {author}
                  </button>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                color: "#bca0a5",
                fontSize: 13,
                margin: 0,
              }}
            >
              当前没有可供筛选的作者。
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            margin: "24px 0 16px",
          }}
        >
          <div style={{ fontSize: 15 }}>
            找到{" "}
            <strong style={{ color: RED }}>
              {filteredGames.length}
            </strong>{" "}
            款游戏
            <span
              style={{
                color: "#bca0a5",
                fontSize: 12,
                marginLeft: 8,
              }}
            >
              第 {safePage} / {pageCount} 页
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <select
              aria-label="游戏排序"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              style={{
                padding: "9px 12px",
                background: PANEL,
                color: TEXT,
                border: `1px solid ${LINE}`,
                borderRadius: 0,
                fontSize: 13,
              }}
            >
              <option value="default">默认排序</option>
              <option value="latest">最新上传</option>
              <option value="downloads">点击量优先</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              style={{
                ...filterButtonStyle(false),
                background: "transparent",
              }}
            >
              清空筛选
            </button>
          </div>
        </div>

        {filteredGames.length > 0 ? (
          <>
            <div className="xhrpg-games-grid">
              {pageGames.map((game) => {
                const coverSrc =
                  game.cover || `/assets/games/games${game.id}.png`;

                const statusLabel = getStatusLabel(game.gameStatus);
                const statusColor = getStatusColor(statusLabel);

                return (
                  <Link
                    key={game.id}
                    href={`/game/${game.id}`}
                    className="game-library-card"
                  >
                    <div className="game-library-cover">
                      <img
                        src={coverSrc}
                        alt={game.name}
                        loading="lazy"
                        onError={(event) => {
                          const img = event.currentTarget;
                          const stage =
                            img.dataset.fallbackStage ?? "0";

                          if (stage === "0") {
                            img.dataset.fallbackStage = "1";
                            img.src = `/assets/games/games${game.id}.png`;
                          } else if (stage === "1") {
                            img.dataset.fallbackStage = "2";
                            img.src = `/assets/games/games${game.id}.jpg`;
                          } else {
                            img.style.visibility = "hidden";
                          }
                        }}
                      />

                      <span
                        className="game-status-label"
                        style={{ background: statusColor }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="game-library-info">
                      <div className="game-title-row">
                        <h2
                          title={game.name}
                          className="game-title"
                        >
                          {game.name}
                        </h2>

                        <time
                          dateTime={game.createdAt}
                          title={`上传日期：${formatUploadDate(game.createdAt)}`}
                          className="game-upload-date"
                        >
                          {formatUploadDate(game.createdAt)}
                        </time>
                      </div>

                      <div className="game-author-row">
                        <span
                          title={`作者：${game.author || "未知"}`}
                          className="game-author"
                        >
                          作者：{game.author || "未知"}
                        </span>

                        <span
                          title={`点击量：${game.downloads}`}
                          className="game-downloads"
                        >
                          点击量：{game.downloads.toLocaleString("zh-CN")}
                        </span>
                      </div>

                      <div className="game-meta-row">
                        <div className="game-tags">
                          {game.tags.length > 0 ? (
                            game.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="game-tag">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="game-no-tags">
                              暂无标签
                            </span>
                          )}
                        </div>

                        <span
                          title={game.category || "未分类"}
                          className="game-category"
                        >
                          {game.category || "未分类"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {pageCount > 1 && (
              <nav
                aria-label="游戏库分页"
                className="games-pagination"
              >
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => {
                    setCurrentPage((page) => Math.max(1, page - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={pageButtonStyle(false, safePage === 1)}
                >
                  上一页
                </button>

                {visiblePages.map((page, index) =>
                  page === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      aria-hidden="true"
                      style={{
                        color: MUTED,
                        padding: "0 2px",
                      }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      aria-current={
                        page === safePage ? "page" : undefined
                      }
                      onClick={() => {
                        setCurrentPage(page);
                        window.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        });
                      }}
                      style={pageButtonStyle(page === safePage)}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={safePage === pageCount}
                  onClick={() => {
                    setCurrentPage((page) =>
                      Math.min(pageCount, page + 1)
                    );
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={pageButtonStyle(
                    false,
                    safePage === pageCount
                  )}
                >
                  下一页
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="games-empty">
            <div style={{ fontSize: 18, marginBottom: 10 }}>
              没有找到符合条件的游戏
            </div>

            <div style={{ fontSize: 13, marginBottom: 18 }}>
              试试取消某些作者或标签，或者清空筛选条件。
            </div>

            <button
              type="button"
              onClick={clearFilters}
              style={filterButtonStyle(true)}
            >
              清空筛选
            </button>
          </div>
        )}
      </section>

      <style jsx>{`
        .games-page {
          background: transparent !important;
        }

        .games-content {
          position: relative;
          z-index: 1;
          width: min(calc(100% - 32px), 1440px);
          max-width: 1440px;
          margin-left: auto;
          margin-right: auto;
        }

        .games-heading {
          margin-bottom: 28px;
          padding: 18px 20px;
          background: rgba(16, 9, 11, 0.45);
          border-left: 3px solid ${RED};
          box-sizing: border-box;
        }

        /* 桌面端四列等宽，铺满 1440px 内容区域 */
        .xhrpg-games-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
          width: 100%;
          align-items: stretch;
          box-sizing: border-box;
        }

        .game-library-card {
          display: flex;
          flex-direction: column;
          min-width: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          box-sizing: border-box;
          color: ${TEXT};
          text-decoration: none;
          background: ${PANEL};
          border: 1px solid rgba(74, 32, 40, 0.85);
          border-radius: 0 !important;
          transition:
            border-color 180ms ease,
            background-color 180ms ease;
        }

        .game-library-card:hover {
          border-color: ${RED_HOVER};
          background: ${PANEL};
        }

        /* 封面保持黑底，图片完整展示，不裁切 */
        .game-library-cover {
          position: relative;
          flex: 0 0 auto;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: #000000;
        }

        .game-library-cover img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 180ms ease;
        }

        .game-library-card:hover .game-library-cover img {
          transform: scale(1.015);
        }

        .game-status-label {
          position: absolute;
          top: 0;
          right: 0;
          padding: 7px 11px;
          color: #ffffff;
          border-left: 1px solid rgba(255, 255, 255, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.35);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: 0.3px;
        }

        /* 信息区域使用网站统一的深色面板 */
        .game-library-info {
          flex: 1 1 auto;
          min-width: 0;
          padding: 14px 15px 16px;
          background: ${PANEL};
          border-top: 1px solid ${LINE};
          box-sizing: border-box;
        }

        .game-title-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
          margin-bottom: 8px;
        }

        .game-title {
          min-width: 0;
          flex: 1 1 auto;
          margin: 0;
          font-size: 16px;
          line-height: 1.5;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .game-upload-date {
          flex: 0 0 auto;
          color: #bba4a8;
          font-size: 11px;
          white-space: nowrap;
        }

        .game-author-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          min-width: 0;
          color: #d0bfc2;
          font-size: 12px;
          line-height: 1.8;
        }

        .game-author {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .game-downloads {
          flex: 0 0 auto;
          white-space: nowrap;
          color: #e8d9dc;
          font-size: 11px;
        }

        .game-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-top: 10px;
        }

        .game-tags {
          display: flex;
          flex: 1 1 auto;
          flex-wrap: wrap;
          gap: 5px;
          min-width: 0;
        }

        .game-tag {
          border: 1px solid ${LINE};
          color: #e8d9dc;
          background: rgba(139, 30, 45, 0.12);
          padding: 3px 6px;
          font-size: 10px;
          line-height: 1.4;
          border-radius: 0;
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        .game-no-tags {
          color: #a99296;
          font-size: 10px;
        }

        .game-category {
          flex: 0 1 auto;
          color: #c9b8bb;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 45%;
        }

        .games-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 34px;
        }

        .games-empty {
          padding: 50px 20px;
          text-align: center;
          background: rgba(22, 12, 15, 0.78);
          border: 1px solid rgba(74, 32, 40, 0.85);
          color: ${MUTED};
          border-radius: 0;
        }

        /* 中等屏幕：每行三张卡片 */
        @media (max-width: 1100px) {
          .xhrpg-games-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
          }
        }

        /* 平板及手机：每行两张卡片 */
        @media (max-width: 720px) {
          .games-content {
            width: calc(100% - 24px) !important;
            max-width: 1440px;
            padding-top: 24px !important;
          }

          .games-heading {
            padding: 14px 12px;
          }

          .games-heading h1 {
            font-size: 25px !important;
          }

          .xhrpg-games-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .game-library-info {
            padding: 10px;
          }

          .game-title {
            font-size: 14px;
          }

          .game-upload-date {
            font-size: 10px;
          }

          .game-author-row {
            font-size: 11px;
          }

          .game-downloads {
            font-size: 10px;
          }
        }

        /* 窄屏手机：每行一张，避免信息挤压 */
        @media (max-width: 420px) {
          .xhrpg-games-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
          }

          .game-library-info {
            padding: 12px 13px 14px;
          }

          .game-title {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  );
}
