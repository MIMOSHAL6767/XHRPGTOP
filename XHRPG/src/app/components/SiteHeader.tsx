
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SiteHeaderProps = {
  headerImage?: string | null;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export default function SiteHeader({
  headerImage = null,
  searchValue = "",
  onSearchChange,
}: SiteHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // 读取登录状态
  useEffect(() => {
    try {
      const data = localStorage.getItem("user");
      setUser(data ? JSON.parse(data) : null);
    } catch {
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  function logout() {
    localStorage.removeItem("user");
    setUser(null);
    router.refresh();
  }

  const navLinkStyle: React.CSSProperties = {
    display: "inline-flex",
    flex: "0 0 auto",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "40px",
    padding: "0 14px",
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    border: "none",
    borderRadius: 0,
    background: "transparent",
    boxSizing: "border-box",
    cursor: "pointer",
  };

  return (
    <>
      {/* 首页头图 */}
      {headerImage && (
        <Link
          href="/"
          aria-label="返回首页"
          style={{
            display: "block",
            width: "100%",
            margin: 0,
            padding: 0,
            lineHeight: 0,
            cursor: "pointer",
            overflow: "hidden",
            borderRadius: 0,
            flexShrink: 0,
          }}
        >
          <img
            src={headerImage}
            alt="XHRPG 首页头图"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              maxHeight: "280px",
              objectFit: "cover",
              objectPosition: "center",
              margin: 0,
              padding: 0,
              border: "none",
              borderRadius: 0,
            }}
          />
        </Link>
      )}

      {/* 公共红色导航栏 */}
      <aside
        className="drawer-nav"
        style={{
          position: "relative",
          inset: "auto",
          width: "100%",
          minWidth: 0,
          maxWidth: "none",
          height: "64px",
          minHeight: "64px",
          flex: "0 0 64px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          overflow: "visible",
          zIndex: 20,
          background: "#e73550",
          boxSizing: "border-box",
          padding: "0 clamp(12px, 2vw, 32px)",
          gap: "8px",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          aria-label="XHRPG 首页"
          className="logo-box"
          style={{
            position: "static",
            width: "auto",
            height: "100%",
            minWidth: "max-content",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "0 8px",
            background: "transparent",
            border: "none",
            outline: "none",
            boxShadow: "none",
            boxSizing: "border-box",
            whiteSpace: "nowrap",
            textDecoration: "none",
            transform: "translateY(5px)",
          }}
        >
          <b style={{ fontSize: "32px", lineHeight: 1, color: "#111111" }}>
            喜灰
          </b>
          <span style={{ fontSize: "32px", lineHeight: 1, color: "#FFFFFF" }}>
            RPG
          </span>
        </Link>

        {/* 主导航 */}
        <nav
          aria-label="主导航"
          style={{
            display: "flex",
            flex: "1 1 auto",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "2px",
            minWidth: 0,
            marginLeft: "clamp(4px, 1.5vw, 24px)",
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none",
            whiteSpace: "nowrap",
          }}
        >
          <Link href="/" style={navLinkStyle}>
            首页
          </Link>

          <Link href="/games" style={navLinkStyle}>
            游戏库
          </Link>

          <Link href="/activities" style={navLinkStyle}>
            活动
          </Link>

          <Link href="/timeline" style={navLinkStyle}>
            大事记
          </Link>

          <button
            type="button"
            disabled
            title="上传功能暂未开放"
            style={{
              ...navLinkStyle,
              opacity: 0.55,
              cursor: "not-allowed",
            }}
          >
            上传
          </button>
        </nav>

        {/* 搜索与用户信息 */}
        <header
          className="top-bar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            flex: "0 1 auto",
            minWidth: 0,
            marginLeft: "auto",
            padding: 0,
            transform: "translateY(4px)",
            background: "transparent",
            boxSizing: "border-box",
          }}
        >
          <input
            aria-label="搜索游戏"
            placeholder="搜索游戏..."
            value={searchValue}
            onChange={(event) => {
              onSearchChange?.(event.target.value);
            }}
            style={{
              width: "160px",
              minWidth: "100px",
              maxWidth: "160px",
              flex: "0 1 160px",
              boxSizing: "border-box",
            }}
          />

          <div
            className="user-area"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            {user && (
              <>
                <div className="avatar">
                  {user.username?.charAt(0)}
                </div>

                <span className="username">{user.username}</span>

                {user.role === "owner" && (
                  <button
                    type="button"
                    onClick={() => router.push("/admin")}
                  >
                    后台管理
                  </button>
                )}

                <button type="button" onClick={logout}>
                  退出
                </button>
              </>
            )}
          </div>
        </header>
      </aside>
    </>
  );
}
