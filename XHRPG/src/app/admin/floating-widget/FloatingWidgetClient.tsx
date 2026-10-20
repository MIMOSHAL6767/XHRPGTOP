"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Track = {
  id?: number;
  title: string;
  url: string;
  enabled: boolean;
  sort: number;
};

type Settings = {
  enabled: boolean;
  gifUrl: string;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  musicEnabled: boolean;
  tracks: Track[];
};

const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  gifUrl: "",
  width: 90,
  height: 90,
  positionX: 24,
  positionY: 120,
  musicEnabled: true,
  tracks: [],
};

export default function FloatingWidgetClient() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingGif, setUploadingGif] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/floating-widget", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "读取配置失败");
        }

        if (!cancelled) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
            tracks: Array.isArray(data.tracks)
              ? data.tracks.map((track: Track) => ({
                  id: track.id,
                  title: track.title ?? "",
                  url: track.url ?? "",
                  enabled: track.enabled !== false,
                  sort: Number(track.sort) || 0,
                }))
              : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "读取配置失败"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function uploadFile(
    file: File,
    type: "floatingGif" | "music"
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "上传失败");
    }

    const url =
      data.url ??
      data.fileUrl ??
      data.data?.url ??
      data.data?.fileUrl;

    if (typeof url !== "string" || !url.trim()) {
      throw new Error(
        "上传接口没有返回文件 URL。请检查 /api/upload 的返回格式。"
      );
    }

    return url;
  }

  async function handleGifUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("GIF 文件不能超过 5 MB");
      return;
    }

    if (
      !file.name.toLowerCase().endsWith(".gif") &&
      file.type !== "image/gif"
    ) {
      setError("请选择 GIF 动图文件");
      return;
    }

    setUploadingGif(true);
    setError("");
    setMessage("");

    try {
      const url = await uploadFile(file, "floatingGif");
      update("gifUrl", url);
      setMessage("GIF 上传成功，请点击页面底部的保存设置");
    } catch (err) {
      setError(err instanceof Error ? err.message : "GIF 上传失败");
    } finally {
      setUploadingGif(false);
    }
  }

  async function handleMusicUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    const invalidFile = files.find((file) => {
      const name = file.name.toLowerCase();
      return (
        !/\.(mp3|ogg|wav)$/.test(name) ||
        file.size > 10 * 1024 * 1024
      );
    });

    if (invalidFile) {
      setError(
        `文件「${invalidFile.name}」格式不支持或超过 10 MB。请选择 MP3、OGG 或 WAV 文件。`
      );
      return;
    }

    setUploadingMusic(true);
    setError("");
    setMessage("");

    try {
      const uploadedTracks: Track[] = [];

      for (const file of files) {
        const url = await uploadFile(file, "music");

        uploadedTracks.push({
          title: file.name.replace(/\.(mp3|ogg|wav)$/i, ""),
          url,
          enabled: true,
          sort: settings.tracks.length + uploadedTracks.length,
        });
      }

      setSettings((current) => ({
        ...current,
        tracks: [...current.tracks, ...uploadedTracks],
      }));

      setMessage(`成功上传 ${uploadedTracks.length} 首音乐，请保存设置`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "音乐上传失败");
    } finally {
      setUploadingMusic(false);
    }
  }

  function updateTrack(index: number, patch: Partial<Track>) {
    setSettings((current) => ({
      ...current,
      tracks: current.tracks.map((track, i) =>
        i === index ? { ...track, ...patch } : track
      ),
    }));
  }

  function removeTrack(index: number) {
    setSettings((current) => ({
      ...current,
      tracks: current.tracks
        .filter((_, i) => i !== index)
        .map((track, i) => ({ ...track, sort: i })),
    }));
  }

  function moveTrack(index: number, direction: -1 | 1) {
    setSettings((current) => {
      const next = [...current.tracks];
      const target = index + direction;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [next[target], next[index]];

      return {
        ...current,
        tracks: next.map((track, i) => ({ ...track, sort: i })),
      };
    });
  }

  async function saveSettings() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/floating-widget", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...settings,
          tracks: settings.tracks.map((track, index) => ({
            title: track.title,
            url: track.url,
            enabled: track.enabled,
            sort: index,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "保存失败");
      }

      setMessage(data.message || "保存成功");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <p>正在读取悬浮组件设置……</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 28 }}>
          首页悬浮组件管理
        </h1>
        <p style={{ margin: 0, color: "#bcaeb0" }}>
          管理首页 GIF 按钮、随机音乐以及悬浮位置。
        </p>
      </header>

      {error && (
        <div role="alert" style={errorStyle}>
          {error}
        </div>
      )}

      {message && (
        <div role="status" style={successStyle}>
          {message}
        </div>
      )}

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>基本设置</h2>

        <label style={checkLabelStyle}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => update("enabled", event.target.checked)}
          />
          在首页启用悬浮按钮
        </label>

        <label style={checkLabelStyle}>
          <input
            type="checkbox"
            checked={settings.musicEnabled}
            onChange={(event) =>
              update("musicEnabled", event.target.checked)
            }
          />
          允许悬浮按钮播放音乐
        </label>

        <div style={fieldStyle}>
          <label style={labelStyle}>悬浮 GIF</label>
          <input
            type="file"
            accept="image/gif,.gif"
            onChange={handleGifUpload}
            disabled={uploadingGif}
          />
          <p style={hintStyle}>
            建议使用透明背景 GIF，文件最大 5 MB。
          </p>
          {uploadingGif && <p>正在上传 GIF……</p>}
        </div>

        {settings.gifUrl && (
          <div style={{ marginTop: 12 }}>
            <p style={labelStyle}>当前 GIF 预览</p>
            <div
              style={{
                width: 150,
                height: 150,
                border: "1px solid #4a2028",
                background: "#10090b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={settings.gifUrl}
                alt="悬浮 GIF 预览"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => update("gifUrl", "")}
              style={secondaryButtonStyle}
            >
              移除当前 GIF
            </button>
          </div>
        )}

        <div style={twoColumnStyle}>
          <NumberField
            label="宽度（px）"
            value={settings.width}
            min={30}
            max={500}
            onChange={(value) => update("width", value)}
          />
          <NumberField
            label="高度（px）"
            value={settings.height}
            min={30}
            max={500}
            onChange={(value) => update("height", value)}
          />
          <NumberField
            label="距右侧（px）"
            value={settings.positionX}
            min={0}
            max={3000}
            onChange={(value) => update("positionX", value)}
          />
          <NumberField
            label="距底部（px）"
            value={settings.positionY}
            min={0}
            max={3000}
            onChange={(value) => update("positionY", value)}
          />
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>音乐管理</h2>

        <p style={hintStyle}>
          支持 MP3、OGG、WAV，单个文件最大 10 MB。可一次选择多个文件。
        </p>

        <label style={fieldStyle}>
          <span style={labelStyle}>上传音乐文件</span>
          <input
            type="file"
            accept=".mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav"
            multiple
            onChange={handleMusicUpload}
            disabled={uploadingMusic}
          />
        </label>

        {uploadingMusic && <p>正在上传音乐，请稍候……</p>}

        {settings.tracks.length === 0 ? (
          <p style={hintStyle}>目前没有音乐，请先上传音乐文件。</p>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
            {settings.tracks.map((track, index) => (
              <div key={`${track.id ?? "new"}-${index}`} style={trackStyle}>
                <div style={trackHeaderStyle}>
                  <strong>曲目 {index + 1}</strong>
                  <label style={checkLabelStyle}>
                    <input
                      type="checkbox"
                      checked={track.enabled}
                      onChange={(event) =>
                        updateTrack(index, {
                          enabled: event.target.checked,
                        })
                      }
                    />
                    启用
                  </label>
                </div>

                <label style={fieldStyle}>
                  <span style={labelStyle}>音乐名称</span>
                  <input
                    value={track.title}
                    onChange={(event) =>
                      updateTrack(index, { title: event.target.value })
                    }
                    style={inputStyle}
                    maxLength={150}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>音乐 URL</span>
                  <input
                    value={track.url}
                    onChange={(event) =>
                      updateTrack(index, { url: event.target.value })
                    }
                    style={inputStyle}
                    type="url"
                  />
                </label>

                <audio
                  controls
                  preload="none"
                  src={track.url}
                  style={{ width: "100%", marginTop: 8 }}
                />

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() => moveTrack(index, -1)}
                    disabled={index === 0}
                    style={secondaryButtonStyle}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTrack(index, 1)}
                    disabled={index === settings.tracks.length - 1}
                    style={secondaryButtonStyle}
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTrack(index)}
                    style={dangerButtonStyle}
                  >
                    移除曲目
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>交互说明</h2>
        <ul style={{ lineHeight: 1.9, paddingLeft: 22 }}>
          <li>单击悬浮 GIF：随机播放一首启用的音乐。</li>
          <li>再次单击：停止音乐。</li>
          <li>双击悬浮 GIF：跳转到随机抽游戏页面。</li>
          <li>按住悬浮 GIF 拖动：调整其在当前页面的位置。</li>
          <li>这里设置的初始位置是默认位置；拖动后的实时位置目前不会保存到后台。</li>
        </ul>
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving || uploadingGif || uploadingMusic}
          style={primaryButtonStyle}
        >
          {saving ? "正在保存……" : "保存全部设置"}
        </button>

        <Link href="/" style={secondaryLinkStyle}>
          返回首页
        </Link>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        style={inputStyle}
      />
    </label>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "32px clamp(16px, 4vw, 48px) 64px",
  boxSizing: "border-box",
  background: "#10090b",
  color: "#f8eeee",
};

const panelStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 24,
  background: "#160c0f",
  border: "1px solid #4a2028",
  borderRadius: 0,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: 20,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 16,
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  color: "#e9dadd",
};

