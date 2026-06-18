# 打飞机游戏 · Plane Shooter

一个基于 HTML5 Canvas 的单文件小游戏，无需任何依赖，双击 `index.html` 即可在浏览器中游玩。

## 玩法

- **移动**：方向键 `←/→/↑/↓` 或 `WASD`
- **射击**：按住 `空格`
- **暂停**：`P`
- **重开**：`R`
- **触屏**：拖动屏幕控制飞机，同时自动射击

## 特性

- 三种敌机：侦察机（直飞）、战斗机（追踪射击）、Boss（扇形弹幕，30 秒一波）
- 道具系统：
  - `P` 升级火力（最多 3 级：单发 → 双发 → 三叉弹）
  - `H` 恢复 1 点 HP（上限 5 点）
- 无敌闪烁、粒子爆炸、星空背景
- 本地保存最高分（localStorage）
- 难度随时间递增（刷怪速度加快）

## 运行

```bash
# 直接用浏览器打开即可
open games/plane-shooter/index.html
# 或起一个静态服务器
python3 -m http.server 8080
# 然后访问 http://localhost:8080/games/plane-shooter/
```
