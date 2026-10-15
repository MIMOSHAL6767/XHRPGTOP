import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireOwnerPage } from "@/lib/admin-auth";

export default async function BannerAdmin() {
  // 验证站长身份，未通过验证则跳转到登录页
  await requireOwnerPage();

  const banners = await prisma.banner.findMany({
    orderBy: {
      id: "asc",
    },
  });

  return (
    <main className="admin-page">
      <div className="admin-box games-admin">
        <Link href="/admin">
          <button className="back-btn" type="button">
            ← 返回后台
          </button>
        </Link>

        <h1>首页轮播管理</h1>

        <Link href="/admin/banner/new">
          <button className="admin-main-btn" type="button">
            + 添加轮播
          </button>
        </Link>

        <table className="game-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>图片</th>
              <th>标题</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>

          <tbody>
            {banners.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>

                <td>
                  {item.cover ? (
                    <img
                      src={item.cover}
                      alt={item.title || `轮播图片 ${item.id}`}
                      style={{
                        width: "200px",
                        height: "120px",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span>暂无图片</span>
                  )}
                </td>

                <td>{item.title}</td>

                <td>{item.enabled ? "显示" : "隐藏"}</td>

                <td>
                  <Link href={`/admin/banner/${item.id}`}>
                    <button className="edit-btn" type="button">
                      编辑
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