const hintStyle: React.CSSProperties = {
  color: "#bcaeb0",
  fontSize: 13,
  lineHeight: 1.7,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "10px 12px",
  color: "#f8eeee",
  background: "#10090b",
  border: "1px solid #4a2028",
  borderRadius: 0,
};

const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: 16,
  marginTop: 12,
};

const checkLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 14,
};

const trackStyle: React.CSSProperties = {
  padding: 16,
  border: "1px solid #4a2028",
  background: "#10090b",
  borderRadius: 0,
  minWidth: 0,
};

const trackHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "12px 22px",
  background: "#8b1e2d",
  color: "#ffffff",
  border: "1px solid #a52a3a",
  borderRadius: 0,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "#211115",
  color: "#f8eeee",
  border: "1px solid #4a2028",
  borderRadius: 0,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  color: "#ff9ba5",
  borderColor: "#8b1e2d",
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "12px 22px",
  background: "#211115",
  color: "#f8eeee",
  border: "1px solid #4a2028",
  textDecoration: "none",
  borderRadius: 0,
};

const errorStyle: React.CSSProperties = {
  padding: 14,
  marginBottom: 16,
  border: "1px solid #b42336",
  background: "#2b0e14",
  color: "#ffb7bf",
  overflowWrap: "anywhere",
};

const successStyle: React.CSSProperties = {
  padding: 14,
  marginBottom: 16,
  border: "1px solid #397552",
  background: "#102219",
  color: "#a8edc1",
  overflowWrap: "anywhere",
};
