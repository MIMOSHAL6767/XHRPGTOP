
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SiteHeader from "@/app/components/SiteHeader";

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
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return 0;
  }

  return Math.floor(numberValue);
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

  const normalizedGames = useMemo(
    () =>
      games.map((game) => ({
        ...game,
        tags: normalizeTags(game.tags),
        downloads: normalizeDownloads(game.downloads),
        author: typeof game.author === "string" ? game.author.trim() : "",
        category:
          typeof game.category === "string" ? game.category.trim() : "",
      })),
    [games]
  );


  const authors = useMemo(() => {
    const authorCounts = new Map<string, number>();

    normalizedGames.forEach((game) => {
      if (game.author) {
        authorCounts.set(
          game.author,
          (authorCounts.get(game.author) ?? 0) + 1
        );
      }
    });

    return Array.from(authorCounts.entries())
      .filter(([, count]) => count > 3)
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
          normalizedGames.map((game) => game.category).filter(Boolean)
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

  // 首次进入游戏库时读取 URL 中的标签和分类
  useEffect(() => {
    if (urlInitialized) return;

    const params = new URLSearchParams(window.location.search);
    const urlTags = params.getAll("tag");
    const urlCategory = params.get("category");

    const matchedTags = Array.from(
      new Set(
        urlTags
          .map((tag) => tag.trim())
          .filter((tag) => allTags.includes(tag))
      )
    );

    setSelectedTags(matchedTags);

    if (urlCategory && categories.includes(urlCategory)) {
      setSelectedCategory(urlCategory);
    } else {
      setSelectedCategory("全部");
    }

    setUrlInitialized(true);
  }, [allTags, categories, urlInitialized]);

  // 监听浏览器前进、后退
  useEffect(() => {
    if (!urlInitialized) return;

    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      const urlTags = params.getAll("tag");
      const urlCategory = params.get("category");

      const matchedTags = Array.from(
        new Set(
          urlTags
            .map((tag) => tag.trim())
            .filter((tag) => allTags.includes(tag))
        )
      );

      setSelectedTags(matchedTags);

      if (urlCategory && categories.includes(urlCategory)) {
        setSelectedCategory(urlCategory);
      } else {
        setSelectedCategory("全部");
      }
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [allTags, categories, urlInitialized]);

  // 将标签和分类筛选同步到 URL
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

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl =
      `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [
    validSelectedTags,
    selectedCategory,
    categories,
    urlInitialized,
  ]);

  // 搜索、作者、标签、分类之间采用 AND；同组多个选项采用 OR
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

  return (
    <main
      style={{
        minHeight: "100vh",

        // 修改：使用透明背景，让全站背景图能够透出
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

        {/* 搜索 */}
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

        {/* 分类筛选 */}
        <div style={sectionStyle}>
          <div style={labelStyle}>游戏分类</div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
                style={filterButtonStyle(selectedCategory === category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 标签筛选 */}
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {allTags.map((tag) => {
                const active = validSelectedTags.includes(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      toggleValue(tag, validSelectedTags, setSelectedTags)
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
            <p style={{ color: "#bca0a5", fontSize: 13, margin: 0 }}>
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

        {/* 作者筛选 */}
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
            <p style={{ color: "#bca0a5", fontSize: 13, margin: 0 }}>
              当前没有可供筛选的作者。
            </p>
          )}
        </div>

        {/* 排序与结果统计 */}
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
            <strong style={{ color: RED }}>{filteredGames.length}</strong>{" "}
            款游戏
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

        {/* 游戏卡片 */}
        {filteredGames.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
              gap: 16,
            }}
          >
            {filteredGames.map((game) => {
              const coverSrc =
                game.cover || `/assets/games/games${game.id}.png`;

              return (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  style={{
                    display: "block",
                    minWidth: 0,
                    textDecoration: "none",
                    color: TEXT,
                    background: PANEL,
                    border: `1px solid ${LINE}`,
                    borderRadius: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "4 / 3",
                      background: "#090507",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={coverSrc}
                      alt={game.name}
                      loading="lazy"
                      onError={(event) => {
                        const img = event.currentTarget;
                        const stage = img.dataset.fallbackStage ?? "0";

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
                  </div>

                  <div style={{ padding: 13 }}>
                    <h2
                      style={{
                        margin: "0 0 10px",
                        fontSize: 16,
                        lineHeight: 1.5,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {game.name}
                    </h2>

                    <div
                      style={{
                        color: "#d5b9bd",
                        fontSize: 12,
                        lineHeight: 1.9,
                      }}
                    >
                      <div>作者：{game.author || "未知"}</div>
                      <div>分类：{game.category || "未分类"}</div>
                      <div>版本：{game.version || "未填写"}</div>
                      <div>点击量：{game.downloads}</div>
                    </div>

                    {game.tags.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 5,
                          marginTop: 10,
                        }}
                      >
                        {game.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            style={{
                              border: `1px solid ${LINE}`,
                              color: "#efb5bf",
                              padding: "3px 6px",
                              fontSize: 11,
                              borderRadius: 0,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
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
