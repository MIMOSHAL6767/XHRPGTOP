
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type DetailHistoryItem = {
  version: string;
  date: string;
  lanzou: string;
  pan123: string;
};

type Props = {
  gameId: number;
  name: string;
  author: string;
  category: string;
  version: string;
  description: string;
  cover: string;
  lanzou: string;
  pan123: string;
  history: DetailHistoryItem[];
  titleMode: string;
  titleLogo: string | null;
  detailBackground: string | null;
  detailBackgroundOpacity: number;
  detailBackgroundFit: string;
  screenshots: string[];
  tags?: string[];
};

export default function GameDetailClient({
  gameId,
  name,
  author,
  category,
  version,
  description,
  cover,
  lanzou,
  pan123,
  history,
  titleMode,
  titleLogo,
  detailBackground,
  detailBackgroundOpacity,
  detailBackgroundFit,
  screenshots,
  tags = [],
}: Props) {
  const router = useRouter();

  // 统计访问量：每次组件挂载最多请求一次。
  const viewRequestStarted = useRef(false);

  useEffect(() => {
    if (viewRequestStarted.current) return;
    if (!Number.isSafeInteger(gameId) || gameId <= 0) return;

    viewRequestStarted.current = true;

    void fetch(`/api/games/${gameId}/view`, {
      method: "POST",
      cache: "no-store",
    }).catch((error) => {
      console.error("游戏访问统计请求失败：", error);
    });
  }, [gameId]);

  // 返回上一级页面，保留浏览器历史和原有滚动位置。
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace("/games");
    }
  };

  // 预览图：优先使用截图，避免重复展示封面。
  const previewImages = Array.from(
    new Set(
      screenshots.filter(
        (image) => Boolean(image) && image !== cover
      )
    )
  );

  const gallery =
    previewImages.length > 0
      ? previewImages
      : cover
        ? [cover]
        : [];

  const [activeImage, setActiveImage] = useState(
    gallery[0] || ""
  );

  const [selectedVersion, setSelectedVersion] = useState("-1");

  const selectedHistory =
    selectedVersion === "-1"
      ? null
      : history[Number(selectedVersion)] ?? null;

  const activeLanzou = selectedHistory
    ? selectedHistory.lanzou
    : lanzou;

  const activePan123 = selectedHistory
    ? selectedHistory.pan123
    : pan123;

  const displayVersion = selectedHistory
    ? selectedHistory.version || "历史版本"
    : version;

  const backgroundOpacity = Math.min(
    100,
    Math.max(0, detailBackgroundOpacity)
  );

  const backgroundImage = detailBackground || cover;

  const backgroundFit =
    detailBackgroundFit === "contain" ? "contain" : "cover";

  // 清理标签，去重并忽略空标签。
  const displayTags = Array.from(
    new Set(
      tags
        .filter(
          (tag) =>
            typeof tag === "string" && tag.trim().length > 0
        )
        .map((tag) => tag.trim())
    )
  );

  return (
    <main className="steam-detail-page">
      {/* 页面背景 */}
      <div
        className="steam-detail-background"
        style={{
          backgroundImage: backgroundImage
            ? `url("${backgroundImage}")`
            : "none",
          backgroundSize: backgroundFit,
          opacity: backgroundOpacity / 100,
        }}
      />

      <div className="steam-detail-overlay" />

      {/* 顶部区域 */}
      <header className="steam-detail-topbar">
        <button
          type="button"
          className="steam-back"
          onClick={handleBack}
        >
          ← 返回上一级
        </button>

        <div className="steam-brand">
          {titleMode === "image" && titleLogo ? (
            <img src={titleLogo} alt={name} />
          ) : (
            <span>{name}</span>
          )}
        </div>
      </header>

      {/* 游戏详情 */}
      <div className="steam-detail-layout">
        {/* 左侧：游戏预览图 */}
        <section className="steam-gallery">
          <div className="steam-main-image">
            {activeImage ? (
              <img
                src={activeImage}
                alt={`${name} 预览图`}
              />
            ) : (
              <div className="steam-no-preview">
                暂无预览图片
              </div>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="steam-thumbnails">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={
                    activeImage === image
                      ? "steam-thumbnail active"
                      : "steam-thumbnail"
                  }
                  onClick={() => setActiveImage(image)}
                  aria-label={`切换到第 ${index + 1} 张图片`}
                  aria-pressed={activeImage === image}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 右侧：游戏信息 */}
        <aside className="steam-game-info">
          <h1>{name}</h1>

          <p className="steam-description">
            {description}
          </p>

          <dl className="steam-meta">
            <div>
              <dt>作者</dt>
              <dd>{author || "未详"}</dd>
            </div>

            <div>
              <dt>类型</dt>
              <dd>
                {category ? (
                  <Link
                    href={`/games?category=${encodeURIComponent(category)}`}
                    className="steam-game-tag"
                    title={`在游戏库中查看类型：${category}`}
                  >
                    {category}
                  </Link>
                ) : (
                  "未分类"
                )}
              </dd>
            </div>

            <div>
              <dt>版本</dt>
              <dd>{displayVersion || "最新版"}</dd>
            </div>
          </dl>

          {/* 游戏标签 */}
          {displayTags.length > 0 && (
            <div className="steam-game-tags">
              <div className="steam-game-tags-title">
                游戏标签
              </div>

              <div className="steam-game-tags-list">
                {displayTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/games?tag=${encodeURIComponent(tag)}`}
                    className="steam-game-tag"
                    title={`在游戏库中查看标签：${tag}`}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* 下载区域 */}
      <section className="steam-download-panel">
        <div className="steam-download-heading">
          <strong>
            {selectedHistory ? "其他版本下载" : "下载游戏"}
          </strong>
        </div>

        <div className="steam-download-controls">
          <span className="steam-download-current">
            {selectedHistory
              ? `当前选择：${selectedHistory.version || "其他版本"}`
              : `当前版本：${version || "最新版"}`}
          </span>

          {/* 历史版本选择 */}
          {history.length > 0 && (
            <label className="steam-version-select">
              <span>选择版本</span>

              <select
                value={selectedVersion}
                onChange={(event) =>
                  setSelectedVersion(event.target.value)
                }
              >
                <option value="-1">
                  当前版本（{version || "最新版"}）
                </option>

                {history.map((item, index) => (
                  <option key={index} value={String(index)}>
                    {item.version || `其他版本 ${index + 1}`}
                    {item.date ? ` · ${item.date}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* 下载按钮 */}
          <div className="steam-download-buttons">
            {activeLanzou && (
              <a
                className="steam-download-button"
                href={activeLanzou}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>蓝奏云下载</span>
                <span aria-hidden="true">↗</span>
              </a>
            )}

            {activePan123 && (
              <a
                className="steam-download-button"
                href={activePan123}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>123 云盘下载</span>
                <span aria-hidden="true">↗</span>
              </a>
            )}

            {!activeLanzou && !activePan123 && (
              <p className="steam-no-download">
                当前选择的版本暂未提供下载链接。
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 标签与返回按钮样式 */}
      <style jsx>{`
        .steam-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 9px 14px;
          border: 1px solid #4a2028;
          border-radius: 0;
          background: rgba(22, 12, 15, 0.92);
          color: #f8eeee;
          font: inherit;
          font-size: 13px;
          text-decoration: none;
          cursor: pointer;
          transition:
            background-color 0.15s ease,
            border-color 0.15s ease;
        }

        .steam-back:hover {
          border-color: #a52a3a;
          background: #8b1e2d;
        }

        .steam-game-tags {
          margin-top: 22px;
        }

        .steam-game-tags-title {
          margin-bottom: 10px;
          color: #f8eeee;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .steam-game-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .steam-game-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 11px;
          border: 1px solid #4a2028;
          border-radius: 0;
          background: rgba(22, 12, 15, 0.88);
          color: #f8eeee;
          font-size: 12px;
          line-height: 1.4;
          text-decoration: none;
          transition:
            background-color 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease;
        }

        .steam-game-tag:hover {
          border-color: #a52a3a;
          background: #8b1e2d;
          color: #ffffff;
        }

        .steam-game-tag:focus-visible,
        .steam-back:focus-visible {
          outline: 2px solid #f8eeee;
          outline-offset: 2px;
        }
      `}</style>
    </main>
  );
}
