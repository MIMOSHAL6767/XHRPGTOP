
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import SiteHeader from "@/app/components/SiteHeader";
import FloatingWidget from "@/app/components/FloatingWidget";

export default function UploadPage() {
  const [headerImage, setHeaderImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHeader() {
      try {
        const response = await fetch("/", {
          cache: "no-store",
        });

        if (!response.ok || cancelled) return;

        // 头图由全站 SiteHeader 的既有设置负责显示。
        // 这里不重复请求数据库，也不修改后台配置。
      } catch (error) {
        console.error("加载上传页面失败：", error);
      }
    }

    void loadHeader();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      className="xhrpg-upload-page"
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "transparent",
        color: "#f8eeee",
      }}
    >
      <SiteHeader headerImage={headerImage} />

      <section
        style={{
          width: "min(100% - 32px, 1100px)",
          margin: "0 auto",
          padding: "48px 0 80px",
          boxSizing: "border-box",
        }}
      >
        <header style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: "clamp(26px, 4vw, 36px)",
              fontWeight: 700,
              margin: 0,
            }}
          >
            游戏投稿中心
          </h1>

          <p
            style={{
              color: "#bba9ac",
              marginTop: 12,
              lineHeight: 1.8,
            }}
          >
            新建游戏投稿，或使用专属凭证编辑已有投稿。
          </p>
        </header>

        <div
          className="upload-entry-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <Link
            href="/upload/new"
            style={{
              minHeight: 260,
              padding: "clamp(20px, 4vw, 40px)",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: 18,
              color: "#ffffff",
              textDecoration: "none",
              background: "#160c0f",
              border: "1px solid #8b1e2d",
              borderRadius: 0,
              transition: "background 160ms ease, border-color 160ms ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "#261016";
              event.currentTarget.style.borderColor = "#e5484d";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "#160c0f";
              event.currentTarget.style.borderColor = "#8b1e2d";
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 58,
                height: 58,
                border: "1px solid #8b1e2d",
                color: "#e5484d",
                fontSize: 36,
                lineHeight: 1,
              }}
            >
              +
            </span>

            <span style={{ fontSize: 27, fontWeight: 700 }}>
              新建游戏
            </span>

            <span
              style={{
                color: "#c9b8bb",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              提交新的喜灰同人 RPG 游戏，填写基本信息、下载链接和游戏封面。
            </span>

            <span style={{ color: "#e5484d", marginTop: 4 }}>
              开始投稿 →
            </span>
          </Link>

          <Link
            href="/upload/edit"
            style={{
              minHeight: 260,
              padding: "clamp(20px, 4vw, 40px)",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: 18,
              color: "#ffffff",
              textDecoration: "none",
              background: "#160c0f",
              border: "1px solid #8b1e2d",
              borderRadius: 0,
              transition: "background 160ms ease, border-color 160ms ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "#261016";
              event.currentTarget.style.borderColor = "#e5484d";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "#160c0f";
              event.currentTarget.style.borderColor = "#8b1e2d";
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 58,
                height: 58,
                border: "1px solid #8b1e2d",
                color: "#e5484d",
                fontSize: 30,
              }}
            >
              ✎
            </span>

            <span style={{ fontSize: 27, fontWeight: 700 }}>
              编辑游戏
            </span>

            <span
              style={{
                color: "#c9b8bb",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              输入投稿时获得的专属编辑凭证，继续修改或完善已有游戏资料。
            </span>

            <span style={{ color: "#e5484d", marginTop: 4 }}>
              管理我的投稿 →
            </span>
          </Link>
        </div>
      </section>

      <FloatingWidget />

      <style jsx>{`
        @media (max-width: 640px) {
          .upload-entry-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </main>
  );
}
