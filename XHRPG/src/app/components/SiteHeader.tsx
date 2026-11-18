"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type GlobalGame = {
  id: number;
  name: string;
  en?: string | null;
  author?: string | null;
  category?: string | null;
  cover?: string | null;
  tags?: string[] | null;
};

type SiteHeaderProps = {
  headerImage?: string | null;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  hideSearch?: boolean;
};

export default function SiteHeader({
  headerImage = null,
  searchValue = "",
  onSearchChange,
  hideSearch = false,
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

  // ===== 全站搜索：任意页面输入即搜索全部已发布游戏 =====
  const [globalQuery, setGlobalQuery] = useState(searchValue || "");
  const [globalGames, setGlobalGames] = useState<GlobalGame[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeResult, setActiveResult] = useState(-1);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setGlobalQuery(searchValue || "");
  }, [searchValue]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(event.target as Node)
      ) {
        setSearchFocused(false);
        setActiveResult(-1);
      }
    }

    document.addEventListener("mousedown", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  const searchKeyword = globalQuery.trim().toLowerCase();

  const searchResults = searchKeyword
    ? globalGames
        .filter((game) => {
          const tags = Array.isArray(game.tags)
            ? game.tags.join(" ")
            : "";

          return [
            game.name,
            game.en,
            game.author,
            game.category,
            tags,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(searchKeyword);
        })
        .slice(0, 8)
    : [];

  async function loadGlobalGames() {
    if (globalGames.length > 0) return;

    try {
      const response = await fetch("/api/games", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();

      if (Array.isArray(data)) {
        setGlobalGames(data);
      }
    } catch {
      // 搜索失败时静默，不打断当前页面。
    }
  }

  function updateSearch(value: string) {
    setGlobalQuery(value);
    setActiveResult(-1);
    void loadGlobalGames();
    onSearchChange?.(value);
  }

  function openSearchResult(id: number) {
    setSearchFocused(false);
    setActiveResult(-1);
    router.push(`/game/${id}`);
  }

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Escape") {
      setSearchFocused(false);
      setActiveResult(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchFocused(true);

      if (searchResults.length > 0) {
        setActiveResult((index) =>
          (index + 1) % searchResults.length
        );
      }

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchFocused(true);

      if (searchResults.length > 0) {
        setActiveResult((index) =>
          index <= 0 ? searchResults.length - 1 : index - 1
        );
      }

      return;
    }

    if (event.key === "Enter" && searchResults.length > 0) {
      event.preventDefault();
      const target =
        searchResults[activeResult >= 0 ? activeResult : 0];
      openSearchResult(target.id);
    }
  }

  // 退出登录
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

  // 上传入口：未选中时保持红底白字，选中时使用白底红字
  function getUploadStyle(): React.CSSProperties {
    if (isActive("/upload")) {
      return {
        ...navLinkStyle,
        color: "#e73550",
        background: "#ffffff",
        border: "1px solid #ffffff",
      };
    }

    return {
      ...navLinkStyle,
      color: "#ffffff",
      background: "#8b1e2d",
      border: "1px solid #ffffff",
    };
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
          {/* 主导航 */}
          <nav
            aria-label="主导航"
            style={{
              display: "flex",
              flex: "0 1 auto",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: "6px",
              minWidth: 0,
              marginLeft: 0,
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

            {/* 开放上传入口 */}
            <Link
              href="/upload"
              aria-current={isActive("/upload") ? "page" : undefined}
              style={getUploadStyle()}
              title="投稿或编辑游戏"
            >
              上传游戏
            </Link>
          </nav>

          {/* 搜索框与用户信息 */}
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
              transform: "translateY(14px)",
            }}
          >
            {/* 全站搜索框 */}
            {!hideSearch && (
              <div className="site-search" ref={searchWrapRef}>
                <input
                  aria-label="搜索游戏"
                  placeholder="搜索游戏..."
                  value={globalQuery}
                  onChange={(event) =>
                    updateSearch(event.target.value)
                  }
                  onFocus={() => {
                    setSearchFocused(true);
                    void loadGlobalGames();
                  }}
                  onKeyDown={handleSearchKeyDown}
                  style={{
                    width: "100%",
                    height: "36px",
                    boxSizing: "border-box",
                    margin: 0,
                  }}
                />

                {searchFocused && searchKeyword && (
                  <div className="site-search-dropdown">
                    {searchResults.length > 0 ? (
                      searchResults.map((game, index) => (
                        <button
                          key={game.id}
                          type="button"
                          className={
                            index === activeResult
                              ? "site-search-item active"
                              : "site-search-item"
                          }
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            openSearchResult(game.id)
                          }
                        >
                          {game.cover ? (
                            <img
                              className="site-search-thumb"
                              src={game.cover}
                              alt=""
                            />
                          ) : (
                            <span className="site-search-thumb" />
                          )}

                          <span className="site-search-text">
                            <span className="site-search-name">
                              {game.name}
                            </span>
                            <span className="site-search-meta">
                              {game.author || "未知作者"}
                              {game.category
                                ? ` · ${game.category}`
                                : ""}
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="site-search-empty">
                        没有找到匹配的游戏
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 用户信息 */}
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
