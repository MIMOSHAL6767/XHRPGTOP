
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SubmissionAssets = {
  cover?: string;
  titleLogo?: string;
  logo?: string;
  detailBackground?: string;
  background?: string;
  screenshots?: string[];
  reviewNote?: string;
  [key: string]: unknown;
};

type GameSubmission = {
  id: number;
  name: string;
  en?: string | null;
  author: string;
  category: string;
  version: string;
  description?: string | null;

  // 游戏资源链接
  cover?: string | null;
  lanzou?: string | null;
  pan123?: string | null;

  // 投稿图片
  titleLogo?: string | null;
  detailBackground?: string | null;
  screenshots?: unknown;

  // 审核信息
  status: string;
  gameStatus?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  submissionAssets?: SubmissionAssets | null;
};

const panelStyle: React.CSSProperties = {
  background: "#160c0f",
  border: "1px solid #4a2028",
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid #6f2934",
  background: "#261116",
  color: "#f8eeee",
  padding: "9px 14px",
  cursor: "pointer",
};

function getAssets(game: GameSubmission): SubmissionAssets {
  const value = game.submissionAssets;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getImageList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        );
      }
    } catch {
      return [value];
    }
  }

  return [];
}

function formatDate(value?: string | Date | null) {
  if (!value) return "暂无记录";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "暂无记录"
    : date.toLocaleString("zh-CN", { hour12: false });
}

