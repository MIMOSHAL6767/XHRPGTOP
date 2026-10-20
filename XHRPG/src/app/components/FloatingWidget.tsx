
"use client";

import { useEffect, useRef, useState } from "react";

type Track = {
  id: number;
  title: string;
  url: string;
};

type Config = {
  enabled: boolean;
  gifUrl: string | null;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  musicEnabled: boolean;
  tracks: Track[];
};

const DEFAULT_CONFIG: Config = {
  enabled: false,
  gifUrl: null,
  width: 90,
  height: 90,
  positionX: 24,
  positionY: 120,
  musicEnabled: true,
  tracks: [],
};

export default function FloatingWidget() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [position, setPosition] = useState({ x: 24, y: 120 });
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClick = useRef(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/floating-widget", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("配置读取失败");
        return response.json();
      })
      .then((data: Config) => {
        if (cancelled) return;
        setConfig(data);
        setPosition({
          x: data.positionX,
          y: data.positionY,
        });
      })
      .catch((error) => {
        console.error("悬浮组件初始化失败：", error);
      });

    return () => {
      cancelled = true;
      if (clickTimer.current) clearTimeout(clickTimer.current);
      audioRef.current?.pause();
    };
  }, []);

  function stopMusic() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlaying(false);
  }

  async function playRandomMusic() {
    if (!config.musicEnabled || config.tracks.length === 0) {
      return;
    }

    stopMusic();

    const track =
      config.tracks[Math.floor(Math.random() * config.tracks.length)];

    const audio = new Audio(track.url);
    audioRef.current = audio;

    audio.onended = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlaying(false);
      }
    };

    audio.onerror = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlaying(false);
      }
      console.error("音乐播放失败：", track.title);
    };

    try {
      await audio.play();
      setPlaying(true);
    } catch (error) {
      console.error("浏览器未能播放音乐：", error);
      setPlaying(false);
    }
  }

  function handleClick() {
    const now = Date.now();

    // 两次点击间隔较短时视为双击。
    if (now - lastClick.current < 280) {
      lastClick.current = 0;

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }

      stopMusic();
      window.location.href = "/random-game";
      return;
    }

    lastClick.current = now;

    if (clickTimer.current) clearTimeout(clickTimer.current);

    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;

      if (playing) {
        stopMusic();
      } else {
        void playRandomMusic();
      }
    }, 280);
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;

    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: position.x,
      startY: position.y,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = event.clientX - drag.pointerX;
    const dy = event.clientY - drag.pointerY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      drag.moved = true;
    }

    if (!drag.moved) return;

    setPosition({
      x: Math.max(
        0,
        Math.min(window.innerWidth - config.width, drag.startX - dx)
      ),
      y: Math.max(
        0,
        Math.min(window.innerHeight - config.height, drag.startY - dy)
      ),
    });
  }

  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;

    // 拖动结束不触发点击。
    if (drag?.moved) {
      lastClick.current = Date.now();
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
    }
  }

  if (!config.enabled || !config.gifUrl) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: position.x,
        bottom: position.y,
        zIndex: 9999,
        width: config.width,
        height: config.height,
      }}
    >
      <button
        type="button"
        aria-label="悬浮音乐按钮：单击播放或停止音乐，双击随机抽游戏"
        title={
          playing
            ? "正在播放音乐；单击停止，双击随机抽游戏"
            : "单击播放随机音乐，双击随机抽游戏；可拖动"
        }
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          padding: 0,
          border: "none",
          borderRadius: 0,
          background: "transparent",
          cursor: "grab",
          touchAction: "none",
          position: "relative",
        }}
      >
        <img
          src={config.gifUrl}
          alt="悬浮互动按钮"
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
        {playing && (
          <span
            aria-label="音乐播放中"
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              padding: "2px 5px",
              background: "#8b1e2d",
              color: "#fff",
              fontSize: 11,
              borderRadius: 0,
              pointerEvents: "none",
            }}
          >
            ♪
          </span>
        )}
      </button>
    </div>
  );
}
