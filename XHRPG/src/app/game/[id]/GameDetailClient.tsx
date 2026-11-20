"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import SiteHeader from "@/app/components/SiteHeader";
import GiscusComments from "@/app/components/GiscusComments";
import { DEFAULT_REQUIREMENTS } from "@/lib/game-requirements";

export type DetailHistoryItem = {
  version: string;
  date: string;
  lanzou: string;
  pan123: string;
};

export type DetailRecommendation = {
  id: number;
  name: string;
  cover: string;
};

type Props = {
  gameId: number;
  name: string;
  author: string;
  category: string;
  version: string;
  description: string;
  estimatedTime?: string | null;
  engine?: string | null;
  reqOs?: string | null;
  reqCpu?: string | null;
  reqMemory?: string | null;
  reqGpu?: string | null;
  reqRuntime?: string | null;
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
  recommendations?: DetailRecommendation[];
  uploadDate?: string | null;
  downloads?: number;
  ratingCount?: number;
  ratingSum?: number;
};

export default function GameDetailClient({
  gameId,
  name,
  author,
  category,
  version,
  description,
  estimatedTime,
  engine,
  reqOs,
  reqCpu,
  reqMemory,
  reqGpu,
  reqRuntime,
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
  recommendations = [],
  uploadDate,
  downloads = 0,
  ratingCount = 0,
  ratingSum = 0,
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

  const [lightboxOpen, setLightboxOpen] = useState(false);

  // 其他版本超过 3 条时默认折叠，避免拉长页面影响评论区浏览。
  const HISTORY_PREVIEW_COUNT = 3;
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    setHistoryExpanded(false);
  }, [gameId]);

  const visibleHistory = historyExpanded
    ? history
    : history.slice(0, HISTORY_PREVIEW_COUNT);

  // 网盘分享页的压缩包大小（用于在版本号后显示储存空间）。
  const [shareSizes, setShareSizes] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const urls = Array.from(
      new Set(
        [lanzou, pan123]
          .concat(
            history.flatMap((item) => [
              item.lanzou,
              item.pan123,
            ])
          )
          .filter((url) => Boolean(url) && /^https?:\/\//i.test(url))
          .map((url) => url.trim())
      )
    );

    if (!urls.length) return;

    let cancelled = false;

    urls.forEach(async (url) => {
      try {
        const response = await fetch(
          `/api/games/share-size?url=${encodeURIComponent(url)}`,
          { cache: "no-store" }
        );

        if (!response.ok) return;

        const data = await response.json();

        if (
          !cancelled &&
          data?.ok &&
          Number(data.bytes) > 0
        ) {
          setShareSizes((previous) => ({
            ...previous,
            [url]: Number(data.bytes),
          }));
        }
      } catch {
        // 单个链接失败不影响页面。
      }
    });

    return () => {
      cancelled = true;
    };
  }, [lanzou, pan123, history]);

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "";

    const mb = bytes / (1024 * 1024);

    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }

    return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
  };

  const currentSize = formatSize(
    shareSizes[(lanzou || "").trim()] ||
      shareSizes[(pan123 || "").trim()]
  );

  const activeIndex = Math.max(
    0,
    gallery.indexOf(activeImage)
  );

  const backgroundOpacity = Math.min(
    100,
    Math.max(0, detailBackgroundOpacity)
  );

  const pageBackground = detailBackground || cover;

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

  // 日期统一精确到秒。
  const pad2 = (value: number) =>
    String(value).padStart(2, "0");

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return (
      `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
        date.getDate()
      )} ${pad2(date.getHours())}:${pad2(
        date.getMinutes()
      )}:${pad2(date.getSeconds())}`
    );
  };

  // 历史版本的上传日期：缺失时回退到游戏上传时间，保证不出现横杠。
  // 历史版本只显示年月日，不显示时分秒。
  const formatVersionDate = (value?: string | null) => {
    if (!value) return formatDateTime(uploadDate).slice(0, 10);

    const text = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.replace("T", " ").slice(0, 10);
    }

    const formatted = formatDateTime(text);

    return formatted === "—" ? formatted : formatted.slice(0, 10);
  };

  const ratingAverage =
    ratingCount > 0 ? ratingSum / ratingCount : null;

  // Steam 评价档位：按好评率 + 评价数量共同判定。
  const ratingLabel = (() => {
    if (ratingAverage === null) return "暂无评价";

    const percent = (ratingAverage / 5) * 100;

    if (percent >= 95 && ratingCount >= 500) return "好评如潮";
    if (percent >= 80 && ratingCount >= 50) return "特别好评";
    if (percent >= 80) return "好评";
    if (percent >= 70) return "多半好评";
    if (percent >= 40) return "褒贬不一";
    if (percent >= 20) return "多半差评";
    if (ratingCount >= 500) return "差评如潮";
    if (ratingCount >= 50) return "特别差评";
    return "差评";
  })();

  const ratingText = ratingAverage === null ? "暂无评价" : ratingLabel;

  // 灯箱：Esc 关闭，左右键切换。
  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
      } else if (event.key === "ArrowLeft") {
        setActiveImage(
          gallery[
            (activeIndex - 1 + gallery.length) % gallery.length
          ] || activeImage
        );
      } else if (event.key === "ArrowRight") {
        setActiveImage(
          gallery[(activeIndex + 1) % gallery.length] ||
            activeImage
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, activeIndex, gallery, activeImage]);

  const moveLightbox = (delta: number) => {
    if (gallery.length < 2) return;
    setActiveImage(
      gallery[
        (activeIndex + delta + gallery.length) % gallery.length
      ] || activeImage
    );
  };

  return (
    <main className="gd-page">
      {/* 页面背景（沿用详情背景设置，头图区域共用同一背景） */}
      <div
        className="gd-page-bg"
        style={{
          backgroundImage: pageBackground
            ? `url("${pageBackground}")`
            : "none",
          backgroundSize: backgroundFit,
          opacity: backgroundOpacity / 100,
        }}
      />
      <div className="gd-page-shade" />

      <SiteHeader
        headerImage={cover}
        headerImagePosition="center 25%"
        onBack={handleBack}
        backLabel="返回"
      />

      <div className="gd-wrap">
        {/* 信息面板：左侧简介 / 详细信息 / 下载，右侧标签、作者与推荐 */}
        <section className="gd-panel">
          <div className="gd-main">
            <nav className="gd-breadcrumb" aria-label="面包屑导航">
              <Link href="/">首页</Link>
              <ChevronRight size={12} aria-hidden="true" />
              <Link href="/games">游戏库</Link>
              <ChevronRight size={12} aria-hidden="true" />
              <span aria-current="page">{name}</span>
            </nav>

            {/* 游戏标题（与右侧标签同一行）与下一行作者 */}
            <div className="gd-main-head">
              <div className="gd-game-title">
                {titleMode === "image" && titleLogo ? (
                  <img src={titleLogo} alt={name} />
                ) : (
                  <span>{name}</span>
                )}
              </div>

              <div className="gd-author">
                <strong>{author || "未详"}</strong>
              </div>
            </div>

            {/* 缩小后的预览图，放在作者下方、简介上方 */}
            <div className="gd-inline-gallery">
              <button
                type="button"
                className="gd-inline-main"
                onClick={() => {
                  if (activeImage) setLightboxOpen(true);
                }}
                aria-label="查看大图"
              >
                {activeImage ? (
                  <img src={activeImage} alt={`${name} 预览图`} />
                ) : (
                  <span className="gd-no-preview">暂无预览图片</span>
                )}
              </button>

              {gallery.length > 1 && (
                <div className="gd-inline-thumbs">
                  {gallery.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      className={
                        activeImage === image
                          ? "gd-inline-thumb active"
                          : "gd-inline-thumb"
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
            </div>

            <h2 className="gd-heading">简介</h2>

            <p className="gd-description">
              {description || "暂无简介"}
            </p>

            {/* 详细信息、下载与其他版本一起沉到左栏底部 */}
            <div className="gd-lower">
              {/* 系统需求沉底，并与下方类型信息隔开 */}
              <div className="gd-specs gd-specs-lower">
                <h3 className="gd-specs-title">系统需求</h3>

                <div className="gd-spec-grid">
                  {[
                    ["操作系统", reqOs || DEFAULT_REQUIREMENTS.os],
                    ["处理器", reqCpu || DEFAULT_REQUIREMENTS.cpu],
                    ["内存", reqMemory || DEFAULT_REQUIREMENTS.memory],
                    ["显卡", reqGpu || DEFAULT_REQUIREMENTS.gpu],
                    ["运行环境", reqRuntime || DEFAULT_REQUIREMENTS.runtime],
                  ].map(([label, value]) => (
                    <div className="gd-spec-item" key={label}>
                      <span className="gd-spec-key">{label}</span>
                      <span className="gd-spec-value">{value}</span>
                    </div>
                  ))}
                </div>

                <p className="gd-spec-note">
                  以上为通用需求，实际以游戏文件为准。
                </p>
              </div>

              <dl className="gd-info">
                <div className="gd-info-row">
                  <dt>类型</dt>
                  <dd>
                    {category ? (
                      <Link
                        href={`/games?category=${encodeURIComponent(category)}`}
                        className="gd-info-link"
                        title={`在游戏库中查看类型：${category}`}
                      >
                        {category}
                      </Link>
                    ) : (
                      "未分类"
                    )}
                  </dd>
                </div>

                <div className="gd-info-row">
                  <dt>预计时长</dt>
                  <dd>{estimatedTime?.trim() || "半小时"}</dd>
                </div>

                <div className="gd-info-row">
                  <dt>制作引擎</dt>
                  <dd>
                    {engine?.trim() || "RPG Maker VX Ace"}
                  </dd>
                </div>
              </dl>

              <div className="gd-download-area">
                <div className="gd-current-version">
                  当前版本：
                  <strong>{version || "最新版"}</strong>
                  {currentSize ? `（${currentSize}）` : ""}
                </div>

                <div className="gd-download-main-row">
                  {lanzou && (
                    <a
                      className="gd-download-main"
                      href={lanzou}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      蓝奏云下载
                    </a>
                  )}

                  {pan123 && (
                    <a
                      className="gd-download-main"
                      href={pan123}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      123 云盘下载
                    </a>
                  )}

                  {!lanzou && !pan123 && (
                    <p className="gd-no-download">
                      当前版本暂未提供下载链接。
                    </p>
                  )}
                </div>
              </div>

              {history.length > 0 && (
                <div className="gd-history-block">
                  <h3 className="gd-subheading">其他版本</h3>

                  <div className="gd-history-list">
                    {visibleHistory.map((item, index) => {
                      const href = item.lanzou || item.pan123;
                      const size = formatSize(
                        shareSizes[(item.lanzou || "").trim()] ||
                          shareSizes[(item.pan123 || "").trim()]
                      );

                      return (
                        <div
                          key={`${item.version}-${index}`}
                          className="gd-history-row"
                        >
                          <div className="gd-history-info">
                            <b>
                              {item.version ||
                                `其他版本 ${index + 1}`}
                              {size ? `（${size}）` : ""}
                            </b>
                          </div>

                          <div className="gd-history-right">
                            <span className="gd-history-date">
                              上传日期：
                              {formatVersionDate(item.date)}
                            </span>

                            {href ? (
                              <a
                                className="gd-history-btn"
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                下载
                              </a>
                            ) : (
                              <span className="gd-history-btn disabled">
                                无链接
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {history.length > HISTORY_PREVIEW_COUNT && (
                    <button
                      type="button"
                      className="gd-history-toggle"
                      onClick={() =>
                        setHistoryExpanded((value) => !value)
                      }
                      aria-expanded={historyExpanded}
                    >
                      {historyExpanded
                        ? "收起其他版本"
                        : `展开更多（还有 ${
                            history.length - HISTORY_PREVIEW_COUNT
                          } 个）`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="gd-side">
            {displayTags.length > 0 && (
              <div className="gd-tags">
                {displayTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/games?tag=${encodeURIComponent(tag)}`}
                    className="gd-tag"
                    title={`在游戏库中查看标签：${tag}`}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            <dl className="gd-meta">
              <div className="gd-meta-row">
                <dt>上传日期</dt>
                <dd>{formatDateTime(uploadDate)}</dd>
              </div>

              <div className="gd-meta-row">
                <dt>点击量</dt>
                <dd>{downloads.toLocaleString("zh-CN")}</dd>
              </div>

              <div className="gd-meta-row">
                <dt>评价</dt>
                <dd>{ratingText}</dd>
              </div>
            </dl>

            {recommendations.length > 0 && (
              <div className="gd-recommendations">
                <h3 className="gd-subheading">其他推荐</h3>

                <div className="gd-rec-list">
                  {recommendations.map((item) => (
                    <Link
                      key={item.id}
                      href={`/game/${item.id}`}
                      className="gd-rec"
                      title={item.name}
                    >
                      <img src={item.cover} alt={item.name} />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>

        <GiscusComments />
      </div>

      {/* 大图灯箱 */}
      {lightboxOpen && activeImage && (
        <div
          className="gd-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="gd-lightbox-close"
            aria-label="关闭"
            onClick={() => setLightboxOpen(false)}
          >
            <X size={18} />
          </button>

          {gallery.length > 1 && (
            <button
              type="button"
              className="gd-lightbox-nav prev"
              aria-label="上一张"
              onClick={(event) => {
                event.stopPropagation();
                moveLightbox(-1);
              }}
            >
              <ChevronLeft size={34} />
            </button>
          )}

          <img
            src={activeImage}
            alt={`${name} 大图`}
            onClick={(event) => event.stopPropagation()}
          />

          {gallery.length > 1 && (
            <button
              type="button"
              className="gd-lightbox-nav next"
              aria-label="下一张"
              onClick={(event) => {
                event.stopPropagation();
                moveLightbox(1);
              }}
            >
              <ChevronRight size={34} />
            </button>
          )}
        </div>
      )}
    </main>
  );
}
