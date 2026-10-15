import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";

type HistoryItem = {
  version?: string;
  date?: string;
  lanzou?: string;
  pan123?: string;
};

function parseHistory(value: Prisma.JsonValue): HistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Prisma.JsonObject =>
      item !== null &&
      typeof item === "object" &&
      !Array.isArray(item)
  ).map((item) => ({
    version:
      typeof item.version === "string" ? item.version : "",
    date:
      typeof item.date === "string" ? item.date : "",
    lanzou:
      typeof item.lanzou === "string" ? item.lanzou : "",
    pan123:
      typeof item.pan123 === "string" ? item.pan123 : "",
  }));
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gameId = Number(id);

  if (!Number.isSafeInteger(gameId) || gameId <= 0) {
    notFound();
  }

  const game = await prisma.game.findUnique({
    where: {
      id: gameId,
    },
  });

  if (!game) {
    notFound();
  }

  const cover = game.cover?.trim() || `/assets/games/games${game.id}.png`;
  const history = parseHistory(game.history);

  return (
    <main className="detail-page">
      <Link href="/" className="detail-back">
        ← 返回游戏库
      </Link>

      {/* 背景 */}
      <div
        className="detail-bg"
        style={{
          backgroundImage: `url(${cover})`,
        }}
      />

      {/* 遮罩 */}
      <div className="detail-mask" />

      {/* 内容 */}
      <div className="detail-container">
        <div className="detail-card">
          <div className="detail-content">
            {/* 封面 */}
            <div className="detail-cover">
              <img src={cover} alt={game.name} />
            </div>

            {/* 信息 */}
            <div className="detail-info">
              <h1>{game.name}</h1>

              <p className="description">
                {game.description}
              </p>

              <div className="game-meta">
                <p>作者：{game.author}</p>
                <p>类型：{game.category}</p>
                <p>版本：{game.version}</p>
              </div>

              {/* 当前版本下载 */}
              <div className="download-box">
                {game.lanzou && (
                  <a
                    href={game.lanzou}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-btn lanzou"
                  >
                    蓝奏云下载
                  </a>
                )}

                {game.pan123 && (
                  <a
                    href={game.pan123}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-btn pan123"
                  >
                    123云盘下载
                  </a>
                )}
              </div>

              {/* 历史版本 */}
              {history.length > 0 && (
                <div className="history-box">
                  <h2>历史版本</h2>

                  {history.map((item, index) => (
                    <div
                      key={index}
                      className="history-item"
                    >
                      <div className="history-info">
                        <strong>{item.version}</strong>
                        <span>{item.date}</span>
                      </div>

                      <div className="history-btns">
                        {item.lanzou && (
                          <a
                            href={item.lanzou}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            蓝奏云
                          </a>
                        )}

                        {item.pan123 && (
                          <a
                            href={item.pan123}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            123云盘
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
