# 太空飞船 Spaceship

一个用纯 HTML5 Canvas + JavaScript 写的小型射击游戏，单文件、零依赖。

## 玩法

- 方向键 / `WASD` 移动飞船
- `Space` 射击
- `P` 暂停 / 继续
- `Enter` 在菜单或结束界面开始新一局

击毁陨石得分（陨石越大分数越高，需要的命中数也更多），被陨石撞到会损失一条命，
共 3 条命。难度随时间递增。最高分会保存在浏览器 `localStorage`。

## 运行

直接在浏览器打开 `index.html` 即可，例如：

```sh
open games/spaceship/index.html        # macOS
xdg-open games/spaceship/index.html    # Linux
```

或在仓库根目录起个静态服务：

```sh
python3 -m http.server 8000
# 然后访问 http://localhost:8000/games/spaceship/
```
