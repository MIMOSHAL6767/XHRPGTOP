
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

const RED = "#e73550";
const BG = "#10090b";
const PANEL = "#160c0f";
const LINE = "#4a2028";
const TEXT = "#f8eeee";
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
      // 不再把未知状态误判为“完结”
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
    };
  }

  const sectionStyle = {
    border: `1px solid ${LINE}`,
    background: PANEL,
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
      style={{
        minHeight: "100vh",
        background: "transparent",
        color: TEXT,
        padding: "0 0 60px",
        boxSizing: "border-box",
      }}
    >
      <SiteHeader
        headerImage={headerImage}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div
        style={{
          maxWidth: 1272,
          margin: "0 auto",
          padding: "24px 16px 0",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            paddingBottom: 18,
            marginBottom: 22,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 800,
                margin: 0,
              }}
            >
              游戏库
            </h1>

            <p
              style={{
                color: "#c9aeb2",
                fontSize: 13,
                marginTop: 8,
              }}
            >
              探索游戏、查找作者，发现更多喜灰 RPG 作品。
            </p>
          </div>
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
                    background: "rgba(231,53,80,0.12)",
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
                  color: RED,
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
            <div
              className="xhrpg-games-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 20,
                alignItems: "stretch",
              }}
            >
              {pageGames.map((game) => {
                const coverSrc =
                  game.cover || `/assets/games/games${game.id}.png`;

                const statusLabel = getStatusLabel(game.gameStatus);
                const statusColor = getStatusColor(statusLabel);

                return (
                  <Link
                    key={game.id}
                    href={`/game/${game.id}`}
                    style={{
                      display: "block",
                      minWidth: 0,
                      textDecoration: "none",
                      color: TEXT,
                      background: "#a90000",
                      border: `1px solid ${LINE}`,
                      borderRadius: 0,
                      overflow: "hidden",
                      transition: "border-color 150ms ease",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "4 / 3",
                        background: "#ffffff",
                        overflow: "hidden",
                      }}
                    >
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
                        style={{
                          display: "block",
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />

                      <span
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          padding: "7px 11px",
                          color: "#fff",
                          background: statusColor,
                          borderLeft:
                            "1px solid rgba(255,255,255,0.45)",
                          borderBottom:
                            "1px solid rgba(255,255,255,0.45)",
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1.2,
                          letterSpacing: 0.3,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div
                      style={{
                        padding: "12px 13px 14px",
                        background: "#a90000",
                      }}
                    >
                      {/* 游戏名和上传日期同一行 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: 8,
                          minWidth: 0,
                          marginBottom: 7,
                        }}
                      >
                        <h2
                          title={game.name}
                          style={{
                            minWidth: 0,
                            flex: "1 1 auto",
                            margin: 0,
                            fontSize: 16,
                            lineHeight: 1.5,
                            fontWeight: 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {game.name}
                        </h2>

                        <time
                          dateTime={game.createdAt}
                          title={`上传日期：${formatUploadDate(game.createdAt)}`}
                          style={{
                            flex: "0 0 auto",
                            color: "#ffe0e0",
                            fontSize: 11,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatUploadDate(game.createdAt)}
                        </time>
                      </div>

                      {/* 作者和点击量同一行 */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          minWidth: 0,
                          color: "#ffe5e5",
                          fontSize: 12,
                          lineHeight: 1.8,
                        }}
                      >
                        <span
                          title={`作者：${game.author || "未知"}`}
                          style={{
                            flex: "1 1 auto",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          作者：{game.author || "未知"}
                        </span>

                        <span
                          title={`点击量：${game.downloads}`}
                          style={{
                            flex: "0 0 auto",
                            whiteSpace: "nowrap",
                            color: "#ffffff",
                            fontSize: 11,
                          }}
                        >
                          点击量：{game.downloads.toLocaleString("zh-CN")}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                          marginTop: 9,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flex: "1 1 auto",
                            flexWrap: "wrap",
                            gap: 5,
                            minWidth: 0,
                          }}
                        >
                          {game.tags.length > 0 ? (
                            game.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  border:
                                    "1px solid rgba(255,255,255,0.65)",
                                  color: "#fff",
                                  padding: "2px 5px",
                                  fontSize: 10,
                                  lineHeight: 1.4,
                                  borderRadius: 0,
                                  maxWidth: "100%",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span
                              style={{
                                color: "#ffd0d0",
                                fontSize: 10,
                              }}
                            >
                              暂无标签
                            </span>
                          )}
                        </div>

                        <span
                          title={game.category || "未分类"}
                          style={{
                            flex: "0 1 auto",
                            color: "#fff",
                            fontSize: 11,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "45%",
                          }}
                        >
                          {game.category || "未分类"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <style jsx>{`
              @media (max-width: 1000px) {
                .xhrpg-games-grid {
                  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                }
              }

              @media (max-width: 720px) {
                .xhrpg-games-grid {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  gap: 12px !important;
                }
              }

              @media (max-width: 420px) {
                .xhrpg-games-grid {
                  grid-template-columns: minmax(0, 1fr) !important;
                }
              }
            `}</style>

            {pageCount > 1 && (
              <nav
                aria-label="游戏库分页"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 34,
                }}
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
                        color: "#c9aeb2",
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
          <div
            style={{
              padding: "50px 20px",
              textAlign: "center",
              background: PANEL,
              border: `1px solid ${LINE}`,
              color: "#c9aeb2",
              borderRadius: 0,
            }}
          >
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
      </div>
    </main>
  );
}
