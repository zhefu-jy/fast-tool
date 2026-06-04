# 🚀 Fast Tool - 快捷导航工具

一款基于 [Neutralinojs](https://neutralino.js.org/) 开发的轻量级桌面快捷导航工具，无需安装，双击即用。

## ✨ 功能特性

- 📁 **本地文件夹快速打开** — 一键用资源管理器打开常用目录
- 🌐 **网址快速跳转** — 一键用默认浏览器打开常用网站
- 🔐 **账号密码记录** — 为网址条目可选保存账号与密码（带复制功能）
- 📌 **条目置顶** — 常用条目置顶优先显示
- 🔍 **全局搜索** — 跨分类搜索所有条目
- 🌙 **深色/浅色主题** — 一键切换
- 🔔 **系统托盘常驻** — 关闭窗口后最小化到托盘，不占任务栏
- 💾 **数据安全存储** — 数据保存在系统 AppData 目录，随意移动 exe 不丢失数据

## 📦 直接使用（推荐）

前往 [Releases](https://github.com/zhefu-jy/fast-tool/releases) 页面下载最新版本，将以下两个文件放在同一目录，双击 exe 即可运行：

- `fast-tool-win_x64.exe`
- `resources.neu`

> ⚠️ **注意**：两个文件必须放在同一个文件夹里才能正常运行。

## 🔧 从源码构建

**环境要求**：Node.js >= 16

```bash
# 1. 克隆项目
git clone https://github.com/zhefu-jy/fast-tool.git
cd fast-tool

# 2. 安装依赖
npm install

# 3. 下载 Neutralinojs 运行时（必须先执行！）
npx @neutralinojs/neu update

# 4. 构建
npx @neutralinojs/neu build

# 5. 将图标注入到 exe（可选）
node patch-icon.js
```

构建完成后，产物在 `dist/fast-tool/` 目录。

## 🛠️ 开发调试

```bash
npx @neutralinojs/neu run
```

## 📄 License

MIT
