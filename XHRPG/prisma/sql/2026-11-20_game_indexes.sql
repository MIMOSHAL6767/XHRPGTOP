-- 高频查询索引：首页/游戏库/详情页推荐
CREATE INDEX IF NOT EXISTS "Game_status_downloads_idx"
  ON "Game" ("status", "downloads" DESC);

CREATE INDEX IF NOT EXISTS "Game_status_createdAt_idx"
  ON "Game" ("status", "createdAt" DESC);

-- 评分榜（若后续启用）按游戏聚合时的外键索引由 @@index([gameId]) 提供。
