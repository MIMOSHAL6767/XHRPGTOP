"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

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

// 拖动超过此距离就不再被识别为点击。
const DRAG_THRESHOLD = 8;

// 双击判定时间。
const DOUBLE_CLICK_DELAY = 280;

export default function FloatingWidget() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [position, setPosition] = useState({ x: 24, y: 120 });
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const dragRef = useRef<{
    pointerId: number;
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClick = useRef(0);

  // 拖动结束后，忽略浏览器可能补发的 click。
  const suppressClickRef = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/floating-widget", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`配置读取失败：HTTP ${response.status}`);
        }
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
      if (suppressTimer.current) clearTimeout(suppressTimer.current);

      audioRef.current?.pause();
      audioRef.current = null;
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
    // 拖动产生的 click 一律忽略。
    if (suppressClickRef.current) {
      suppressClickRef.current = false;

      if (suppressTimer.current) {
        clearTimeout(suppressTimer.current);
        suppressTimer.current = null;
      }

      return;
    }

    // 正在拖动时不处理任何点击。
    if (dragRef.current) return;

    const now = Date.now();

    if (now - lastClick.current < DOUBLE_CLICK_DELAY) {
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

    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
    }

    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;

      if (playing) {
        stopMusic();
      } else {
        void playRandomMusic();
      }
    }, DOUBLE_CLICK_DELAY);
  }

  function onPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    // 鼠标只接受左键；触屏和触控笔正常处理。
    if (event.pointerType === "mouse" && event.button !== 0) return;

    // 新手势开始前清理上次尚未执行的单击。
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: position.x,
      startY: position.y,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.pointerX;
    const dy = event.clientY - drag.pointerY;

    if (
      Math.abs(dx) > DRAG_THRESHOLD ||
      Math.abs(dy) > DRAG_THRESHOLD
    ) {
      drag.moved = true;
    }

    if (!drag.moved) return;

    // 移动一旦发生，立即取消待处理的单击。
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }

    lastClick.current = 0;

    // 当前组件通过 right 和 bottom 定位：
    // 鼠标向右移动时，right 数值应减小。
    setPosition({
      x: Math.max(
        0,
        Math.min(
          window.innerWidth - config.width,
          drag.startX - dx
        )
      ),
      y: Math.max(
        0,
        Math.min(
          window.innerHeight - config.height,
          drag.startY - dy
        )
      ),
    });
  }

  function onPointerUp(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;

    if (drag.moved) {
      // 清除双击记录，防止拖动被算作第二次点击。
      lastClick.current = 0;

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }

      // 忽略拖动结束时浏览器合成的 click。
      suppressClickRef.current = true;

      if (suppressTimer.current) {
        clearTimeout(suppressTimer.current);
      }

      suppressTimer.current = setTimeout(() => {
        suppressClickRef.current = false;
        suppressTimer.current = null;
      }, 400);
    }
  }

  function onLostPointerCapture() {
    // 仅兜底清理状态，不触发点击或跳转。
    dragRef.current = null;
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
        aria-label="悬浮音乐按钮：单击播放或停止音乐，双击随机抽游戏，拖动可调整位置"
        title={
          playing
            ? "正在播放音乐；单击停止，双击随机抽游戏；可拖动"
            : "单击播放随机音乐，双击随机抽游戏；可拖动"
        }
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onLostPointerCapture}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          padding: 0,
          border: "none",
          borderRadius: 0,
          background: "transparent",
          cursor: dragRef.current ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
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
