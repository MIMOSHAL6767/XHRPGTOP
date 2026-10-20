# XHRPG Windows 本机原型

当前版本包含暗色紫色首页、游戏搜索、分类筛选、排序、游戏详情、登录演示和投稿演示。游戏资料是虚构示例；登录与投稿不会写入数据库。

## 安装环境
1. 安装 Node.js LTS（建议 Node.js 22）：https://nodejs.org/
2. 安装后打开 PowerShell，执行 `node -v` 和 `npm -v` 确认成功。

## 启动
1. 解压 XHRPG 文件夹。
2. 在文件夹空白处按住 Shift 并右键，选择“在终端中打开”；或在资源管理器地址栏输入 `powershell` 回车。
3. 依次运行：

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

4. 浏览器打开 http://localhost:3000。保持终端窗口开启；按 Ctrl+C 可停止网站。

## 文件说明
- `src/app/page.tsx`：首页与交互
- `src/app/globals.css`：暗色紫色样式
- `src/lib/games.ts`：示例游戏数据
- `prisma/schema.prisma`：未来数据库表结构草案，当前还没有接入
- `.env.example`：环境变量示例

## 后续阶段
1. 接入 Prisma + SQLite，保存游戏、链接和投稿。
2. 安全实现账号注册、登录和会话。
3. 开发审核员/站长后台、操作日志。
4. 添加备份、恢复测试及服务器迁移文档。

不要将 `.env`、真实密码或数据库文件提交到公开仓库。上线前需要替换示例资料并核实所有资源分享权限。
