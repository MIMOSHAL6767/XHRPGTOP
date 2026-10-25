"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "xhrpg_disclaimer_confirmed";

export default function DisclaimerPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) !== "yes") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function confirmDisclaimer() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "yes");
    } catch {
      // 如果浏览器禁止存储，仍然允许关闭弹窗
    }

    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
        background: "rgba(0, 0, 0, 0.82)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="xhrpg-disclaimer-title"
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "85vh",
          overflowY: "auto",
          boxSizing: "border-box",
          background: "#160c0f",
          border: "1px solid #8b1e2d",
          borderRadius: 0,
          color: "#f8eeee",
          boxShadow: "0 16px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* 标题 */}
        <header
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #4a2028",
            textAlign: "center",
          }}
        >
          <h2
            id="xhrpg-disclaimer-title"
            style={{
              margin: 0,
              fontSize: "21px",
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            喜灰RPG资源站 · 免责声明
          </h2>
        </header>

        {/* 正文 */}
        <div
          style={{
            padding: "24px",
            fontSize: "14px",
            lineHeight: 2,
            color: "#d6c6c8",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 20px",
              textAlign: "center",
            }}
          >
            欢迎访问喜灰RPG资源站（XHRPG）。请在继续浏览前阅读以下声明。
          </p>

          <p
            style={{
              margin: "0",
              textAlign: "center",
            }}
          >
            <strong
              style={{
                color: "#f8eeee",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              警告
            </strong>
            <br />
            本网站的游戏可能包含血腥、暴力、猎奇、毁童年等内容，如果您接受不了，请关闭网站。喜灰RPG档案馆（XHRPG Archive）致力于搜集并整理所有曾在网络上公开发布的喜灰RPG并提供下载链接，旨在为所有喜灰RPG爱好者提供最全面，最详细的资源共享平台，保证查找和下载完全免费。注意：大部分游戏不支持手机模拟器游玩
          </p>
        </div>

        {/* 确认按钮 */}
        <footer
          style={{
            padding: "16px 24px 20px",
            borderTop: "1px solid #4a2028",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={confirmDisclaimer}
            style={{
              padding: "11px 24px",
              background: "#8b1e2d",
              border: "1px solid #a52a3a",
              borderRadius: 0,
              color: "#ffffff",
              fontSize: "14px",
              lineHeight: 1.6,
              textAlign: "center",
              cursor: "pointer",
              maxWidth: "100%",
            }}
          >
            无视风险继续访问，出事后我自己负责
          </button>
        </footer>
      </section>
    </div>
  );
}
