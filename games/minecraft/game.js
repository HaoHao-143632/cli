import * as THREE from 'three';

// ============================================================================
//  我的世界 · Mini Craft — 一个单文件体素游戏引擎
// ============================================================================

// ---------- 方块定义 ----------------------------------------------------------
// 每种方块的颜色（顶/侧/底可不同），以及是否透明。
const BLOCKS = {
  1: { name: '草方块', top: 0x6abe30, side: 0x8a6240, bottom: 0x8a6240 },
  2: { name: '泥土',   top: 0x8a6240, side: 0x8a6240, bottom: 0x8a6240 },
  3: { name: '石头',   top: 0x888888, side: 0x888888, bottom: 0x888888 },
  4: { name: '木头',   top: 0xb5905a, side: 0x6e4f2f, bottom: 0xb5905a },
  5: { name: '树叶',   top: 0x3aaa35, side: 0x3aaa35, bottom: 0x3aaa35 },
  6: { name: '沙子',   top: 0xe8dca0, side: 0xe8dca0, bottom: 0xe8dca0 },
  7: { name: '砖块',   top: 0xa6402f, side: 0xa6402f, bottom: 0xa6402f },
  8: { name: '玻璃',   top: 0xbfe6ff, side: 0xbfe6ff, bottom: 0xbfe6ff, transparent: true },
};
const HOTBAR = [1, 2, 3, 4, 5, 6, 7, 8];

// ---------- 世界参数 ----------------------------------------------------------
const WORLD = {
  size: 48,        // 世界水平边长（方块数）
  height: 32,      // 世界最大高度
  seaLevel: 8,     // 基准地面高度
};

// ============================================================================
//  伪随机噪声（确定性，无需外部库）
// ============================================================================
function makeNoise(seed) {
  // 基于哈希的值噪声 + 双线性插值，足够生成起伏地形。
  function hash(x, y) {
    let h = seed + x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const tl = hash(xi, yi), tr = hash(xi + 1, yi);
    const bl = hash(xi, yi + 1), br = hash(xi + 1, yi + 1);
    const u = smooth(xf), v = smooth(yf);
    return lerp(lerp(tl, tr, u), lerp(bl, br, u), v);
  };
}

// ============================================================================
//  世界数据：用一维 Uint8Array 存储体素，0 = 空气
// ============================================================================
class VoxelWorld {
  constructor() {
    this.size = WORLD.size;
    this.height = WORLD.height;
    this.data = new Uint8Array(this.size * this.size * this.height);
    this.generate();
  }
  idx(x, y, z) {
    if (x < 0 || z < 0 || x >= this.size || z >= this.size || y < 0 || y >= this.height) return -1;
    return (y * this.size + z) * this.size + x;
  }
  get(x, y, z) { const i = this.idx(x, y, z); return i < 0 ? 0 : this.data[i]; }
  set(x, y, z, v) { const i = this.idx(x, y, z); if (i >= 0) this.data[i] = v; }

  generate() {
    const noise = makeNoise(1337);
    const noise2 = makeNoise(8675309);
    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const n = noise(x / 14, z / 14) * 0.7 + noise2(x / 5, z / 5) * 0.3;
        const h = Math.floor(WORLD.seaLevel + n * 12);
        for (let y = 0; y <= h; y++) {
          let block;
          if (y === h) block = h < WORLD.seaLevel + 1 ? 6 : 1; // 顶层：草或沙
          else if (y > h - 3) block = 2;                       // 表层：泥土
          else block = 3;                                       // 深层：石头
          this.set(x, y, z, block);
        }
        // 随机种树
        if (h >= WORLD.seaLevel + 1 && Math.random() < 0.02 &&
            x > 2 && z > 2 && x < this.size - 3 && z < this.size - 3) {
          this.plantTree(x, h + 1, z);
        }
      }
    }
  }

  plantTree(x, y, z) {
    const trunk = 4;
    for (let i = 0; i < trunk; i++) this.set(x, y + i, z, 4);
    const top = y + trunk;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let dy = -1; dy <= 1; dy++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          if (this.get(x + dx, top + dy, z + dz) === 0) this.set(x + dx, top + dy, z + dz, 5);
        }
    this.set(x, top + 1, z, 5);
  }
}

