const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const levelEl = document.getElementById('level');

const COLS = 20;
const ROWS = 20;
const CELL = canvas.width / COLS;

const DIRECTIONS = {
  ArrowUp:    { x: 0,  y: -1 },
  ArrowDown:  { x: 0,  y:  1 },
  ArrowLeft:  { x: -1, y:  0 },
  ArrowRight: { x: 1,  y:  0 },
  w: { x: 0,  y: -1 },
  s: { x: 0,  y:  1 },
  a: { x: -1, y:  0 },
  d: { x: 1,  y:  0 },
};

let snake, dir, nextDir, food, score, level, bestScore, gameLoop, paused, running;

function init() {
  snake = [
    { x: 10, y: 10 },
    { x: 9,  y: 10 },
    { x: 8,  y: 10 },
  ];
  dir     = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score   = 0;
  level   = 1;
  paused  = false;
  running = true;
  bestScore = parseInt(localStorage.getItem('snakeBest') || '0');
  bestScoreEl.textContent = bestScore;
  updateHUD();
  spawnFood();
}

function spawnFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

function getSpeed() {
  return Math.max(80, 200 - (level - 1) * 20);
}

function startGame() {
  overlay.classList.add('hidden');
  init();
  clearInterval(gameLoop);
  gameLoop = setInterval(tick, getSpeed());
}

function tick() {
  if (paused || !running) return;

  dir = { ...nextDir };

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return endGame();
  }

  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += level * 10;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('snakeBest', bestScore);
    }
    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel !== level) {
      level = newLevel;
      clearInterval(gameLoop);
      gameLoop = setInterval(tick, getSpeed());
    }
    updateHUD();
    spawnFood();
  } else {
    snake.pop();
  }

  draw();
}

function endGame() {
  running = false;
  clearInterval(gameLoop);
  overlayTitle.textContent = '游戏结束';
  overlayMessage.textContent = `得分：${score}　最高分：${bestScore}`;
  startBtn.textContent = '再来一局';
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    overlayTitle.textContent = '已暂停';
    overlayMessage.textContent = '按 P 继续游戏';
    startBtn.textContent = '继续';
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

function updateHUD() {
  scoreEl.textContent  = score;
  bestScoreEl.textContent = bestScore;
  levelEl.textContent  = level;
}

// ── Drawing ──────────────────────────────────────────────

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawFood();
  drawSnake();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(canvas.width, y * CELL);
    ctx.stroke();
  }
}

function drawFood() {
  const cx = food.x * CELL + CELL / 2;
  const cy = food.y * CELL + CELL / 2;
  const r  = CELL / 2 - 3;

  // Glow
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r + 4);
  grd.addColorStop(0, 'rgba(255, 80, 80, 0.6)');
  grd.addColorStop(1, 'rgba(255, 80, 80, 0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fill();

  // Apple
  ctx.fillStyle = '#ff5050';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnake() {
  snake.forEach((seg, i) => {
    const x = seg.x * CELL + 1;
    const y = seg.y * CELL + 1;
    const s = CELL - 2;
    const radius = i === 0 ? 6 : 4;

    if (i === 0) {
      // Head — brighter
      ctx.fillStyle = '#4ecca3';
    } else {
      const t = i / snake.length;
      const r = Math.round(lerp(78,  30,  t));
      const g = Math.round(lerp(204, 140, t));
      const b = Math.round(lerp(163, 100, t));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
    }

    roundRect(ctx, x, y, s, s, radius);
    ctx.fill();

    // Eyes on head
    if (i === 0) {
      drawEyes(seg);
    }
  });
}

function drawEyes(head) {
  const cx = head.x * CELL + CELL / 2;
  const cy = head.y * CELL + CELL / 2;
  const eyeR = 2.5;
  const offset = 4;

  let e1, e2;
  if (dir.x === 1)       { e1 = { x: cx + 4, y: cy - offset }; e2 = { x: cx + 4, y: cy + offset }; }
  else if (dir.x === -1) { e1 = { x: cx - 4, y: cy - offset }; e2 = { x: cx - 4, y: cy + offset }; }
  else if (dir.y === -1) { e1 = { x: cx - offset, y: cy - 4 }; e2 = { x: cx + offset, y: cy - 4 }; }
  else                   { e1 = { x: cx - offset, y: cy + 4 }; e2 = { x: cx + offset, y: cy + 4 }; }

  ctx.fillStyle = '#1a1a2e';
  [e1, e2].forEach(e => {
    ctx.beginPath();
    ctx.arc(e.x, e.y, eyeR, 0, Math.PI * 2);
    ctx.fill();
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ── Input ────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'p' || e.key === 'P') {
    if (running) togglePause();
    return;
  }
  const d = DIRECTIONS[e.key];
  if (!d) return;
  e.preventDefault();
  // Prevent reversing
  if (d.x === -dir.x && d.y === -dir.y) return;
  nextDir = d;
});

startBtn.addEventListener('click', () => {
  if (paused) {
    togglePause();
  } else {
    startGame();
  }
});

// Mobile buttons
document.getElementById('btn-up').addEventListener('click',    () => setDir({ x: 0,  y: -1 }));
document.getElementById('btn-down').addEventListener('click',  () => setDir({ x: 0,  y:  1 }));
document.getElementById('btn-left').addEventListener('click',  () => setDir({ x: -1, y:  0 }));
document.getElementById('btn-right').addEventListener('click', () => setDir({ x: 1,  y:  0 }));

function setDir(d) {
  if (d.x === -dir.x && d.y === -dir.y) return;
  nextDir = d;
}

// Touch swipe
let touchStart = null;
canvas.addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    setDir(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
  } else {
    setDir(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
  }
  touchStart = null;
}, { passive: true });

// Initial draw
draw();
