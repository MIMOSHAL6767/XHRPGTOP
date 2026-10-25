"use client";

import { useState } from "react";

const linkStyle: React.CSSProperties = {
  color: "#c9b9bb",
  textDecoration: "none",
  fontSize: "14px",
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
};

const footerContents: Record<string, { title: string; content: string }> = {
  about: {
    title: "关于本站",
    content:
      "喜灰RPG档案馆（XHRPG Archive）致力于搜集并整理所有曾在网络上公开发布的喜灰RPG并提供下载链接，旨在为所有喜灰RPG爱好者提供最全面，最详细的资源共享平台，保证查找和下载完全免费。注意：大部分游戏不支持手机模拟器游玩。",
  },
  contact: {
    title: "联系站长",
    content:
      "如果你发现本站存在错误信息、失效链接或其他问题，请反馈到3899256013@qq.com，或添加站长QQ：3899256013",
  },
  friends: {
    title: "友情链接",
    content:"羊村大崩坏完结篇吧：https://tieba.baidu.com/f?kw=羊村大崩坏完结篇",
  },
  disclaimer: {
    title: "免责声明",
    content:
      "本站主要提供同人游戏信息整理与资源索引。相关游戏、角色、美术素材及其他内容的版权归各自的原作者或权利人所有。如相关权利人认为本站内容侵犯其合法权益，请联系站长处理。",
  },
};

export default function Footer() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const activeContent = activeModal
    ? footerContents[activeModal]
    : null;

  return (
    <>
      <footer
        style={{
          width: "100%",
          marginTop: "28px",
          padding: "12px 24px 20px",
          background: "#10090b",
          borderTop: "1px solid #4a2028",
          color: "#c9b9bb",
          boxSizing: "border-box",
          borderRadius: 0,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <nav
            aria-label="页脚导航"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              marginBottom: "12px",
            }}
          >
            <button
              type="button"
              style={linkStyle}
              onClick={() => setActiveModal("about")}
            >
              关于本站
            </button>

            <button
              type="button"
              style={linkStyle}
              onClick={() => setActiveModal("contact")}
            >
              联系站长
            </button>

            <button
              type="button"
              style={linkStyle}
              onClick={() => setActiveModal("friends")}
            >
              友情链接
            </button>

            <button
              type="button"
              style={linkStyle}
              onClick={() => setActiveModal("disclaimer")}
            >
              免责声明
            </button>
          </nav>

          <div
            style={{
              borderTop: "1px solid #4a2028",
              marginBottom: "16px",
            }}
          />

          <p style={{ margin: "0 0 8px", fontSize: "12px", lineHeight: 1.8 }}>
            © {new Date().getFullYear()} XHRPG STUDIO · All Rights Reserved.
          </p>
        </div>
      </footer>

      {activeContent && (
        <div
          onClick={() => setActiveModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-modal-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "560px",
              background: "#160c0f",
              border: "1px solid #8b1e2d",
              borderRadius: 0,
              color: "#f8eeee",
              boxSizing: "border-box",
              boxShadow: "0 16px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 22px",
                borderBottom: "1px solid #4a2028",
              }}
            >
              <h2
                id="footer-modal-title"
                style={{
                  margin: 0,
                  fontSize: "19px",
                  fontWeight: 700,
                }}
              >
                {activeContent.title}
              </h2>

              <button
                type="button"
                aria-label="关闭窗口"
                onClick={() => setActiveModal(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: 0,
                  color: "#c9b9bb",
                  fontSize: "26px",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: "24px 22px 30px",
                fontSize: "14px",
                lineHeight: 2,
                color: "#c9b9bb",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {activeContent.content}
            </div>

            <div
              style={{
                padding: "14px 22px",
                borderTop: "1px solid #4a2028",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{
                  padding: "9px 22px",
                  background: "#8b1e2d",
                  border: "1px solid #a52a3a",
                  borderRadius: 0,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                关闭
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