// ============================================================================
//  网格构建：贪心式逐面剔除（只渲染暴露的面）
// ============================================================================
const FACES = [
  { dir: [ 1, 0, 0], corners: [[1,1,0],[1,0,0],[1,1,1],[1,0,1]], key: 'side' },
  { dir: [-1, 0, 0], corners: [[0,1,1],[0,0,1],[0,1,0],[0,0,0]], key: 'side' },
  { dir: [ 0, 1, 0], corners: [[0,1,1],[1,1,1],[0,1,0],[1,1,0]], key: 'top' },
  { dir: [ 0,-1, 0], corners: [[0,0,0],[1,0,0],[0,0,1],[1,0,1]], key: 'bottom' },
  { dir: [ 0, 0, 1], corners: [[1,1,1],[0,1,1],[1,0,1],[0,0,1]], key: 'side' },
  { dir: [ 0, 0,-1], corners: [[0,1,0],[1,1,0],[0,0,0],[1,0,0]], key: 'side' },
];

function buildGeometry(world) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  const tPositions = [], tNormals = [], tColors = [], tIndices = []; // 透明方块单独一组

  const col = new THREE.Color();
  for (let y = 0; y < world.height; y++) {
    for (let z = 0; z < world.size; z++) {
      for (let x = 0; x < world.size; x++) {
        const v = world.get(x, y, z);
        if (v === 0) continue;
        const def = BLOCKS[v];
        const transparent = !!def.transparent;
        for (const face of FACES) {
          const [dx, dy, dz] = face.dir;
          const neighbor = world.get(x + dx, y + dy, z + dz);
          const nDef = BLOCKS[neighbor];
          // 邻居为空气，或邻居透明而自己不透明 → 这一面可见
          if (neighbor !== 0 && !(nDef && nDef.transparent && !transparent)) continue;
          if (neighbor !== 0 && transparent) continue; // 透明方块相邻面不绘制

          const P = transparent ? tPositions : positions;
          const N = transparent ? tNormals : normals;
          const C = transparent ? tColors : colors;
          const I = transparent ? tIndices : indices;
          const base = P.length / 3;
          col.setHex(def[face.key]);
          // 简单方向光照：让不同朝向有明暗对比
          const shade = dy > 0 ? 1.0 : dy < 0 ? 0.6 : (dx !== 0 ? 0.8 : 0.7);
          for (const c of face.corners) {
            P.push(x + c[0], y + c[1], z + c[2]);
            N.push(dx, dy, dz);
            C.push(col.r * shade, col.g * shade, col.b * shade);
          }
          I.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
        }
      }
    }
  }

  function make(P, N, C, I) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    g.setIndex(I);
    return g;
  }
  return {
    opaque: make(positions, normals, colors, indices),
    transparent: make(tPositions, tNormals, tColors, tIndices),
    count: (positions.length + tPositions.length) / 12,
  };
}

// ============================================================================
//  主程序
// ============================================================================
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 70);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);

// 光照
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(0.5, 1, 0.3);
scene.add(sun);

// 世界 + 网格
const world = new VoxelWorld();
const opaqueMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const transMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.55 });
let opaqueMesh = null, transMesh = null;
let blockCount = 0;

function rebuildMesh() {
  const built = buildGeometry(world);
  if (opaqueMesh) { scene.remove(opaqueMesh); opaqueMesh.geometry.dispose(); }
  if (transMesh) { scene.remove(transMesh); transMesh.geometry.dispose(); }
  opaqueMesh = new THREE.Mesh(built.opaque, opaqueMat);
  transMesh = new THREE.Mesh(built.transparent, transMat);
  scene.add(opaqueMesh);
  scene.add(transMesh);
  blockCount = built.count;
}
rebuildMesh();

// 高亮被瞄准的方块
const highlight = new THREE.Mesh(
  new THREE.BoxGeometry(1.001, 1.001, 1.001),
  new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.4 })
);
highlight.visible = false;
scene.add(highlight);

// ---------- 玩家状态 ----------------------------------------------------------
const player = {
  pos: new THREE.Vector3(WORLD.size / 2, WORLD.height, WORLD.size / 2),
  vel: new THREE.Vector3(),
  yaw: 0, pitch: 0,
  onGround: false,
  flying: false,
  height: 1.7,   // 眼睛高度
  radius: 0.3,
};
// 落到地面上方
for (let y = WORLD.height - 1; y > 0; y--) {
  if (world.get(Math.floor(player.pos.x), y, Math.floor(player.pos.z)) !== 0) {
    player.pos.y = y + 1 + player.height; break;
  }
}

