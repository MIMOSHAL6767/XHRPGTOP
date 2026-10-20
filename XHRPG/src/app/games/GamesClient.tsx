
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

export default function GamesClient({
  games,
  headerImage = null,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [sortOrder, setSortOrder] = useState("default");

  // 自动读取已发布游戏的作者，去重后生成按钮
  const authors = useMemo(
    () =>
      Array.from(
        new Set(
          games
            .map((game) => game.author?.trim())
            .filter((author): author is string => Boolean(author))
        )
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [games]
  );

  // 自动读取数据库中实际存在的标签，不预填任何标签
  const allTags = useMemo(
    () =>
      Array.from(
        new Set(
          games.flatMap((game) =>
            Array.isArray(game.tags)
              ? game.tags
                  .filter(
                    (tag) =>
                      typeof tag === "string" &&
                      tag.trim().length > 0
                  )
                  .map((tag) => tag.trim())
              : []
          )
        )
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [games]
  );

  // 分类完全来自数据库，不预填分类
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          games
            .map((game) => game.category?.trim())
            .filter((category): category is string => Boolean(category))
        )
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [games]
  );

  const filteredGames = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = games.filter((game) => {
      const gameTags = Array.isArray(game.tags) ? game.tags : [];

      const matchesSearch =
        !keyword ||
        [
          game.name,
          game.en ?? "",
          game.author,
          game.category,
          game.version,
          ...gameTags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      // 多个作者之间采用 OR
      const matchesAuthor =
        selectedAuthors.length === 0 ||
        selectedAuthors.includes(game.author?.trim() ?? "");

      // 多个标签之间采用 OR
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => gameTags.includes(tag));

      const matchesCategory =
        selectedCategory === "全部" ||
        game.category === selectedCategory;

      // 搜索、作者、标签、分类之间采用 AND
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
      // 暂时沿用 downloads 字段，后续再接入真正的点击统计
      result.sort(
        (a, b) => b.downloads - a.downloads || a.id - b.id
      );
    } else {
      result.sort((a, b) => a.id - b.id);
    }

    return result;
  }, [
    games,
    search,
    selectedAuthors,
    selectedTags,
    selectedCategory,
    sortOrder,
  ]);

  function toggleValue(
    value: string,
    selected: string[],
    setSelected: (values: string[]) => void
  ) {
    setSelected(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  }

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
        background: BG,
        color: TEXT,
        padding: "0 0 60px",
        boxSizing: "border-box",
      }}
    >
      {/* 公共头图、导航栏、搜索和用户信息 */}
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
        {/* 标题区域 */}
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

        {/* 搜索：与顶部公共搜索框使用同一个状态 */}
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
              style={filterButtonStyle(selectedCategory === "全部")}
            >
              全部
            </button>

            {categories.map((category) => (
              <button
                key={category}
                type="button"
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
                const active = selectedTags.includes(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      toggleValue(tag, selectedTags, setSelectedTags)
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
                const active = selectedAuthors.includes(author);

                return (
                  <button
                    key={author}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      toggleValue(
                        author,
                        selectedAuthors,
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
            {filteredGames.map((game) => (
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
                    src={game.cover || `/assets/games/games${game.id}.png`}
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
            ))}
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
