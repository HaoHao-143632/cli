# 小学英语乐园 English Fun Land

一个面向小学生（1-6 年级）的英语辅导网站，纯静态实现（HTML + CSS + JavaScript），无需任何构建工具或依赖。

## 主要功能

- **分年级课程**：1-6 年级，每个年级 4 个主题课程
- **单词学习**：彩色卡片 + Emoji 图示，点击即可听标准发音（Web Speech API）
- **单词测验**：英译中 / 中译英 交替出题，10 题一组
- **互动游戏**：
  - 🧩 记忆配对 — 把英文与中文意思配对
  - 🔤 单词拼写 — 听发音、看图片、按顺序点击字母
  - 👂 听音选词 — 听发音，从 4 个选项中选出正确单词
- **学习进度**：完成课程、答对题目获得 ⭐，进度保存在浏览器本地

## 如何使用

直接在浏览器中打开 `index.html` 即可：

```bash
# 任选其一
xdg-open website/index.html         # Linux
open website/index.html             # macOS

# 或者用本地服务器
python3 -m http.server 8000 --directory website
# 然后访问 http://localhost:8000
```

## 文件结构

```
website/
├── index.html      # 单页应用主结构
├── css/style.css   # 样式（明快配色，适合小学生）
├── js/data.js      # 课程与单词数据
└── js/app.js       # 应用逻辑（导航 / 测验 / 游戏 / 进度）
```

## 浏览器要求

- 任意现代浏览器（Chrome / Edge / Firefox / Safari）
- 发音功能依赖 Web Speech API，建议使用 Chrome / Edge 以获得最佳英文发音效果
- 学习进度使用 `localStorage` 保存
