"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SiteHeader from "@/app/components/SiteHeader";

type GameStatus =
  | "完结"
  | "更新中"
  | "Demo"
  | "弃坑"
  | "断更"
  | "预告";

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

    case "预告":
    case "即将发布":
    case "即将推出":
      return "预告";

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
    case "预告":
      return "#2563a6";
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
  const [pageInput, setPageInput] = useState("");

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
        counts.set(game.author, (counts.get(game.author) ?? 0) + 1);
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

    const urlCategory = params.get("category");

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
      setPageInput("");
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
    setPageInput("");
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

  const safePage = Math.min(Math.max(currentPage, 1), pageCount);

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

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
    setPageInput("");
  }

  function goToPage(page: number) {
    if (!Number.isFinite(page)) return;

    const nextPage = Math.max(1, Math.min(Math.trunc(page), pageCount));

    setCurrentPage(nextPage);
    setPageInput("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function submitPageJump() {
    const raw = pageInput.trim();

    if (!raw || !/^\d+$/.test(raw)) return;

    const targetPage = Number(raw);

    if (!Number.isSafeInteger(targetPage)) return;

    goToPage(targetPage);
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
    boxSizing: "border-box" as const,
    minWidth: 0,
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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 38,
    height: 38,
    padding: "0 10px",
    border: `1px solid ${active ? RED : LINE}`,
    background: active ? RED : PANEL,
    color: disabled ? "#77575d" : TEXT,
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: 0,
    fontSize: 13,
    lineHeight: 1,
    boxSizing: "border-box" as const,
    flex: "0 0 auto",
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
          <h1 className="library-page-heading">游戏库</h1>

          <p className="library-page-description">
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

          <div className="library-filter-options">
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
          <div className="library-filter-heading" style={labelStyle}>
            <span>游戏标签</span>
            <span className="library-filter-hint">
              可多选 · 满足任意一个已选标签即可
            </span>
          </div>

          {allTags.length > 0 ? (
            <div className="library-filter-options">
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
            <p className="library-empty-hint">
              当前已发布游戏还没有可用标签。
            </p>
          )}

          {validSelectedTags.length > 0 && (
            <div className="library-selected-tags">
              <span>当前选中：</span>

              {validSelectedTags.map((tag) => (
                <span key={tag} className="library-selected-tag">
                  {tag}
                </span>
              ))}

              <button
                type="button"
                onClick={() => setSelectedTags([])}
                className="library-clear-inline"
              >
                清除标签
              </button>
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <div className="library-filter-heading" style={labelStyle}>
            <span>游戏作者</span>
            <span className="library-filter-hint">
              自动读取数据库 · 可多选
            </span>
          </div>

          {authors.length > 0 ? (
            <div className="library-filter-options">
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
            <p className="library-empty-hint">
              当前没有可供筛选的作者。
            </p>
          )}
        </div>

        <div className="library-results-toolbar">
          <div className="library-results-count">
            找到{" "}
            <strong>{filteredGames.length}</strong>{" "}
            款游戏
            <span>
              第 {safePage} / {pageCount} 页
            </span>
          </div>

          <div className="library-results-actions">
            <select
              aria-label="游戏排序"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="library-sort-select"
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
                    className="library-game-card"
                  >
                    <div className="library-game-cover">
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
                        className="library-game-status"
                        style={{ background: statusColor }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="library-game-info">
                      <div className="library-game-title-row">
                        <h2
                          title={game.name}
                          className="library-game-title"
                        >
                          {game.name || "未命名游戏"}
                        </h2>

                        <time
                          dateTime={game.createdAt}
                          title={`上传日期：${formatUploadDate(game.createdAt)}`}
                          className="library-game-upload-date"
                        >
                          {formatUploadDate(game.createdAt)}
                        </time>
                      </div>

                      <div className="library-game-author-row">
                        <span
                          title={`作者：${game.author || "未知"}`}
                          className="library-game-author"
                        >
                          作者：{game.author || "未知"}
                        </span>

                        <span
                          title={`点击量：${game.downloads}`}
                          className="library-game-downloads"
                        >
                          点击量：
                          {game.downloads.toLocaleString("zh-CN")}
                        </span>
                      </div>

                      <div className="library-game-meta-row">
                        <div className="library-game-tags">
                          {game.tags.length > 0 ? (
                            game.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="library-game-tag"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="library-game-no-tags">
                              暂无标签
                            </span>
                          )}
                        </div>

                        <span
                          title={game.category || "未分类"}
                          className="library-game-category"
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
                className="library-games-pagination"
              >
                <div className="library-pagination-pages">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => goToPage(safePage - 1)}
                    style={pageButtonStyle(false, safePage === 1)}
                  >
                    上一页
                  </button>

                  {visiblePages.map((page, index) =>
                    page === "ellipsis" ? (
                      <span
                        key={`ellipsis-${index}`}
                        aria-hidden="true"
                        className="library-pagination-ellipsis"
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
                        onClick={() => goToPage(page)}
                        style={pageButtonStyle(page === safePage)}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    disabled={safePage === pageCount}
                    onClick={() => goToPage(safePage + 1)}
                    style={pageButtonStyle(
                      false,
                      safePage === pageCount
                    )}
                  >
                    下一页
                  </button>
                </div>

                <form
                  className="library-page-jump"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitPageJump();
                  }}
                >
                  <label htmlFor="library-page-number">
                    跳转到
                  </label>

                  <input
                    id="library-page-number"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={pageCount}
                    step={1}
                    value={pageInput}
                    onChange={(event) =>
                      setPageInput(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setPageInput("");
                      }
                    }}
                    placeholder="页码"
                    aria-label={`输入页码，范围为 1 到 ${pageCount}`}
                    className="library-page-number-input"
                  />

                  <span className="library-page-total">
                    / {pageCount} 页
                  </span>

                  <button
                    type="submit"
                    className="library-page-jump-button"
                  >
                    跳转
                  </button>
                </form>
              </nav>
            )}
          </>
        ) : (
          <div className="library-games-empty">
            <div className="library-games-empty-title">
              没有找到符合条件的游戏
            </div>

            <div className="library-games-empty-description">
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
          width: 100%;
          min-height: 100vh;
          margin: 0;
          padding: 0 0 60px;
          color: ${TEXT};
          background: transparent !important;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
          isolation: isolate;
        }

        .games-content {
          position: relative;
          z-index: 1;
          width: min(calc(100% - 32px), 1440px);
          max-width: 1440px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .games-heading {
          display: block;
          margin-bottom: 28px;
          padding: 18px 20px;
          background: rgba(16, 9, 11, 0.45);
          border-left: 3px solid ${RED};
          box-sizing: border-box;
        }

        .library-page-heading {
          position: static !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          margin: 0 !important;
          padding: 0 !important;
          color: ${TEXT} !important;
          font-size: 30px !important;
          font-weight: 800 !important;
          line-height: 1.4 !important;
          white-space: normal !important;
          transform: none !important;
        }

        .library-page-description {
          display: block;
          margin: 8px 0 0;
          color: #d0bfc2;
          font-size: 14px;
          line-height: 1.8;
        }

        .library-filter-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }

        .library-filter-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .library-filter-hint {
          color: #bca0a5;
          font-size: 12px;
          font-weight: 400;
        }

        .library-empty-hint {
          margin: 0;
          color: #bca0a5;
          font-size: 13px;
        }

        .library-selected-tags {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
          color: #d5b9bd;
          font-size: 12px;
        }

        .library-selected-tag {
          padding: 3px 7px;
          border: 1px solid ${RED};
          color: ${TEXT};
          background: rgba(139, 30, 45, 0.12);
        }

        .library-clear-inline {
          padding: 3px 0;
          border: none;
          background: transparent;
          color: ${RED_HOVER};
          cursor: pointer;
        }

        .library-results-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin: 24px 0 16px;
          min-width: 0;
        }

        .library-results-count {
          color: ${TEXT};
          font-size: 15px;
        }

        .library-results-count strong {
          color: ${RED};
        }

        .library-results-count span {
          margin-left: 8px;
          color: #bca0a5;
          font-size: 12px;
        }

        .library-results-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .library-sort-select {
          max-width: 100%;
          padding: 9px 12px;
          background: ${PANEL};
          color: ${TEXT};
          border: 1px solid ${LINE};
          border-radius: 0 !important;
          font-size: 13px;
          box-sizing: border-box;
        }

        .xhrpg-games-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: stretch;
          gap: 20px;
          width: 100%;
          min-width: 0;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .library-game-card {
          position: relative;
          display: flex !important;
          flex-direction: column;
          align-self: stretch;
          min-width: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          box-sizing: border-box;
          color: ${TEXT} !important;
          text-decoration: none !important;
          background: ${PANEL};
          border: 1px solid rgba(74, 32, 40, 0.85);
          border-radius: 0 !important;
          box-shadow: none;
          transform: none;
          transition:
            border-color 180ms ease,
            background-color 180ms ease;
        }

        .library-game-card:hover {
          color: ${TEXT} !important;
          border-color: ${RED_HOVER};
          background: ${PANEL};
          text-decoration: none !important;
        }

        .library-game-cover {
          position: relative;
          display: block;
          flex: 0 0 auto;
          width: 100%;
          aspect-ratio: 4 / 3;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #000;
          box-sizing: border-box;
        }

        .library-game-cover img {
          position: static !important;
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
          margin: 0 !important;
          padding: 0 !important;

          /* 自动放大图片并铺满封面区域 */
          object-fit: cover !important;
          object-position: center;

          visibility: visible;
          opacity: 1;
          transform: none;
          border: 0;
          border-radius: 0 !important;
          box-shadow: none;
          transition: transform 180ms ease;
       }

        /* 鼠标悬停时轻微放大 */
       .library-game-card:hover .library-game-cover img {
         transform: scale(1.04);
        }

       .library-game-card:hover .library-game-cover img {
         transform: scale(1.015);
        }

        .library-game-status {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 2;
          display: block;
          padding: 7px 11px;
          color: #fff;
          border-left: 1px solid rgba(255, 255, 255, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.35);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: 0.3px;
        }

        .library-game-info {
          position: relative;
          display: block;
          flex: 1 1 auto;
          min-width: 0;
          margin: 0;
          padding: 14px 15px 16px;
          color: ${TEXT};
          background: ${PANEL};
          border-top: 1px solid ${LINE};
          box-sizing: border-box;
        }

        .library-game-title-row {
          position: static;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
          margin: 0 0 8px;
          padding: 0;
        }

        .library-game-title {
          position: static !important;
          inset: auto !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          float: none !important;
          flex: 1 1 auto;
          min-width: 0;
          max-width: 100%;
          margin: 0 !important;
          padding: 0 !important;
          color: ${TEXT} !important;
          background: transparent !important;
          font-family: inherit;
          font-size: 16px !important;
          font-weight: 700 !important;
          line-height: 1.5 !important;
          text-align: left !important;
          text-decoration: none !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          word-break: normal;
          overflow-wrap: normal;
          transform: none !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        .library-game-upload-date {
          position: static !important;
          display: block;
          flex: 0 0 auto;
          margin: 0;
          padding: 0;
          color: #bba4a8;
          font-size: 11px;
          line-height: 1.5;
          white-space: nowrap;
        }

        .library-game-author-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          min-width: 0;
          color: #d0bfc2;
          font-size: 12px;
          line-height: 1.8;
        }

        .library-game-author {
          display: block;
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .library-game-downloads {
          display: block;
          flex: 0 0 auto;
          color: #e8d9dc;
          font-size: 11px;
          white-space: nowrap;
        }

        .library-game-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          min-width: 0;
          margin-top: 10px;
        }

        .library-game-tags {
          display: flex;
          flex: 1 1 auto;
          flex-wrap: wrap;
          gap: 5px;
          min-width: 0;
        }

        .library-game-tag {
          display: inline-block;
          max-width: 100%;
          padding: 3px 6px;
          color: #e8d9dc;
          background: rgba(139, 30, 45, 0.12);
          border: 1px solid ${LINE};
          border-radius: 0 !important;
          font-size: 10px;
          line-height: 1.4;
          overflow-wrap: anywhere;
          box-sizing: border-box;
        }

        .library-game-no-tags {
          color: #a99296;
          font-size: 10px;
        }

        .library-game-category {
          display: block;
          flex: 0 1 auto;
          max-width: 45%;
          color: #c9b8bb;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .library-games-pagination {
          position: relative !important;
          z-index: 2;
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 14px;
          width: 100%;
          margin: 34px 0 0 !important;
          padding: 0 !important;
          overflow: visible;
          box-sizing: border-box;
          background: transparent;
          border: 0;
          border-radius: 0 !important;
          box-shadow: none;
        }

        .library-pagination-pages {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          width: 100%;
          min-width: 0;
        }

        .library-pagination-pages button {
          position: static !important;
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin: 0;
          border-radius: 0 !important;
          transform: none !important;
          white-space: nowrap;
        }

        .library-pagination-pages button:disabled {
          opacity: 0.55 !important;
        }

        .library-pagination-ellipsis {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 12px;
          color: ${MUTED};
          padding: 0 2px;
        }

        /* 页码输入和跳转按钮 */
        .library-page-jump {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          width: 100%;
          margin: 0;
          padding: 12px;
          box-sizing: border-box;
          background: rgba(22, 12, 15, 0.78);
          border: 1px solid ${LINE};
          border-radius: 0 !important;
        }

        .library-page-jump label {
          color: ${TEXT};
          font-size: 13px;
          white-space: nowrap;
        }

        .library-page-number-input {
          display: block;
          width: 84px;
          height: 36px;
          min-width: 0;
          margin: 0;
          padding: 0 9px;
          box-sizing: border-box;
          color: ${TEXT};
          background: ${BG};
          border: 1px solid ${LINE};
          border-radius: 0 !important;
          outline-color: ${RED};
          font-size: 13px;
          text-align: center;
        }

        .library-page-number-input:focus {
          border-color: ${RED};
        }

        .library-page-total {
          color: ${MUTED};
          font-size: 12px;
          white-space: nowrap;
        }

        .library-page-jump-button {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          min-width: 64px;
          height: 36px;
          margin: 0;
          padding: 0 16px;
          box-sizing: border-box;
          color: #fff;
          background: ${RED};
          border: 1px solid ${RED};
          border-radius: 0 !important;
          font-size: 13px;
          cursor: pointer;
          transition:
            background-color 180ms ease,
            border-color 180ms ease;
        }

        .library-page-jump-button:hover {
          background: ${RED_HOVER};
          border-color: ${RED_HOVER};
        }

        .library-games-empty {
          display: block;
          padding: 50px 20px;
          text-align: center;
          color: ${MUTED};
          background: rgba(22, 12, 15, 0.78);
          border: 1px solid rgba(74, 32, 40, 0.85);
          border-radius: 0 !important;
        }

        .library-games-empty-title {
          margin-bottom: 10px;
          color: ${TEXT};
          font-size: 18px;
        }

        .library-games-empty-description {
          margin-bottom: 18px;
          font-size: 13px;
        }

        @media (max-width: 1100px) {
          .xhrpg-games-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
          }
        }

        @media (max-width: 720px) {
          .games-content {
            width: calc(100% - 24px) !important;
            max-width: 1440px;
            padding-top: 24px !important;
          }

          .games-heading {
            padding: 14px 12px;
          }

          .library-page-heading {
            font-size: 25px !important;
          }

          .xhrpg-games-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .library-game-info {
            padding: 10px;
          }

          .library-game-title {
            font-size: 14px !important;
          }

          .library-game-upload-date {
            font-size: 10px;
          }

          .library-game-author-row {
            font-size: 11px;
          }

          .library-game-downloads {
            font-size: 10px;
          }

          .library-results-toolbar {
            align-items: flex-start;
          }

          .library-results-actions {
            width: 100%;
          }

          .library-games-pagination {
            gap: 12px;
            margin-top: 26px !important;
          }

          .library-pagination-pages {
            gap: 6px;
          }

          .library-pagination-pages button {
            min-width: 34px;
            height: 36px;
            padding: 0 8px;
          }

          .library-page-jump {
            gap: 7px;
            padding: 10px 8px;
          }

          .library-page-number-input {
            width: 76px;
          }
        }

        @media (max-width: 420px) {
          .xhrpg-games-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
          }

          .library-game-info {
            padding: 12px 13px 14px;
          }

          .library-game-title {
            font-size: 16px !important;
          }

          .library-game-title-row {
            gap: 6px;
          }

          .library-game-upload-date {
            font-size: 10px;
          }

          .library-pagination-pages {
            gap: 5px;
          }

          .library-pagination-pages button {
            min-width: 32px;
            height: 34px;
            padding: 0 7px;
            font-size: 12px;
          }
        }
      `}</style>
    </main>
  );
}
