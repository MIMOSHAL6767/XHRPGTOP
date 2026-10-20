"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

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
  const pathname = usePathname();
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

  // 判断当前导航项是否选中
  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // 导航按钮基础样式
  const navLinkStyle: React.CSSProperties = {
    display: "inline-flex",
    flex: "0 0 auto",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "40px",
    padding: "0 16px",
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    border: "1px solid transparent",
    borderRadius: 0,
    background: "transparent",
    boxSizing: "border-box",
    cursor: "pointer",
    transition: "color 160ms ease, background 160ms ease",
  };

  // 当前选中项：白底红字直角方框
  function getNavStyle(href: string): React.CSSProperties {
    if (isActive(href)) {
      return {
        ...navLinkStyle,
        color: "#e73550",
        background: "#ffffff",
        border: "1px solid #ffffff",
      };
    }

    return navLinkStyle;
  }

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
          width: "100%",
          minWidth: 0,
          maxWidth: "none",
          height: "64px",
          minHeight: "64px",
          flex: "0 0 64px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
          zIndex: 20,
          background: "#e73550",
          boxSizing: "border-box",
          padding: "0 16px",
          gap: 0,
        }}
      >
        {/* 导航内容容器 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            maxWidth: "1440px",
            minWidth: 0,
            height: "100%",
            margin: "0 auto",
            gap: 0,
            boxSizing: "border-box",
          }}
        >
          {/* Logo：整体向下微调 6px */}
          <Link
            href="/"
            aria-label="XHRPG 首页"
            className="logo-box"
            style={{
              position: "static",
              flex: "0 0 auto",
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
              transform: "translateY(6px)",
            }}
          >
            <b
              style={{
                display: "block",
                fontSize: "32px",
                lineHeight: 1,
                color: "#111111",
                margin: 0,
                padding: 0,
              }}
            >
              喜灰
            </b>

            <span
              style={{
                display: "block",
                fontSize: "32px",
                lineHeight: 1,
                color: "#ffffff",
                margin: 0,
                padding: 0,
              }}
            >
              RPG
            </span>
          </Link>

          {/* 主导航：保持原位置 */}
          <nav
            aria-label="主导航"
            style={{
              display: "flex",
              flex: "0 1 auto",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: "6px",
              minWidth: 0,
              marginLeft: "clamp(24px, 4vw, 64px)",
              overflowX: "auto",
              overflowY: "hidden",
              scrollbarWidth: "none",
              whiteSpace: "nowrap",
              height: "100%",
            }}
          >
            <Link
              href="/"
              aria-current={isActive("/") ? "page" : undefined}
              style={getNavStyle("/")}
            >
              首页
            </Link>

            <Link
              href="/games"
              aria-current={isActive("/games") ? "page" : undefined}
              style={getNavStyle("/games")}
            >
              游戏库
            </Link>

            <Link
              href="/activities"
              aria-current={isActive("/activities") ? "page" : undefined}
              style={getNavStyle("/activities")}
            >
              活动
            </Link>

            <Link
              href="/timeline"
              aria-current={isActive("/timeline") ? "page" : undefined}
              style={getNavStyle("/timeline")}
            >
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

          {/* 搜索框与用户信息：整体向下微调 6px */}
          <header
            className="top-bar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              flex: "1 1 auto",
              minWidth: 0,
              marginLeft: "auto",
              padding: 0,
              background: "transparent",
              boxSizing: "border-box",
              height: "100%",
              transform: "translateY(6px)",
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
                height: "36px",
                minWidth: "80px",
                maxWidth: "160px",
                flex: "0 1 160px",
                boxSizing: "border-box",
                margin: 0,
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
                height: "100%",
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
        </div>
      </aside>

      {/* 隐藏导航横向滚动条 */}
      <style jsx>{`
        nav::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 900px) {
          .drawer-nav {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
        }
      `}</style>
    </>
  );
}
