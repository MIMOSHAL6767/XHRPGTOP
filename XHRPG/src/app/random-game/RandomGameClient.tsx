
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
};

const STORAGE_KEY = "xhrpg_random_game_played_v1";

const COLORS = {
  background: "#10090b",
  panel: "#160c0f",
  line: "#4a2028",
  red: "#8b1e2d",
  hover: "#a52a3a",
  text: "#f8eeee",
  muted: "#bdaeb1",
};

export default function RandomGameClient({ games }: Props) {
  const [playedIds, setPlayedIds] = useState<number[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  // 读取浏览器本地的已玩记录。
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          const validIds = parsed.filter(
            (id): id is number =>
              typeof id === "number" && Number.isFinite(id)
          );

          setPlayedIds(validIds);
        }
      }
    } catch (error) {
      console.error("读取随机游戏记录失败：", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  // 只保存有效的已发布游戏 ID。
  const validPlayedIds = useMemo(() => {
    const publishedIds = new Set(games.map((game) => game.id));

    return playedIds.filter((id) => publishedIds.has(id));
  }, [games, playedIds]);

  const playedSet = useMemo(
    () => new Set(validPlayedIds),
    [validPlayedIds]
  );

  const availableGames = useMemo(
    () => games.filter((game) => !playedSet.has(game.id)),
    [games, playedSet]
  );

  const playedGames = useMemo(
    () => games.filter((game) => playedSet.has(game.id)),
    [games, playedSet]
  );

  function savePlayedIds(ids: number[]) {
    const uniqueIds = Array.from(new Set(ids));

    setPlayedIds(uniqueIds);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueIds));
    } catch (error) {
      console.error("保存随机游戏记录失败：", error);
      setMessage("浏览器无法保存记录，请检查本地存储设置。");
    }
  }

  // 随机抽取一款尚未标记为已玩的游戏。
  function drawGame() {
    if (!loaded) return;

    if (availableGames.length === 0) {
      setCurrentGame(null);
      setMessage(
        games.length === 0
          ? "目前没有已发布的游戏。"
          : "所有游戏都已标记为玩过，可以取消标记后继续抽取。"
      );
      return;
    }

    const randomIndex = Math.floor(
      Math.random() * availableGames.length
    );

    const selected = availableGames[randomIndex];

    setCurrentGame(selected);
    setMessage("抽取完成！记得玩过之后手动标记。");
  }

  // 仅在用户主动点击时，才标记为已玩。
  function markAsPlayed(game: Game) {
    if (playedSet.has(game.id)) return;

    savePlayedIds([...validPlayedIds, game.id]);
    setMessage(`已将「${game.name}」标记为玩过。`);
  }

  // 允许取消已玩状态，重新参与随机抽取。
  function unmarkPlayed(game: Game) {
    savePlayedIds(
      validPlayedIds.filter((id) => id !== game.id)
    );
    setMessage(`已取消「${game.name}」的已玩标记。`);
  }

  function resetPlayed() {
    if (validPlayedIds.length === 0) return;

    const confirmed = window.confirm(
      "确定清空所有已玩记录吗？清空后，所有游戏都可以重新参与抽取。"
    );

    if (!confirmed) return;

    savePlayedIds([]);
    setMessage("已清空本地记录，所有游戏都可以重新抽取。");
  }

  const buttonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 18px",
    border: `1px solid ${COLORS.red}`,
    borderRadius: 0,
    background: COLORS.red,
    color: COLORS.text,
    textDecoration: "none",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: 600,
  } as const;

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: "transparent",
    borderColor: COLORS.line,
  } as const;

  const fallbackCover = (id: number) =>
    `/assets/games/games${id}.png`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: COLORS.background,
        color: COLORS.text,
        padding: "24px 16px 60px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* 顶部导航 */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            borderBottom: `1px solid ${COLORS.line}`,
            paddingBottom: 18,
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                color: COLORS.red,
                fontSize: 12,
                letterSpacing: 3,
                marginBottom: 8,
              }}
            >
              XHRPG RANDOM SELECTOR
            </div>

            <h1
              style={{
                fontSize: 28,
                margin: 0,
                fontWeight: 800,
              }}
            >
              随机抽取游戏
            </h1>
          </div>

          <Link href="/" style={secondaryButtonStyle}>
            返回首页
          </Link>
        </header>

        {/* 统计数据 */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 1,
            background: COLORS.line,
            border: `1px solid ${COLORS.line}`,
            marginBottom: 28,
          }}
        >
          {[
            { label: "已发布游戏", value: games.length },
            { label: "尚未标记已玩", value: availableGames.length },
            { label: "已玩游戏", value: playedGames.length },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "20px 16px",
                background: COLORS.panel,
              }}
            >
              <div
                style={{
                  color: COLORS.muted,
                  fontSize: 13,
                  marginBottom: 10,
                }}
              >
                {item.label}
              </div>

              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: COLORS.text,
                }}
              >
                {loaded ? item.value : "—"}
              </div>
            </div>
          ))}
        </section>

        {/* 随机抽取区域 */}
        <section
          style={{
            border: `1px solid ${COLORS.line}`,
            background: COLORS.panel,
            padding: "clamp(18px, 4vw, 36px)",
            marginBottom: 36,
          }}
        >
          <div
            style={{
              color: COLORS.red,
              fontSize: 12,
              letterSpacing: 2,
              marginBottom: 10,
            }}
          >
            YOUR NEXT ADVENTURE
          </div>

          <h2
            style={{
              fontSize: 22,
              margin: "0 0 10px",
            }}
          >
            今天玩什么？
          </h2>

          <p
            style={{
              color: COLORS.muted,
              lineHeight: 1.8,
              fontSize: 14,
              margin: "0 0 24px",
            }}
          >
            从尚未标记为已玩的游戏中随机选择。
            抽中后不会自动加入已玩记录，由你决定是否标记。
          </p>

          {currentGame ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
                gap: 24,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  border: `1px solid ${COLORS.line}`,
                  background: COLORS.background,
                  overflow: "hidden",
                }}
              >
                <img
                  src={currentGame.cover || fallbackCover(currentGame.id)}
                  alt={currentGame.name}
                  onError={(event) => {
                    const image = event.currentTarget;
                    const fallback = fallbackCover(currentGame.id);

                    if (!image.src.endsWith(fallback)) {
                      image.src = fallback;
                    }
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    aspectRatio: "16 / 9",
                    objectFit: "contain",
                    background: "#080607",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    color: COLORS.red,
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  RANDOM RESULT · #{currentGame.id}
                </div>

                <h3
                  style={{
                    fontSize: 26,
                    lineHeight: 1.4,
                    margin: "0 0 14px",
                    overflowWrap: "anywhere",
                  }}
                >
                  {currentGame.name}
                </h3>

                {currentGame.category && (
                  <div
                    style={{
                      color: COLORS.muted,
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    分类：{currentGame.category}
                  </div>
                )}

                {currentGame.author && (
                  <div
                    style={{
                      color: COLORS.muted,
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    作者：{currentGame.author}
                  </div>
                )}

                {currentGame.version && (
                  <div
                    style={{
                      color: COLORS.muted,
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    版本：{currentGame.version}
                  </div>
                )}

                <p
                  style={{
                    color: COLORS.muted,
                    fontSize: 14,
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    marginBottom: 24,
                  }}
                >
                  {currentGame.description || "暂无游戏简介。"}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <Link
                    href={`/game/${currentGame.id}`}
                    style={buttonStyle}
                  >
                    查看游戏详情
                  </Link>

                  {!playedSet.has(currentGame.id) ? (
                    <button
                      type="button"
                      onClick={() => markAsPlayed(currentGame)}
                      style={secondaryButtonStyle}
                    >
                      标记为已玩
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => unmarkPlayed(currentGame)}
                      style={secondaryButtonStyle}
                    >
                      取消已玩标记
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                border: `1px dashed ${COLORS.line}`,
                padding: "36px 16px",
                textAlign: "center",
                color: COLORS.muted,
                lineHeight: 1.9,
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
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              onClick={drawGame}
              disabled={!loaded || availableGames.length === 0}
              style={{
                ...buttonStyle,
                minWidth: 150,
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

            <span
              style={{
                color: COLORS.muted,
                fontSize: 13,
              }}
            >
              剩余可抽取：{loaded ? availableGames.length : "—"} 款
            </span>
          </div>

          {message && (
            <p
              role="status"
              aria-live="polite"
              style={{
                color: COLORS.muted,
                fontSize: 13,
                lineHeight: 1.7,
                marginTop: 16,
                marginBottom: 0,
              }}
            >
              {message}
            </p>
          )}
        </section>

        {/* 已玩游戏列表 */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 22,
                  margin: "0 0 8px",
                }}
              >
                已玩游戏
              </h2>

              <p
                style={{
                  color: COLORS.muted,
                  fontSize: 13,
                  margin: 0,
                }}
              >
                这里的游戏默认不会再次被抽中。
              </p>
            </div>

            <button
              type="button"
              onClick={resetPlayed}
              disabled={!loaded || validPlayedIds.length === 0}
              style={{
                ...secondaryButtonStyle,
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

          {!loaded ? (
            <p style={{ color: COLORS.muted }}>正在读取记录…</p>
          ) : playedGames.length === 0 ? (
            <div
              style={{
                background: COLORS.panel,
                border: `1px solid ${COLORS.line}`,
                padding: 24,
                color: COLORS.muted,
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              暂无已玩游戏。抽中游戏并实际玩过后，可以点击「标记为已玩」。
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
                gap: 12,
              }}
            >
              {playedGames.map((game) => (
                <article
                  key={game.id}
                  style={{
                    background: COLORS.panel,
                    border: `1px solid ${COLORS.line}`,
                    padding: 18,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      color: COLORS.red,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    已玩 · #{game.id}
                  </div>

                  <h3
                    style={{
                      fontSize: 16,
                      margin: "0 0 16px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {game.name}
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <Link
                      href={`/game/${game.id}`}
                      style={{
                        ...secondaryButtonStyle,
                        minHeight: 36,
                        padding: "7px 12px",
                        fontSize: 12,
                      }}
                    >
                      查看详情
                    </Link>

                    <button
                      type="button"
                      onClick={() => unmarkPlayed(game)}
                      style={{
                        ...secondaryButtonStyle,
                        minHeight: 36,
                        padding: "7px 12px",
                        fontSize: 12,
                      }}
                    >
                      取消标记
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer
          style={{
            borderTop: `1px solid ${COLORS.line}`,
            marginTop: 40,
            paddingTop: 18,
            color: COLORS.muted,
            fontSize: 12,
            lineHeight: 1.8,
          }}
        >
          XHRPG 喜灰RPG资源站 · 随机游戏选择器
          <br />
          已玩记录只保存在当前浏览器，不会修改服务器游戏数据。
        </footer>
      </div>
    </main>
  );
}
