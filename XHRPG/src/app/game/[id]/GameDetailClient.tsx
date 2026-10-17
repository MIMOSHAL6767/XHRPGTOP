
"use client";

import { useState } from "react";

export type DetailHistoryItem = {
  version: string;
  date: string;
  lanzou: string;
  pan123: string;
};

type Props = {
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
};

export default function GameDetailClient({
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
}: Props) {
  const gallery = Array.from(
    new Set([cover, ...screenshots].filter(Boolean))
  );

  const [activeImage, setActiveImage] = useState(gallery[0] || cover);
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

  return (
    <main className="steam-detail-page">
      <div
        className="steam-detail-background"
        style={{
          backgroundImage: `url("${backgroundImage}")`,
          backgroundSize: backgroundFit,
          opacity: backgroundOpacity / 100,
        }}
      />

      <div className="steam-detail-overlay" />

      <header className="steam-detail-topbar">
        <a href="/" className="steam-back">
          ← 返回游戏库
        </a>

        <div className="steam-brand">
          {titleMode === "image" && titleLogo ? (
            <img src={titleLogo} alt={name} />
          ) : (
            <span>{name}</span>
          )}
        </div>
      </header>

      <div className="steam-detail-layout">
        <section className="steam-gallery">
          <div className="steam-main-image">
            <img
              src={activeImage}
              alt={`${name} 预览图`}
            />
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

        <aside className="steam-game-info">
          <h1>{name}</h1>

          <p className="steam-description">{description}</p>

          <dl className="steam-meta">
            <div>
              <dt>作者</dt>
              <dd>{author || "未填写"}</dd>
            </div>
            <div>
              <dt>类型</dt>
              <dd>{category || "未分类"}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{displayVersion || "未填写"}</dd>
            </div>
          </dl>

          <section className="steam-download-panel">
            <div className="steam-download-heading">
              <div>
                <strong>
                  {selectedHistory ? "历史版本下载" : "下载游戏"}
                </strong>
                <span>
                  {selectedHistory
                    ? `版本：${selectedHistory.version || "历史版本"}`
                    : `当前版本：${version || "未填写"}`}
                </span>
              </div>

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
                        {item.version || `历史版本 ${index + 1}`}
                        {item.date ? ` · ${item.date}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

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
                  className="steam-download-button secondary"
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
          </section>
        </aside>
      </div>
    </main>
  );
}
