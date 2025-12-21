# ◉ Lens

**AI 时代的思维单车**

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/ohhommiplfmgbkddllbljnooeblbhllf?style=for-the-badge&logo=googlechrome&logoColor=white&label=Chrome%20商店)](https://chromewebstore.google.com/detail/lens-ai-text-analyzer-ins/ohhommiplfmgbkddllbljnooeblbhllf)

[English](README.md)

https://github.com/user-attachments/assets/547ff5ce-ffda-4ab1-8a40-4ceec01a584b

对于社交媒体上任何人的言论，选中文字，右键「💡Lens」，即可获得深刻的 AI 洞察，让你在网上冲浪时被动获得深度思考。

## 安装

### Chrome 商店安装（推荐）

直接从 [Chrome 应用商店](https://chromewebstore.google.com/detail/lens-ai-text-analyzer-ins/ohhommiplfmgbkddllbljnooeblbhllf) 安装。

### 手动安装

1. [下载最新版本](https://github.com/mazzzystar/Lens/releases/download/v0.0.3/Lens-v0.0.3.zip)
2. 解压文件
3. 打开 Chrome → `chrome://extensions/`
4. 启用右上角的 **开发者模式**
5. 点击 **加载已解压的扩展程序**，选择解压后的文件夹

### 从源码安装

1. 克隆仓库：
   ```bash
   git clone https://github.com/mazzzystar/Lens.git
   ```
2. 打开 Chrome，访问 `chrome://extensions/`
3. 启用右上角的 **开发者模式**
4. 点击 **加载已解压的扩展程序**，选择 `Lens` 文件夹

## 设置

1. 去 [OpenRouter](https://openrouter.ai/settings/keys) 创建一个 API key
2. 点击 Chrome 工具栏中的 Lens 图标
3. 粘贴你的 key（Lens 开源，所以你的 key 是安全的）
4. 设置 AI 回复的语言
5. 搞定

默认模型是 Gemini 3 Pro。你可以切换到 Claude 4 Opus，但 Gemini 的思考往往更深刻。


## 使用

1. 在网页上选中任意文字
2. 右键 → **💡 Lens**
3. 洞察出现在下方


## 为什么做这个

我经常在网上看到一段有意思的话，想让 AI 深刻分析一下。每次都要：
1. 打开 Gemini
2. 复制粘贴
3. 打同样的 prompt："你怎么看？请给出深刻洞察"

我想要一个工具缩短这个路径，让我能更频繁地在网上冲浪和思考。

另外：**互联网已经是流量导向了，算法奖励说话极端的人**。最响亮的声音被放大，而不是最有思想的。我们需要带脑子上网。

Lens 帮你看透噪音。当你看到别人的观点时，让 AI 检验其逻辑是否站得住脚——或者揭示更深层的底层逻辑。

## 隐私

- API key 存储在 Chrome 本地
- 文本直接发送到 OpenRouter，没有中间服务器
- 无数据分析或追踪

## 许可证

MIT

---

*A Bicycle for the Mind in the Age of AI.*
