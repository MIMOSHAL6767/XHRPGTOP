"use client";

import { useEffect, useRef } from "react";

const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO || "";
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID || "";
const CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY || "";
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || "";

// 使用站点自托管的 Giscus 主题，避免默认 GitHub 外观。
// 本地 http 开发环境会因混合内容被 iframe 拦截，回退到内置主题；
// 线上 https 时加载自托管 CSS。
function currentTheme() {
  const name =
    document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light";

  if (window.location.protocol !== "https:") {
    return name;
  }

  return `${window.location.origin}/giscus/${name}.css`;
}

export default function GiscusComments() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const configured = Boolean(REPO && REPO_ID && CATEGORY_ID);

  useEffect(() => {
    if (!configured) return;

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", REPO);
    script.setAttribute("data-repo-id", REPO_ID);
    script.setAttribute("data-category", CATEGORY);
    script.setAttribute("data-category-id", CATEGORY_ID);
    // 用 pathname 关联讨论，游戏详情页天然一一对应。
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", currentTheme());
    script.setAttribute("data-lang", "zh-CN");
    script.setAttribute("data-loading", "lazy");

    container.appendChild(script);

    // 站点主题切换时同步 Giscus iframe 主题，不重新加载评论。
    const observer = new MutationObserver(() => {
      const frame = container.querySelector<HTMLIFrameElement>(
        "iframe.giscus-frame"
      );

      frame?.contentWindow?.postMessage(
        {
          giscus: {
            setConfig: { theme: currentTheme() },
          },
        },
        "https://giscus.app"
      );
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      container.innerHTML = "";
    };
  }, [configured]);

  if (!configured) {
    if (process.env.NODE_ENV === "production") return null;

    return (
      <section className="gd-comments">
        <h2 className="gd-comments-title">评论</h2>
        <p className="gd-comments-empty">
          评论组件尚未配置：在环境变量中填写
          NEXT_PUBLIC_GISCUS_REPO、NEXT_PUBLIC_GISCUS_REPO_ID、
          NEXT_PUBLIC_GISCUS_CATEGORY、NEXT_PUBLIC_GISCUS_CATEGORY_ID
          后即可显示。
        </p>
      </section>
    );
  }

  return (
    <section className="gd-comments">
      <h2 className="gd-comments-title">评论</h2>
      <div ref={containerRef} className="gd-comments-body" />
    </section>
  );
}
