package main

import (
	"fmt"
	"math/rand"
	"os"
	"os/exec"
	"time"

	"golang.org/x/term"
)

const (
	GameWidth  = 60
	GameHeight = 24
)

// ANSI escape codes
const (
	ColorReset  = "\033[0m"
	ColorRed    = "\033[31m"
	ColorGreen  = "\033[32m"
	ColorYellow = "\033[33m"
	ColorBlue   = "\033[34m"
	ColorPurple = "\033[35m"
	ColorCyan   = "\033[36m"
	ColorWhite  = "\033[37m"
	BoldText    = "\033[1m"
)

type Point struct{ x, y int }

type Bullet struct {
	pos   Point
	alive bool
}

type Enemy struct {
	pos   Point
	alive bool
	kind  int // 0=basic, 1=fast, 2=tough
	hp    int
}

type Explosion struct {
	pos   Point
	frame int
}

type Cell struct {
	ch    rune
	color string
}

type Game struct {
	player     Point
	bullets    []Bullet
	enemies    []Enemy
	explosions []Explosion
	score      int
	lives      int
	level      int
	frameCount int
	gameOver   bool
	stars      []Point
}

func newGame() *Game {
	g := &Game{
		player: Point{GameWidth / 2, GameHeight - 3},
		lives:  3,
		level:  1,
	}
	for i := 0; i < 25; i++ {
		g.stars = append(g.stars, Point{rand.Intn(GameWidth), rand.Intn(GameHeight)})
	}
	return g
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func imax(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (g *Game) spawnEnemy() {
	interval := imax(5, 20-g.level*2)
	if g.frameCount%interval != 0 {
		return
	}
	kind := 0
	hp := 1
	r := rand.Intn(10)
	if g.level >= 3 && r < 2 {
		kind = 2
		hp = 3
	} else if g.level >= 2 && r < 4 {
		kind = 1
	}
	g.enemies = append(g.enemies, Enemy{
		pos:   Point{rand.Intn(GameWidth - 4), 1},
		alive: true,
		kind:  kind,
		hp:    hp,
	})
}

func (g *Game) update() {
	if g.gameOver {
		return
	}
	g.frameCount++
	g.spawnEnemy()

	// Move bullets up
	for i := range g.bullets {
		if g.bullets[i].alive {
			g.bullets[i].pos.y -= 2
			if g.bullets[i].pos.y < 1 {
				g.bullets[i].alive = false
			}
		}
	}

	// Move enemies down
	moveInterval := imax(1, 5-g.level/2)
	for i := range g.enemies {
		if !g.enemies[i].alive {
			continue
		}
		if g.frameCount%moveInterval == 0 {
			speed := 1
			if g.enemies[i].kind == 1 {
				speed = 2
			}
			g.enemies[i].pos.y += speed
		}
		if g.enemies[i].pos.y >= GameHeight-2 {
			g.enemies[i].alive = false
			g.lives--
			g.explosions = append(g.explosions, Explosion{pos: g.enemies[i].pos})
			if g.lives <= 0 {
				g.gameOver = true
			}
		}
	}

	// Bullet-Enemy collision
	for bi := range g.bullets {
		if !g.bullets[bi].alive {
			continue
		}
		for ei := range g.enemies {
			if !g.enemies[ei].alive {
				continue
			}
			ex, ey := g.enemies[ei].pos.x, g.enemies[ei].pos.y
			bx, by := g.bullets[bi].pos.x, g.bullets[bi].pos.y
			if bx >= ex && bx <= ex+2 && (by == ey || by == ey+1) {
				g.bullets[bi].alive = false
				g.enemies[ei].hp--
				if g.enemies[ei].hp <= 0 {
					g.enemies[ei].alive = false
					pts := 10 * (g.enemies[ei].kind + 1)
					g.score += pts
					g.explosions = append(g.explosions, Explosion{pos: g.enemies[ei].pos})
					if g.score/100 >= g.level {
						g.level++
					}
				}
				break
			}
		}
	}

	// Player-Enemy collision
	for ei := range g.enemies {
		if !g.enemies[ei].alive {
			continue
		}
		ex, ey := g.enemies[ei].pos.x, g.enemies[ei].pos.y
		px, py := g.player.x, g.player.y
		if ey >= py-1 && ey <= py+1 && ex >= px-2 && ex <= px+2 {
			g.enemies[ei].alive = false
			g.explosions = append(g.explosions, Explosion{pos: g.player})
			g.lives--
			if g.lives <= 0 {
				g.gameOver = true
			}
		}
	}

	// Age explosions
	for i := range g.explosions {
		g.explosions[i].frame++
	}
	active := g.explosions[:0]
	for _, e := range g.explosions {
		if e.frame < 6 {
			active = append(active, e)
		}
	}
	g.explosions = active

	// Prune dead objects
	nb := g.bullets[:0]
	for _, b := range g.bullets {
		if b.alive {
			nb = append(nb, b)
		}
	}
	g.bullets = nb

	ne := g.enemies[:0]
	for _, e := range g.enemies {
		if e.alive {
			ne = append(ne, e)
		}
	}
	g.enemies = ne
}

func (g *Game) shoot() {
	if len(g.bullets) >= 5 {
		return
	}
	g.bullets = append(g.bullets, Bullet{
		pos:   Point{g.player.x, g.player.y - 1},
		alive: true,
	})
}

func (g *Game) moveLeft() {
	if g.player.x > 3 {
		g.player.x -= 2
	}
}

func (g *Game) moveRight() {
	if g.player.x < GameWidth-4 {
		g.player.x += 2
	}
}

// draw writes a sprite string at (x,y) in the grid.
func draw(grid [][]Cell, x, y int, s string, color string) {
	for i, ch := range s {
		cx := x + i
		if cx >= 0 && cx < GameWidth && y >= 0 && y < GameHeight {
			grid[y][cx] = Cell{ch, color}
		}
	}
}

func (g *Game) render() string {
	// Build character grid
	grid := make([][]Cell, GameHeight)
	for i := range grid {
		grid[i] = make([]Cell, GameWidth)
		for j := range grid[i] {
			grid[i][j] = Cell{' ', ""}
		}
	}

	// Stars
	starChars := []rune{'.', '*', '+'}
	for _, s := range g.stars {
		idx := (g.frameCount/4 + s.x + s.y) % len(starChars)
		grid[s.y][s.x] = Cell{starChars[idx], ColorWhite}
	}

	// Bullets
	for _, b := range g.bullets {
		draw(grid, b.pos.x, b.pos.y, "|", ColorYellow)
	}

	// Enemies
	// kind 0: /v\  ^^^
	// kind 1: <*>  vvv
	// kind 2: [#]  ===
	top := []string{"/v\\", "<*>", "[#]"}
	bot := []string{"^^^", "vvv", "==="}
	colors := []string{ColorRed, ColorPurple, ColorGreen}
	for _, e := range g.enemies {
		draw(grid, e.pos.x, e.pos.y, top[e.kind], colors[e.kind])
		draw(grid, e.pos.x, e.pos.y+1, bot[e.kind], colors[e.kind])
	}

	// Explosions
	expFrames := []string{"***", " * ", "   "}
	for _, ex := range g.explosions {
		if ex.frame < len(expFrames) {
			draw(grid, ex.pos.x-1, ex.pos.y, expFrames[ex.frame], ColorYellow)
		}
	}

	// Player ship:
	//   ^
	//  /=\
	//  / \
	px, py := g.player.x, g.player.y
	draw(grid, px, py-1, "^", ColorCyan)
	draw(grid, px-1, py, "/=\\", ColorCyan)
	draw(grid, px-1, py+1, "/ \\", ColorBlue)

	// Build output string
	var out string
	out += ColorWhite + "+" + repeat('-', GameWidth) + "+" + ColorReset + "\n"
	for y := 0; y < GameHeight; y++ {
		out += ColorWhite + "|" + ColorReset
		for x := 0; x < GameWidth; x++ {
			c := grid[y][x]
			if c.color != "" {
				out += c.color + string(c.ch) + ColorReset
			} else {
				out += string(c.ch)
			}
		}
		out += ColorWhite + "|" + ColorReset + "\n"
	}
	out += ColorWhite + "+" + repeat('-', GameWidth) + "+" + ColorReset + "\n"

	// HUD
	hearts := ""
	for i := 0; i < g.lives; i++ {
		hearts += ColorRed + "<3 " + ColorReset
	}
	out += fmt.Sprintf(BoldText+ColorCyan+" Score: %06d"+ColorReset+
		"  "+BoldText+ColorYellow+"Level: %d"+ColorReset+
		"  Lives: %s\n", g.score, g.level, hearts)
	out += ColorWhite + " [A/D or Arrow Keys] Move   [Space] Shoot   [Q] Quit" + ColorReset + "\n"

	if g.gameOver {
		out += "\n" + BoldText + ColorRed + "  *** GAME OVER ***  " + ColorReset +
			fmt.Sprintf("  "+ColorYellow+"Final Score: %d"+ColorReset, g.score) +
			"  " + ColorWhite + "[R] Restart  [Q] Quit" + ColorReset + "\n"
	}
	return out
}

func repeat(ch rune, n int) string {
	s := make([]rune, n)
	for i := range s {
		s[i] = ch
	}
	return string(s)
}

func clearScreen() {
	cmd := exec.Command("clear")
	cmd.Stdout = os.Stdout
	cmd.Run()
}

func moveCursor(row, col int) {
	fmt.Printf("\033[%d;%dH", row, col)
}

func hideCursor() { fmt.Print("\033[?25l") }
func showCursor() { fmt.Print("\033[?25h") }

func main() {
	oldState, err := term.MakeRaw(int(os.Stdin.Fd()))
	if err != nil {
		fmt.Println("Error setting raw mode:", err)
		os.Exit(1)
	}
	defer term.Restore(int(os.Stdin.Fd()), oldState)
	defer showCursor()

	hideCursor()
	clearScreen()

	game := newGame()

	inputCh := make(chan byte, 16)
	go func() {
		buf := make([]byte, 4)
		for {
			n, err := os.Stdin.Read(buf)
			if err != nil {
				return
			}
			for i := 0; i < n; i++ {
				inputCh <- buf[i]
			}
		}
	}()

	ticker := time.NewTicker(80 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			game.update()
			moveCursor(1, 1)
			fmt.Print(game.render())

		case key := <-inputCh:
			switch key {
			case 'q', 'Q', 3: // q, Q, Ctrl+C
				clearScreen()
				showCursor()
				fmt.Printf(BoldText+ColorYellow+"Thanks for playing! Final Score: %d\n"+ColorReset, game.score)
				return
			case 'r', 'R':
				if game.gameOver {
					game = newGame()
				}
			case ' ':
				if !game.gameOver {
					game.shoot()
				}
			case 'a', 'A':
				if !game.gameOver {
					game.moveLeft()
				}
			case 'd', 'D':
				if !game.gameOver {
					game.moveRight()
				}
			case 27: // ESC — may be arrow key sequence
				select {
				case next := <-inputCh:
					if next == '[' {
						select {
						case arrow := <-inputCh:
							switch arrow {
							case 'C':
								if !game.gameOver {
									game.moveRight()
								}
							case 'D':
								if !game.gameOver {
									game.moveLeft()
								}
							}
						default:
						}
					}
				default:
				}
			}
		}
	}
}
