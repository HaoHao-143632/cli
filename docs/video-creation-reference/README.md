# 视频创作参考 · Video Creation Reference

本目录用来沉淀「以一张参考图为出发点」生成 AI 视频的提示词与参数,方便复用与对比不同模型/工具的产出。

## 📌 当前参考图

**文件**:`reference.jpg`(请把你提供的雾中江景图保存到本目录,命名为 `reference.jpg`)

### 画面解读 / Scene Description

| 维度 | 描述 |
| --- | --- |
| 主体 | 远景城市天际线 + 中景渔船群 + 前景平静水面 |
| 构图 | 横向三段式:天空(40%) / 城市+雾带(20%) / 水面(40%) |
| 光线 | 阴天散射光,无明显方向,顶光略冷 |
| 色调 | 极低饱和,灰蓝绿为主,近黑白,带轻微青冷调 |
| 氛围 | 静谧、潮湿、苍茫、电影感、东方水墨意境 |
| 关键元素 | 1 座深色塔楼(左侧)、密集摩天楼群、低空浮雾带、6–7 艘小渔船、水面细密涟漪、厚重云层 |
| 镜头属性 | 长焦压缩感、宽幅(~3:2)、远距离拍摄 |

### 视觉关键词 · Visual Keywords

`misty cityscape` · `low-lying fog` · `cinematic` · `monochromatic` · `muted blue-grey palette` · `overcast sky` · `tranquil river` · `distant skyline` · `fishing boats` · `oriental ink wash aesthetic` · `wide cinematic frame`

---

## 🎬 推荐分镜 · Suggested Shots

适合做成一段 5–10 秒的氛围短片,几种可选运镜:

1. **极缓推镜**(Slow push-in)— 从大全景缓慢推向中景渔船,雾气随镜头流动。
2. **横向平移**(Lateral pan)— 从左向右平移,塔楼逐渐让位给摩天楼群,渔船依次入画。
3. **延时云流**(Time-lapse-like cloud drift)— 镜头静止,云层与雾带横向流动,水面微动。
4. **垂直升镜**(Vertical rise)— 从水面起,缓慢上升,逐层揭示渔船 → 雾带 → 城市 → 天空。

---

## 🤖 各工具提示词 · Prompts per Tool

### 1. Sora / 通用英文 text-to-video

```
A cinematic wide shot of a misty harbor at dawn. A modern city skyline emerges
faintly through a thick band of low-lying fog, dominated by a tall dark tower on
the left and a cluster of skyscrapers stretching to the right. In the middle
ground, six small wooden fishing boats sit motionless on calm grey-green water,
their reflections barely visible. Heavy overcast clouds drift slowly across the
sky. Subtle ripples move across the water surface, fog gently breathes around
the buildings. Color palette: desaturated blue-grey monochrome, oriental ink-
wash aesthetic. Camera: extremely slow push-in, long lens, shallow atmospheric
depth. 16:9, 24fps, 8 seconds, photoreal, moody, contemplative.
```

### 2. Runway Gen-3 / Image-to-Video(以参考图为首帧)

```
Subtle living atmosphere: low fog gently drifts left-to-right across the base
of the skyline, clouds slowly churn, water surface shows fine ripples, the
fishing boats sway almost imperceptibly. No camera motion, no zoom. Preserve
the original muted blue-grey palette and overcast lighting. Cinematic, calm,
breath-like motion. 5 seconds.
```

### 3. 可灵(Kling)· 中文

```
雾气笼罩的现代都市江景,远处摩天楼群隐没在低空浓雾中,左侧一座深色高塔
最为醒目。中景水面上停泊着六七艘小型木质渔船,船身静止。天空厚云压顶,
缓慢横向流动。水面泛起细微涟漪,雾带随风从左向右轻柔飘移。整体青灰蓝
单色调,东方水墨意境,电影感长焦构图。镜头极缓慢推近,景深压缩。8 秒,
横屏 16:9。
```

负向提示词:`鲜艳色彩, 强光直射, 大幅运动, 人物面孔, 文字水印, 卡通风格`

### 4. 即梦(Jimeng)· 中文

```
首帧:参考图。
运动:浓雾从画面左侧缓慢飘向右侧,云层横向流动,水面轻轻波动,渔船
原地微微晃动。
镜头:静止机位,无变焦,保持原构图与色调。
风格:电影感、水墨青灰、氛围静谧。
时长:5 秒。
```

### 5. Pika / Luma Dream Machine · 英文简短版

```
Misty river city at dawn. Fog drifts slowly across distant skyscrapers,
clouds roll gently, water ripples, fishing boats sway. Static camera,
desaturated cinematic blue-grey, 5s, 16:9.
```

---

## 🛠 参数建议 · Suggested Parameters

| 参数 | 取值 | 说明 |
| --- | --- | --- |
| 分辨率 | 1920×1080 或 2048×1152 | 横屏氛围片,不建议竖屏 |
| 帧率 | 24fps | 增强电影感 |
| 时长 | 5–8s | 静态氛围片不宜过长 |
| 运镜幅度 | 极小 | 推/移幅度不超过 5%,核心是「呼吸感」 |
| 风格强度 | 中–高 | 保留水墨青灰单色调 |
| Seed | 固定 | 多次产出对比时务必固定随机种子 |

---

## ✅ 验收清单 · QA Checklist

生成完成后逐项核对:

- [ ] 整体色调仍为低饱和青灰,未被模型「染色」回常规蓝天
- [ ] 雾带高度与原图相近(约位于楼体下 1/3 处)
- [ ] 渔船数量与排布大致守恒,不要莫名增减或变形
- [ ] 没有出现人物、汽车、飞鸟等画面外元素
- [ ] 水面运动幅度克制,不变成「海浪」
- [ ] 天空与水面之间的层次结构没有被破坏
- [ ] 无 AI 常见瑕疵(扭曲建筑、闪烁、字幕水印)

---

## 📁 目录约定

```
docs/video-creation-reference/
├── README.md          # 本文档
└── reference.jpg      # 用户提供的参考图(待放入)
```

后续如果要管理多组参考,可以按主题再分子目录,例如:

```
docs/video-creation-reference/
├── misty-harbor/
│   ├── reference.jpg
│   └── prompts.md
└── ...
```
