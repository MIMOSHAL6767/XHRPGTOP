
"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";

type Game = {
  id: number;
  name: string;
  description: string;
  cover: string;
  category: string;
  version: string;
  author: string;
};

type Props = {
  games: Game[];
  headerImage?: string | null;
};

type FilterType = "all" | "unplayed" | "played";

const STORAGE_KEY = "xhrpg_random_game_played_v1";

const C = {
  background: "#10090b",
  panel: "#160c0f",
  line: "#4a2028",
  red: "#8b1e2d",
  hover: "#a52a3a",
  text: "#f8eeee",
  muted: "#bdaeb1",
};

export default function RandomGameClient({
  games,
  headerImage = null,
}: Props) {
  const [playedIds, setPlayedIds] = useState<number[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [keyword, setKeyword] = useState("");

  // 读取之前保存的已玩记录，兼容原有记录。
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setPlayedIds(
            Array.from(
              new Set(
                parsed.filter(
                  (id): id is number =>
                    typeof id === "number" && Number.isFinite(id),
                ),
              ),
            ),
          );
        }
      }
    } catch (error) {
      console.error("读取随机游戏记录失败：", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  const publishedIds = useMemo(
    () => new Set(games.map((game) => game.id)),
    [games],
  );

  const validPlayedIds = useMemo(
    () => playedIds.filter((id) => publishedIds.has(id)),
    [playedIds, publishedIds],
  );

  const playedSet = useMemo(
    () => new Set(validPlayedIds),
    [validPlayedIds],
  );

  const availableGames = useMemo(
    () => games.filter((game) => !playedSet.has(game.id)),
    [games, playedSet],
  );

  const playedGames = useMemo(
    () => games.filter((game) => playedSet.has(game.id)),
    [games, playedSet],
  );

  // 游戏网格：支持状态筛选与名称、编号搜索。
  const visibleGames = useMemo(() => {
    const key = keyword.trim().toLowerCase();

    return games.filter((game) => {
      const isPlayed = playedSet.has(game.id);

      if (filter === "played" && !isPlayed) return false;
      if (filter === "unplayed" && isPlayed) return false;

      if (
        key &&
        !game.name.toLowerCase().includes(key) &&
        !String(game.id).includes(key)
      ) {
        return false;
      }

      return true;
    });
  }, [games, filter, keyword, playedSet]);

  function savePlayedIds(ids: number[]) {
    const uniqueIds = Array.from(
      new Set(ids.filter((id) => publishedIds.has(id))),
    );

    setPlayedIds(uniqueIds);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueIds));
      setMessage("已保存到当前浏览器。");
    } catch (error) {
      console.error("保存随机游戏记录失败：", error);
      setMessage("保存失败，请检查浏览器本地存储设置。");
    }
  }

  function togglePlayed(game: Game) {
    const isPlayed = playedSet.has(game.id);

    if (isPlayed) {
      savePlayedIds(validPlayedIds.filter((id) => id !== game.id));
      setMessage(`已取消「${game.name}」的已玩标记。`);
    } else {
      savePlayedIds([...validPlayedIds, game.id]);
      setMessage(`已将「${game.name}」标记为玩过。`);
    }
  }

  function drawGame() {
    if (!loaded) return;

    if (availableGames.length === 0) {
      setCurrentGame(null);
      setMessage(
        games.length === 0
          ? "目前没有已发布的游戏。"
          : "所有游戏都已标记为玩过，请在下方取消部分标记后再抽取。",
      );
      return;
    }

    // 有多款可抽取游戏时，尽量避免连续抽中同一款。
    const candidates =
      availableGames.length > 1 && currentGame
        ? availableGames.filter((game) => game.id !== currentGame.id)
        : availableGames;

    const selected =
      candidates[Math.floor(Math.random() * candidates.length)];

    setCurrentGame(selected);
    setMessage("抽取完成！游戏不会自动标记为已玩。");
  }

  function resetPlayed() {
    if (validPlayedIds.length === 0) return;

    if (
      !window.confirm(
        "确定清空所有已玩记录吗？所有游戏都将重新参与抽取。",
      )
    ) {
      return;
    }

    savePlayedIds([]);
    setMessage("已清空已玩记录。");
  }

  const buttonStyle: CSSProperties = {
    minHeight: 36,
    padding: "8px 14px",
    border: `1px solid ${C.red}`,
    borderRadius: 0,
    background: C.red,
    color: C.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  };

  const outlineButton: CSSProperties = {
    ...buttonStyle,
    background: "transparent",
    borderColor: C.line,
  };

  function fallbackCover(id: number) {
    return `/assets/games/games${id}.png`;
  }

  function renderCover(game: Game) {
    return (
      <img
        src={game.cover || fallbackCover(game.id)}
        alt={game.name}
        loading="lazy"
        onError={(event) => {
          const img = event.currentTarget;
          const fallback = fallbackCover(game.id);

          if (!img.src.endsWith(fallback)) {
            img.src = fallback;
          }
        }}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "#080607",
        }}
      />
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "transparent",
        color: C.text,
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      {/* 复用首页头图与公共导航，不显示搜索框 */}
      <SiteHeader headerImage={headerImage} hideSearch />

      <div
        style={{
          width: "min(100% - 32px, 1440px)",
          margin: "0 auto",
          padding: "24px 0 48px",
          boxSizing: "border-box",
        }}
      >
        {/* 页面标题 */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            borderBottom: `1px solid ${C.line}`,
            paddingBottom: 18,
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                color: "#e73550",
                fontSize: 11,
                letterSpacing: 3,
                marginBottom: 7,
              }}
            >
              XHRPG RANDOM SELECTOR
            </div>

            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>
              随机抽取游戏
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: C.muted,
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              先在下方标记玩过的游戏，再抽取下一款冒险。
            </p>
          </div>

          <Link href="/" style={outlineButton}>
            返回首页
          </Link>
        </header>

        {/* 游戏统计 */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            border: `1px solid ${C.line}`,
            background: C.line,
            gap: 1,
            marginBottom: 20,
          }}
        >
          {[
            { label: "已发布游戏", value: games.length },
            { label: "可抽取", value: availableGames.length },
            { label: "已玩", value: playedGames.length },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                minWidth: 0,
                background: C.panel,
                padding: "12px 14px",
              }}
            >
              <div style={{ color: C.muted, fontSize: 12 }}>
                {item.label}
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 23,
                  fontWeight: 800,
                }}
              >
                {loaded ? item.value : "—"}
              </div>
            </div>
          ))}
        </section>

        {/* 抽取结果 */}
        <section
          style={{
            border: `1px solid ${C.line}`,
            background: C.panel,
            padding: "clamp(16px, 3vw, 28px)",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              color: "#e73550",
              fontSize: 11,
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            YOUR NEXT ADVENTURE
          </div>

          <h2 style={{ margin: "0 0 8px", fontSize: 21 }}>
            今天玩什么？
          </h2>

          <p
            style={{
              color: C.muted,
              fontSize: 13,
              lineHeight: 1.8,
              margin: "0 0 18px",
            }}
          >
            只从未标记为已玩的游戏中抽取。抽中后不会自动标记；
            你可以在下方游戏列表提前管理已玩状态。
          </p>

          {currentGame ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 220px), 320px))",
                gap: 22,
                alignItems: "start",
              }}
            >
              <Link
                href={`/game/${currentGame.id}`}
                aria-label={`查看${currentGame.name}详情`}
                style={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "16 / 9",
                  border: `1px solid ${C.line}`,
                  overflow: "hidden",
                  background: "#080607",
                }}
              >
                {renderCover(currentGame)}
              </Link>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#e73550",
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  抽取结果 · #{currentGame.id}
                </div>

                <h3
                  style={{
                    fontSize: 24,
                    lineHeight: 1.45,
                    overflowWrap: "anywhere",
                    margin: "0 0 12px",
                  }}
                >
                  {currentGame.name}
                </h3>

                <div
                  style={{
                    color: C.muted,
                    fontSize: 13,
                    lineHeight: 2,
                  }}
                >
                  {currentGame.category && (
                    <div>分类：{currentGame.category}</div>
                  )}

                  {currentGame.author && (
                    <div>作者：{currentGame.author}</div>
                  )}

                  {currentGame.version && (
                    <div>版本：{currentGame.version}</div>
                  )}
                </div>

                <p
                  style={{
                    color: C.muted,
                    fontSize: 13,
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    margin: "12px 0 18px",
                  }}
                >
                  {currentGame.description || "暂无游戏简介。"}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <Link
                    href={`/game/${currentGame.id}`}
                    style={buttonStyle}
                  >
                    查看游戏详情
                  </Link>

                  <button
                    type="button"
                    onClick={() => togglePlayed(currentGame)}
                    style={outlineButton}
                  >
                    {playedSet.has(currentGame.id)
                      ? "取消已玩标记"
                      : "标记为已玩"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "24px 12px",
                textAlign: "center",
                border: `1px dashed ${C.line}`,
                color: C.muted,
                fontSize: 13,
              }}
            >
              {loaded
                ? message || "点击下方按钮，抽取你的下一款游戏。"
                : "正在读取本地游戏记录…"}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={drawGame}
              disabled={!loaded || availableGames.length === 0}
              style={{
                ...buttonStyle,
                minHeight: 42,
                padding: "10px 22px",
                opacity:
                  !loaded || availableGames.length === 0 ? 0.5 : 1,
                cursor:
                  !loaded || availableGames.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {currentGame ? "再抽一款" : "开始随机抽取"}
            </button>

            <span style={{ color: C.muted, fontSize: 12 }}>
              当前剩余 {loaded ? availableGames.length : "—"} 款可抽取
            </span>
          </div>

          {message && (
            <p
              role="status"
              aria-live="polite"
              style={{
                color: C.muted,
                fontSize: 12,
                lineHeight: 1.7,
                margin: "12px 0 0",
              }}
            >
              {message}
            </p>
          )}
        </section>

        {/* 游戏状态管理 */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ fontSize: 21, margin: "0 0 6px" }}>
                游戏状态管理
              </h2>

              <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
                点击封面卡片上的状态按钮，即可提前设置是否玩过。
              </p>
            </div>

            <button
              type="button"
              onClick={resetPlayed}
              disabled={!loaded || validPlayedIds.length === 0}
              style={{
                ...outlineButton,
                opacity:
                  !loaded || validPlayedIds.length === 0 ? 0.5 : 1,
                cursor:
                  !loaded || validPlayedIds.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              清空已玩记录
            </button>
          </div>

          {/* 筛选与搜索 */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {(
              [
                ["all", `全部 (${games.length})`],
                ["unplayed", `未玩 (${availableGames.length})`],
                ["played", `已玩 (${playedGames.length})`],
              ] as [FilterType, string][]
            ).map(([value, label]) => {
              const active = filter === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={active}
                  style={{
                    ...outlineButton,
                    minHeight: 34,
                    padding: "6px 12px",
                    color: active ? "#ffffff" : C.muted,
                    background: active ? C.red : "transparent",
                    borderColor: active ? C.red : C.line,
                  }}
                >
                  {label}
                </button>
              );
            })}

            <input
              type="search"
              aria-label="搜索游戏标题或编号"
              placeholder="搜索游戏标题或编号…"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              style={{
                flex: "1 1 180px",
                minWidth: 0,
                maxWidth: 320,
                height: 34,
                padding: "6px 10px",
                color: C.text,
                background: "#0d080a",
                border: `1px solid ${C.line}`,
                borderRadius: 0,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {!loaded ? (
            <p style={{ color: C.muted, fontSize: 13 }}>
              正在读取本地记录…
            </p>
          ) : visibleGames.length === 0 ? (
            <div
              style={{
                padding: 22,
                background: C.panel,
                border: `1px solid ${C.line}`,
                color: C.muted,
                fontSize: 13,
              }}
            >
              没有符合条件的游戏。
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(112px, 1fr))",
                gap: 10,
              }}
            >
              {visibleGames.map((game) => {
                const isPlayed = playedSet.has(game.id);

                return (
                  <article
                    key={game.id}
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      background: C.panel,
                      border: `1px solid ${isPlayed ? C.red : C.line}`,
                      opacity: isPlayed ? 0.86 : 1,
                    }}
                  >
                    <Link
                      href={`/game/${game.id}`}
                      title={`查看${game.name}详情`}
                      style={{
                        display: "block",
                        position: "relative",
                        width: "100%",
                        aspectRatio: "4 / 3",
                        overflow: "hidden",
                        background: "#080607",
                      }}
                    >
                      {renderCover(game)}

                      {isPlayed && (
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            padding: "4px 6px",
                            background: C.red,
                            color: "#ffffff",
                            fontSize: 10,
                          }}
                        >
                          已玩
                        </span>
                      )}
                    </Link>

                    <div style={{ padding: "8px 8px 9px" }}>
                      <Link
                        href={`/game/${game.id}`}
                        title={game.name}
                        style={{
                          color: C.text,
                          fontSize: 12,
                          lineHeight: 1.5,
                          fontWeight: 600,
                          textDecoration: "none",
                          minHeight: 36,
                          overflowWrap: "anywhere",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        } as CSSProperties}
                      >
                        {game.name}
                      </Link>

                      <button
                        type="button"
                        onClick={() => togglePlayed(game)}
                        aria-pressed={isPlayed}
                        style={{
                          display: "block",
                          width: "100%",
                          minHeight: 29,
                          marginTop: 7,
                          padding: "5px 4px",
                          border: `1px solid ${isPlayed ? C.red : C.line}`,
                          borderRadius: 0,
                          background: isPlayed ? C.red : "transparent",
                          color: C.text,
                          fontSize: 11,
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        {isPlayed ? "✓ 已玩 · 点击取消" : "＋ 标记已玩"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer
          style={{
            borderTop: `1px solid ${C.line}`,
            marginTop: 32,
            paddingTop: 16,
            color: C.muted,
            fontSize: 11,
            lineHeight: 1.8,
          }}
        >
          XHRPG 喜灰RPG资源站 · 随机游戏选择器
          <br />
          已玩记录保存在当前浏览器，不会修改服务器游戏数据。
        </footer>
      </div>
    </main>
  );
}