let selected = 0; // hotbar 索引

// ---------- 输入 -------------------------------------------------------------
const keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyF') player.flying = !player.flying;
  if (e.code.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5), 10);
    if (n >= 1 && n <= HOTBAR.length) { selected = n - 1; updateHotbar(); }
  }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

document.addEventListener('wheel', (e) => {
  selected = (selected + (e.deltaY > 0 ? 1 : -1) + HOTBAR.length) % HOTBAR.length;
  updateHotbar();
});

// 指针锁定 + 视角
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
startBtn.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  overlay.classList.toggle('hidden', document.pointerLockElement === canvas);
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * 0.0025;
  player.pitch -= e.movementY * 0.0025;
  const lim = Math.PI / 2 - 0.01;
  player.pitch = Math.max(-lim, Math.min(lim, player.pitch));
});

// 破坏 / 放置
canvas.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas) return;
  const hit = raycastVoxel();
  if (!hit) return;
  if (e.button === 0) {
    // 破坏
    world.set(hit.x, hit.y, hit.z, 0);
    rebuildMesh();
  } else if (e.button === 2) {
    // 放置在命中面的外侧
    const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
    if (!intersectsPlayer(px, py, pz)) {
      world.set(px, py, pz, HOTBAR[selected]);
      rebuildMesh();
    }
  }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- 射线投射（DDA 体素遍历）-----------------------------------------
function raycastVoxel() {
  const dir = new THREE.Vector3(
    Math.cos(player.pitch) * Math.sin(player.yaw),
    Math.sin(player.pitch),
    Math.cos(player.pitch) * Math.cos(player.yaw)
  );
  // 摄像机看向 -Z 方向，需取反
  dir.set(-Math.sin(player.yaw) * Math.cos(player.pitch),
           Math.sin(player.pitch),
          -Math.cos(player.yaw) * Math.cos(player.pitch));
  const origin = player.pos.clone();
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
  const stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z);
  const tDeltaX = Math.abs(1 / dir.x), tDeltaY = Math.abs(1 / dir.y), tDeltaZ = Math.abs(1 / dir.z);
  let tMaxX = tDeltaX * (stepX > 0 ? (x + 1 - origin.x) : (origin.x - x));
  let tMaxY = tDeltaY * (stepY > 0 ? (y + 1 - origin.y) : (origin.y - y));
  let tMaxZ = tDeltaZ * (stepZ > 0 ? (z + 1 - origin.z) : (origin.z - z));
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < 64; i++) {
    if (world.get(x, y, z) !== 0) return { x, y, z, nx, ny, nz };
    if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0; }
    else if (tMaxY < tMaxZ) { y += stepY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0; }
    else { z += stepZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
  }
  return null;
}

// ---------- 碰撞 -------------------------------------------------------------
function solidAt(x, y, z) {
  const v = world.get(Math.floor(x), Math.floor(y), Math.floor(z));
  return v !== 0;
}
// 玩家 AABB 与某方块是否相交
function intersectsPlayer(bx, by, bz) {
  const r = player.radius;
  const minX = player.pos.x - r, maxX = player.pos.x + r;
  const minY = player.pos.y - player.height, maxY = player.pos.y + 0.2;
  const minZ = player.pos.z - r, maxZ = player.pos.z + r;
  return bx + 1 > minX && bx < maxX && by + 1 > minY && by < maxY && bz + 1 > minZ && bz < maxZ;
}
// 检测玩家盒子是否与世界碰撞
function collides(px, py, pz) {
  const r = player.radius;
  for (let x = Math.floor(px - r); x <= Math.floor(px + r); x++)
    for (let z = Math.floor(pz - r); z <= Math.floor(pz + r); z++)
      for (let y = Math.floor(py - player.height); y <= Math.floor(py + 0.2); y++)
        if (solidAt(x, y, z)) return true;
  return false;
}

