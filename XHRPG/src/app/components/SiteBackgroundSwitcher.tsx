
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type SiteBackground = {
  id: number;
  name: string;
  imageUrl: string;
  overlayOpacity: number;
  blur: number;
};

const STORAGE_KEY = "xhrpg-site-background-settings";

type SavedSettings = {
  backgroundId: number | null;
  overlayOpacity: number;
  blur: number;
};

const DEFAULT_SETTINGS: SavedSettings = {
  backgroundId: null,
  overlayOpacity: 45,
  blur: 0,
};

export default function SiteBackgroundSwitcher() {
  const pathname = usePathname();

  const [backgrounds, setBackgrounds] = useState<SiteBackground[]>([]);
  const [settings, setSettings] =
    useState<SavedSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  const segments = pathname.split("/").filter(Boolean);

  // 游戏详情页保留原有专属背景
  const isGameDetail =
    segments[0] === "game" && segments.length >= 2;

  // 活动详情页只显示全站背景，不显示背景设置控制器
  const isActivityDetail =
    segments[0] === "activities" && segments.length >= 2;

  useEffect(() => {
    let cancelled = false;

    async function loadBackgrounds() {
      try {
        const response = await fetch("/api/site-backgrounds", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (!cancelled && Array.isArray(data.backgrounds)) {
          setBackgrounds(data.backgrounds);
        }
      } catch (error) {
        console.error("读取网站背景失败：", error);
      }
    }

    void loadBackgrounds();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<SavedSettings>;

        setSettings({
          backgroundId:
            typeof parsed.backgroundId === "number"
              ? parsed.backgroundId
              : null,
          overlayOpacity:
            typeof parsed.overlayOpacity === "number"
              ? Math.min(90, Math.max(0, parsed.overlayOpacity))
              : DEFAULT_SETTINGS.overlayOpacity,
          blur:
            typeof parsed.blur === "number"
              ? Math.min(20, Math.max(0, parsed.blur))
              : DEFAULT_SETTINGS.blur,
        });
      }
    } catch (error) {
      console.error("读取背景设置失败：", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("保存背景设置失败：", error);
    }
  }, [settings, loaded]);

  const selectedBackground = backgrounds.find(
    (item) => item.id === settings.backgroundId
  );

  function updateSettings(patch: Partial<SavedSettings>) {
    setSettings((previous) => ({ ...previous, ...patch }));
  }

  // 游戏详情页不显示全站背景，也不显示设置按钮
  if (isGameDetail) return null;

  return (
    <>
      {selectedBackground && (
        <div
          className={`site-background-layer${
            isActivityDetail ? " site-background-layer-activity-header" : ""
          }`}
          aria-hidden="true"
        >
          <div
            className="site-background-image"
            style={{
              backgroundImage: `url("${selectedBackground.imageUrl.replace(/["\\]/g, "")}")`,
              filter: `blur(${settings.blur}px)`,
            }}
          />

          <div
            className="site-background-overlay"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${settings.overlayOpacity / 100})`,
            }}
          />
        </div>
      )}

      {!isActivityDetail && (
        <div className="site-background-controls">
          {open && (
            <section
              className="site-background-panel"
              aria-label="网站背景设置"
            >
              <div className="site-background-panel-heading">
                <strong>网站背景设置</strong>

                <button
                  type="button"
                  className="site-background-close"
                  onClick={() => setOpen(false)}
                  aria-label="关闭背景设置"
                >
                  ×
                </button>
              </div>

              <label className="site-background-label">
                背景图片
                <select
                  value={settings.backgroundId ?? ""}
                  onChange={(event) =>
                    updateSettings({
                      backgroundId: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                >
                  <option value="">使用默认背景</option>

                  {backgrounds.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedBackground && (
                <div className="site-background-preview">
                  <img
                    src={selectedBackground.imageUrl}
                    alt={selectedBackground.name}
                  />
                </div>
              )}

              <label className="site-background-label">
                黑色遮罩：{settings.overlayOpacity}%
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={settings.overlayOpacity}
                  onChange={(event) =>
                    updateSettings({
                      overlayOpacity: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label className="site-background-label">
                背景模糊：{settings.blur}px
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={settings.blur}
                  onChange={(event) =>
                    updateSettings({
                      blur: Number(event.target.value),
                    })
                  }
                />
              </label>

              <button
                type="button"
                className="site-background-reset"
                onClick={() =>
                  updateSettings({
                    backgroundId: null,
                    overlayOpacity: 45,
                    blur: 0,
                  })
                }
              >
                恢复默认设置
              </button>
            </section>
          )}

          <button
            type="button"
            className="site-background-toggle"
            onClick={() => setOpen((previous) => !previous)}
            aria-expanded={open}
          >
            {open ? "关闭背景设置" : "背景设置"}
          </button>
        </div>
      )}
    </>
  );
}
