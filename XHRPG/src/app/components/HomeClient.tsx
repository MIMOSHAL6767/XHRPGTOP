
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomeClient({
  games,
  banners = [],
}: {
  games: any[];
  banners: any[];
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"default" | "latest">("default");

  const banner = banners.length
    ? banners[bannerIndex % banners.length]
    : null;

  async function openMySpace() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/uid/${data.user.id}`);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  }

  // 自动轮播
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setBannerIndex((index) => (index + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length]);

  // 读取登录状态
  useEffect(() => {
    try {
      const data = localStorage.getItem("user");

      if (data) {
        setUser(JSON.parse(data));
      }
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

  const filteredGames = games
    .filter((game) => {
      const key = search.trim().toLowerCase();

      if (!key) return true;

      return (
        game.name?.toLowerCase().includes(key) ||
        game.en?.toLowerCase().includes(key) ||
        game.author?.toLowerCase().includes(key) ||
        game.category?.toLowerCase().includes(key)
      );
    })
    .sort((a, b) => {
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return sortOrder === "default" ? idA - idB : idB - idA;
    });

  // 兼容数据库里可能保存的数字、"40" 或 "40px"
  function cssSize(value: unknown, fallback: string) {