export default function SubmissionReviewPage() {
  const [games, setGames] = useState<GameSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  const selected = useMemo(
    () => games.find((game) => game.id === selectedId) ?? null,
    [games, selectedId],
  );

  const loadSubmissions = useCallback(async (keepSelected = true) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/submissions", {
        method: "GET",
        cache: "no-store",
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : `读取投稿失败（HTTP ${response.status}）`;
        throw new Error(message);
      }

      const list = Array.isArray(data)
        ? data
        : data &&
            typeof data === "object" &&
            "submissions" in data &&
            Array.isArray(data.submissions)
          ? data.submissions
          : data &&
              typeof data === "object" &&
              "games" in data &&
              Array.isArray(data.games)
            ? data.games
            : null;

      if (!list) {
        throw new Error("审核 API 返回格式不正确，请检查 /api/admin/submissions。");
      }

      const normalized = list as GameSubmission[];
      setGames(normalized);

      setSelectedId((previous) => {
        if (
          keepSelected &&
          previous !== null &&
          normalized.some((game) => game.id === previous)
        ) {
          return previous;
        }

        return normalized[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取投稿失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubmissions(false);
  }, [loadSubmissions]);

  async function review(action: "approve" | "reject") {
    if (!selected || busy) return;

    if (action === "reject" && !rejectNote.trim()) {
      setError("请填写退回原因。");
      return;
    }

    const confirmed =
      action === "approve"
        ? window.confirm(
            `确定通过「${selected.name}」的投稿吗？通过后会将投稿图片转存到正式图片仓库。`,
          )
        : window.confirm(`确定退回「${selected.name}」的投稿吗？`);

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/admin/submissions/${selected.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "approve"
              ? { action: "approve" }
              : { action: "reject", note: rejectNote.trim() },
          ),
        },
      );

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : `审核失败（HTTP ${response.status}）`;
        throw new Error(message);
      }

      setNotice(
        action === "approve"
          ? `「${selected.name}」已审核通过。`
          : `「${selected.name}」已退回。`,
      );
      setRejectNote("");
      setShowReject(false);

      await loadSubmissions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "审核操作失败");
    } finally {
      setBusy(false);
    }
  }

  const assets = selected ? getAssets(selected) : {};
  const screenshots = selected
    ? [
        ...getImageList(selected.screenshots),
        ...getImageList(assets.screenshots),
      ].filter((url, index, all) => all.indexOf(url) === index)
    : [];

  const cover = selected
    ? assets.cover || selected.cover || ""
    : "";

  const logo = selected
    ? assets.titleLogo || assets.logo || selected.titleLogo || ""
    : "";

  const background = selected
    ? assets.detailBackground ||
      assets.background ||
      selected.detailBackground ||
      ""
    : "";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#10090b",
        color: "#f8eeee",
        padding: "28px 20px 60px",
      }}
    >
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ color: "#c17b84", fontSize: 12, letterSpacing: 3 }}>
              XHRPG ADMINISTRATION
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
              投稿审核
            </h1>
            <p style={{ color: "#bca5a8", marginTop: 8, fontSize: 14 }}>
              审核用户投稿，确认游戏资料与图片后再发布到游戏库。
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/admin" style={{ ...buttonStyle, display: "inline-block", textDecoration: "none" }}>
              返回后台首页
            </Link>
            <button
              type="button"
              style={buttonStyle}
              disabled={loading || busy}
              onClick={() => void loadSubmissions()}
            >
              {loading ? "加载中…" : "刷新列表"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div style={{ ...panelStyle, padding: "14px 18px", minWidth: 180 }}>
            <div style={{ color: "#bca5a8", fontSize: 13 }}>待审核投稿</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
              {loading ? "—" : games.length}
            </div>
          </div>
          <div style={{ ...panelStyle, padding: "14px 18px", flex: 1, minWidth: 220 }}>
            <div style={{ color: "#bca5a8", fontSize: 13 }}>审核提示</div>
            <div style={{ fontSize: 14, marginTop: 8, lineHeight: 1.8 }}>
              通过前请检查游戏信息、封面、详情背景及截图。退回时必须填写原因。
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              border: "1px solid #a63c49",
              background: "#321116",
              color: "#ffc5ca",
              padding: 12,
              marginBottom: 16,
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            style={{
              border: "1px solid #477b5b",
              background: "#10251a",
              color: "#c3f1d0",
              padding: 12,
              marginBottom: 16,
            }}
          >
            {notice}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(280px, 0.85fr) minmax(0, 1.7fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <section style={{ ...panelStyle, minWidth: 0 }}>
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid #4a2028",
                fontWeight: 700,
              }}
            >
              待审核列表
            </div>

            {loading && games.length === 0 ? (
              <div style={{ padding: 24, color: "#bca5a8" }}>
                正在读取投稿…
              </div>
            ) : games.length === 0 ? (
              <div style={{ padding: 28, color: "#bca5a8", lineHeight: 1.8 }}>
                当前没有待审核投稿。
                <br />
                新投稿进入审核状态后会显示在这里。
              </div>
            ) : (
              <div>
                {games.map((game) => {
                  const active = selectedId === game.id;

                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(game.id);
                        setShowReject(false);
                        setRejectNote("");
                        setError("");
                      }}
                      style={{
                        width: "100%",
                        display: "block",
                        textAlign: "left",
                        padding: 16,
                        color: "#f8eeee",
                        background: active ? "#32141b" : "transparent",
                        border: 0,
                        borderBottom: "1px solid #392027",
                        borderLeft: active
                          ? "3px solid #a52a3a"
                          : "3px solid transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <strong style={{ overflowWrap: "anywhere" }}>
                          {game.name || "未命名游戏"}
                        </strong>
                        <span style={{ color: "#d98b96", fontSize: 12 }}>
                          #{game.id}
                        </span>
                      </div>
                      <div
                        style={{
                          color: "#bca5a8",
                          fontSize: 12,
                          marginTop: 9,
                          lineHeight: 1.7,
                        }}
                      >
                        {game.author || "未知作者"} · {game.category || "未分类"}
                        <br />
                        版本：{game.version || "未填写"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ ...panelStyle, minWidth: 0 }}>
            {!selected ? (
              <div style={{ padding: 32, color: "#bca5a8" }}>
                请先从左侧选择一条投稿。
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: 18,
                    borderBottom: "1px solid #4a2028",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ color: "#c17b84", fontSize: 12 }}>
                      投稿编号 #{selected.id}
                    </div>
                    <h2
                      style={{
                        fontSize: 23,
                        fontWeight: 800,
                        marginTop: 6,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {selected.name}
                    </h2>
                  </div>
                  <span
                    style={{
                      border: "1px solid #98616a",
                      color: "#f0c5cb",
                      padding: "5px 9px",
                      fontSize: 12,
                    }}
                  >
                    {selected.status}
                  </span>
                </div>

                <div style={{ padding: 18 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {[
                      ["游戏名称", selected.name],
                      ["英文名称", selected.en || "未填写"],
                      ["作者", selected.author || "未填写"],
                      ["游戏分类", selected.category || "未分类"],
                      ["版本", selected.version || "未填写"],
                      ["游戏进度", selected.gameStatus || "未填写"],
                      ["投稿时间", formatDate(selected.createdAt)],
                      ["最近更新", formatDate(selected.updatedAt)],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          background: "#10090b",
                          border: "1px solid #392027",
                          padding: 12,
                          minWidth: 0,
                        }}
                      >
                        <div style={{ color: "#bca5a8", fontSize: 12 }}>
                          {label}
                        </div>
                        <div
                          style={{
                            marginTop: 7,
                            overflowWrap: "anywhere",
                            lineHeight: 1.6,
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 22 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
                      游戏介绍
                    </h3>
                    <div
                      style={{
                        background: "#10090b",
                        border: "1px solid #392027",
                        padding: 14,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        lineHeight: 1.9,
                        color: "#e5d5d7",
                        minHeight: 80,
                      }}
                    >
                      {selected.description?.trim() || "投稿未填写游戏介绍。"}
                    </div>
                  </div>
                  {/* 游戏下载链接 */}
                  <div style={{ marginTop: 24 }}>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        marginBottom: 12,
                      }}
                    >
                      游戏资源与下载链接
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {[
                        {
                          name: "蓝奏云下载",
                          url: selected.lanzou,
                          description: "投稿人提供的蓝奏云游戏资源",
                        },
                        {
                          name: "123云盘下载",
                          url: selected.pan123,
                          description: "投稿人提供的123云盘游戏资源",
                        },
                      ].map((item) => {
                        const url =
                          typeof item.url === "string"
                            ? item.url.trim()
                            : "";

                        const validUrl = (() => {
                          try {
                            const parsed = new URL(url);
                            return (
                              (parsed.protocol === "https:" ||
                                parsed.protocol === "http:") &&
                              Boolean(parsed.hostname)
                            );
                          } catch {
                            return false;
                          }
                        })();

                        return (
                          <div
                            key={item.name}
                            style={{
                              border: "1px solid #4a2028",
                              background: "#10090b",
                              padding: 16,
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <strong>{item.name}</strong>

                              <span
                                style={{
                                  fontSize: 12,
                                  color: validUrl ? "#a9ddb5" : "#c49a9f",
                                }}
                              >
                                {validUrl ? "已提供" : "未提供"}
                              </span>
                            </div>

                            <p
                              style={{
                                fontSize: 13,
                                color: "#bca5a8",
                                lineHeight: 1.7,
                                marginTop: 8,
                              }}
                            >
                              {item.description}
                            </p>

                            {validUrl ? (
                              <>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#bca5a8",
                                    overflowWrap: "anywhere",
                                    marginTop: 10,
                                    lineHeight: 1.7,
                                  }}
                                >
                                  {url}
                                </div>

                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-block",
                                    marginTop: 12,
                                    padding: "10px 14px",
                                    background: "#8b1e2d",
                                    border: "1px solid #a52a3a",
                                    color: "#fff5f6",
                                    textDecoration: "none",
                                    fontSize: 13,
                                    fontWeight: 700,
                                  }}
                                >
                                  打开下载页面 ↗
                                </a>
                              </>
                            ) : (
                              <div
                                style={{
                                  marginTop: 12,
                                  padding: 10,
                                  border: "1px dashed #4a2028",
                                  color: "#80676b",
                                  fontSize: 13,
                                  lineHeight: 1.7,
                                }}
                              >
                                当前投稿记录没有有效的下载地址。
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                      投稿图片
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 14,
                      }}
                    >
                      {[
                        ["游戏封面", cover],
                        ["标题 Logo", logo],
                        ["详情背景", background],
                      ].map(([label, url]) => (
                        <div key={label} style={{ minWidth: 0 }}>
                          <div style={{ color: "#bca5a8", fontSize: 13, marginBottom: 8 }}>
                            {label}
                          </div>
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#e8a0aa" }}
                            >
                              <img
                                src={url}
                                alt={label}
                                style={{
                                  width: "100%",
                                  maxHeight: 260,
                                  objectFit: "contain",
                                  background: "#0b0708",
                                  border: "1px solid #4a2028",
                                  display: "block",
                                }}
                              />
                              <span
                                style={{
                                  display: "block",
                                  fontSize: 12,
                                  marginTop: 6,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                在新标签页查看原图
                              </span>
                            </a>
                          ) : (
                            <div
                              style={{
                                minHeight: 100,
                                border: "1px dashed #4a2028",
                                display: "grid",
                                placeItems: "center",
                                color: "#80676b",
                                fontSize: 13,
                                padding: 12,
                              }}
                            >
                              未提供
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 20 }}>
                      <div style={{ color: "#bca5a8", fontSize: 13, marginBottom: 10 }}>
                        游戏截图（{screenshots.length} 张）
                      </div>
                      {screenshots.length ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                            gap: 10,
                          }}
                        >
                          {screenshots.map((url, index) => (
                            <a
                              key={`${url}-${index}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={url}
                                alt={`游戏截图 ${index + 1}`}
                                loading="lazy"
                                style={{
                                  width: "100%",
                                  height: 150,
                                  objectFit: "contain",
                                  background: "#0b0708",
                                  border: "1px solid #4a2028",
                                }}
                              />
                              <div style={{ color: "#bca5a8", fontSize: 12, marginTop: 5 }}>
                                截图 {index + 1}
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: "#80676b", fontSize: 13 }}>
                          未检测到截图。
                        </div>
                      )}
                    </div>
                  </div>

                  {assets.reviewNote && (
                    <div
                      style={{
                        marginTop: 18,
                        border: "1px solid #98616a",
                        padding: 12,
                        color: "#f0c5cb",
                      }}
                    >
                      上次审核备注：{assets.reviewNote}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 28,
                      borderTop: "1px solid #4a2028",
                      paddingTop: 18,
                    }}
                  >
                    {showReject && (
                      <div style={{ marginBottom: 14 }}>
                        <label
                          htmlFor="reject-note"
                          style={{
                            display: "block",
                            marginBottom: 8,
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          退回原因（必填）
                        </label>
                        <textarea
                          id="reject-note"
                          value={rejectNote}
                          onChange={(event) => setRejectNote(event.target.value)}
                          placeholder="请说明需要修改的资料、图片问题或其他原因……"
                          rows={4}
                          maxLength={2000}
                          style={{
                            width: "100%",
                            resize: "vertical",
                            background: "#10090b",
                            border: "1px solid #6f2934",
                            color: "#f8eeee",
                            padding: 12,
                            outline: "none",
                          }}
                        />
                        <div style={{ color: "#bca5a8", fontSize: 12, marginTop: 5 }}>
                          {rejectNote.length}/2000
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void review("approve")}
                        style={{
                          ...buttonStyle,
                          background: "#8b1e2d",
                          borderColor: "#a52a3a",
                          fontWeight: 700,
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        {busy ? "正在处理…" : "通过并发布"}
                      </button>

                      {!showReject ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setShowReject(true);
                            setError("");
                          }}
                          style={buttonStyle}
                        >
                          退回投稿
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busy || !rejectNote.trim()}
                            onClick={() => void review("reject")}
                            style={{
                              ...buttonStyle,
                              background: "#321116",
                              borderColor: "#a63c49",
                              opacity: busy || !rejectNote.trim() ? 0.6 : 1,
                            }}
                          >
                            {busy ? "正在处理…" : "确认退回"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setShowReject(false);
                              setRejectNote("");
                            }}
                            style={buttonStyle}
                          >
                            取消
                          </button>
                        </>
                      )}
                    </div>

                    <p style={{ color: "#80676b", fontSize: 12, marginTop: 12, lineHeight: 1.8 }}>
                      审核操作会调用服务端 API。只有 API 返回成功后，页面才会刷新待审核列表。
                    </p>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        <style jsx>{`
          @media (max-width: 800px) {
            main > div > div:last-of-type {
              grid-template-columns: minmax(0, 1fr);
            }
          }
        `}</style>
      </div>
    </main>
  );
}