// ---------- 物理与移动 -------------------------------------------------------
function updatePhysics(dt) {
  const speed = player.flying ? 9 : 5;
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const move = new THREE.Vector3();
  if (keys['KeyW']) move.add(forward);
  if (keys['KeyS']) move.sub(forward);
  if (keys['KeyD']) move.add(right);
  if (keys['KeyA']) move.sub(right);
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);

  if (player.flying) {
    player.vel.x = move.x; player.vel.z = move.z;
    player.vel.y = 0;
    if (keys['Space']) player.vel.y = speed;
    if (keys['ShiftLeft']) player.vel.y = -speed;
  } else {
    player.vel.x = move.x; player.vel.z = move.z;
    player.vel.y -= 24 * dt; // 重力
    if (keys['Space'] && player.onGround) { player.vel.y = 8.5; player.onGround = false; }
  }

  // 分轴移动 + 碰撞
  const np = player.pos.clone();
  const tryAxis = (axis) => {
    const old = np[axis];
    np[axis] += player.vel[axis] * dt;
    if (!player.flying && collides(np.x, np.y, np.z)) {
      if (axis === 'y') {
        if (player.vel.y < 0) player.onGround = true;
        player.vel.y = 0;
      }
      np[axis] = old;
    } else if (player.flying) {
      // 飞行时也保留软碰撞，避免穿墙太离谱
      if (collides(np.x, np.y, np.z)) np[axis] = old;
    }
  };
  if (player.flying) {
    np.x += player.vel.x * dt; if (collides(np.x, np.y, np.z)) np.x -= player.vel.x * dt;
    np.y += player.vel.y * dt; if (collides(np.x, np.y, np.z)) np.y -= player.vel.y * dt;
    np.z += player.vel.z * dt; if (collides(np.x, np.y, np.z)) np.z -= player.vel.z * dt;
  } else {
    player.onGround = false;
    tryAxis('y'); tryAxis('x'); tryAxis('z');
  }
  player.pos.copy(np);

  // 跌出世界则重生
  if (player.pos.y < -10) {
    player.pos.set(WORLD.size / 2, WORLD.height + 2, WORLD.size / 2);
    player.vel.set(0, 0, 0);
  }
}

// ---------- HUD / 物品栏 -----------------------------------------------------
const hotbarEl = document.getElementById('hotbar');
function buildHotbar() {
  hotbarEl.innerHTML = '';
  HOTBAR.forEach((id, i) => {
    const def = BLOCKS[id];
    const slot = document.createElement('div');
    slot.className = 'slot' + (i === selected ? ' active' : '');
    slot.innerHTML =
      `<span class="key">${i + 1}</span>` +
      `<span class="swatch" style="background:#${def.top.toString(16).padStart(6, '0')}"></span>` +
      `<span class="name">${def.name}</span>`;
    slot.addEventListener('click', () => { selected = i; updateHotbar(); });
    hotbarEl.appendChild(slot);
  });
}
function updateHotbar() {
  [...hotbarEl.children].forEach((c, i) => c.classList.toggle('active', i === selected));
}
buildHotbar();

const posEl = document.getElementById('pos');
const dirEl = document.getElementById('dir');
const blocksEl = document.getElementById('blocks');
const fpsEl = document.getElementById('fps');

function compass() {
  const deg = ((player.yaw * 180 / Math.PI) % 360 + 360) % 360;
  const dirs = ['南', '西南', '西', '西北', '北', '东北', '东', '东南'];
  return dirs[Math.round(deg / 45) % 8];
}

// ---------- 渲染循环 ---------------------------------------------------------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
let fpsAccum = 0, fpsFrames = 0, fpsTimer = 0;

function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05); // 防止卡顿后跳跃

  updatePhysics(dt);

  // 摄像机
  camera.position.copy(player.pos);
  const dir = new THREE.Vector3(
    -Math.sin(player.yaw) * Math.cos(player.pitch),
     Math.sin(player.pitch),
    -Math.cos(player.yaw) * Math.cos(player.pitch)
  );
  camera.lookAt(player.pos.clone().add(dir));

  // 方块高亮
  const hit = raycastVoxel();
  if (hit) {
    highlight.visible = true;
    highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  } else highlight.visible = false;

  renderer.render(scene, camera);

  // HUD
  posEl.textContent = `${player.pos.x.toFixed(1)}, ${player.pos.y.toFixed(1)}, ${player.pos.z.toFixed(1)}` +
                      (player.flying ? '  ✈飞行' : '');
  dirEl.textContent = compass();
  blocksEl.textContent = blockCount;
  fpsAccum += 1 / dt; fpsFrames++; fpsTimer += dt;
  if (fpsTimer > 0.5) { fpsEl.textContent = Math.round(fpsAccum / fpsFrames); fpsAccum = fpsFrames = fpsTimer = 0; }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
