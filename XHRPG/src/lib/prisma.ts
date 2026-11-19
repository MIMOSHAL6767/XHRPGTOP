import { PrismaClient } from "@prisma/client";

// 远程数据库偶发 P1001（冷启动/网络抖动）时自动重试，避免整页 500。
function isRetryableDbError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const name = (error as { name?: string } | null)?.name || "";
  const message =
    (error as { message?: string } | null)?.message || "";

  return (
    code === "P1001" || // 无法连接数据库
    code === "P1002" || // 连接超时
    code === "P1017" || // 连接被关闭
    code === "P2024" || // 连接池超时
    name === "PrismaClientInitializationError" ||
    message.includes("Can't reach database server") ||
    message.includes("Timed out fetching a new connection")
  );
}

const RETRY_DELAYS = [400, 900, 1600];

function createPrismaClient() {
  const base = new PrismaClient();

  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastError: unknown;

        for (
          let attempt = 0;
          attempt <= RETRY_DELAYS.length;
          attempt += 1
        ) {
          try {
            return await query(args);
          } catch (error) {
            lastError = error;

            if (
              !isRetryableDbError(error) ||
              attempt >= RETRY_DELAYS.length
            ) {
              throw error;
            }

            await new Promise((resolve) =>
              setTimeout(resolve, RETRY_DELAYS[attempt])
            );
          }
        }

        throw lastError;
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
