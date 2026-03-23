// ===== GLYPH DRAWER — Mobile-Optimized Pixel Editor =====
'use strict';

// ===== STATE =====
const S = {
  size: 32,
  grid: new Array(32 * 32).fill(null), // flat array for performance
  tool: 'pencil',
  color: '#ffffff',
  showGrid: true,
  scale: 1,
  past: [],
  future: [],
  maxHistory: 40,
};

// Minecraft color palette
const DEFAULT_PALETTE = [
  '#000000', '#0000aa', '#00aa00', '#00aaaa',
  '#aa0000', '#aa00aa', '#ffaa00', '#aaaaaa',
  '#555555', '#5555ff', '#55ff55', '#55ffff',
  '#ff5555', '#ff55ff', '#ffff55', '#ffffff',
  '#ddd605', '#4a80d4', '#be4a2f', '#d77643',
  '#ead4aa', '#e4a672', '#b86f50', '#733e39',
  '#3e2731', '#a22633', '#e43b44', '#f77622',
  '#feae34', '#fee761', '#63c74d', '#3e8948',
  '#265c42', '#193c3e', '#124e89', '#0099db',
  '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4',
  '#5a6988', '#3a4466', '#262b44', '#181425',
];

// ===== DOM =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const canvas = $('#canvas');
const ctx = canvas.getContext('2d', { desynchronized: true, willReadFrequently: true });
const wrap = $('#canvas-wrap');

// ===== RENDERING =====
let cellSize = 1;
let canvasRect = null;
let rafId = 0;
let needsRender = true;
let hoverX = -1, hoverY = -1;
let previewPixels = null; // for line/rect preview

function calcCellSize() {
  const r = wrap.getBoundingClientRect();
  const pad = 8;
  const avail = Math.min(r.width - pad, r.height - pad);
  cellSize = Math.max(2, Math.floor(avail / S.size));
  const total = cellSize * S.size;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = total * dpr;
  canvas.height = total * dpr;
  canvas.style.width = total + 'px';
  canvas.style.height = total + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvasRect = canvas.getBoundingClientRect();
  needsRender = true;
}

function render() {
  if (!needsRender) { rafId = requestAnimationFrame(render); return; }
  needsRender = false;

  const sz = S.size;
  const cs = cellSize;
  const total = cs * sz;

  // Clear
  ctx.clearRect(0, 0, total, total);

  // Draw pixels
  for (let i = 0; i < sz * sz; i++) {
    if (S.grid[i] !== null) {
      ctx.fillStyle = S.grid[i];
      const x = (i % sz) * cs;
      const y = ((i / sz) | 0) * cs;
      ctx.fillRect(x, y, cs, cs);
    }
  }

  // Draw preview (line/rect tool)
  if (previewPixels && previewPixels.length > 0) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = S.color;
    for (let i = 0; i < previewPixels.length; i++) {
      const px = previewPixels[i];
      ctx.fillRect(px[0] * cs, px[1] * cs, cs, cs);
    }
    ctx.globalAlpha = 1;
  }

  // Grid
  if (S.showGrid && cs >= 4) {
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--border').trim() || '#30363d';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 0; i <= sz; i++) {
      const p = i * cs;
      ctx.moveTo(p, 0); ctx.lineTo(p, total);
      ctx.moveTo(0, p); ctx.lineTo(total, p);
    }
    ctx.stroke();

    // Center lines
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--text2').trim() || '#8b949e';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    const half = (sz / 2) * cs;
    ctx.beginPath();
    ctx.moveTo(half, 0); ctx.lineTo(half, total);
    ctx.moveTo(0, half); ctx.lineTo(total, half);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Hover highlight
  if (hoverX >= 0 && hoverX < sz && hoverY >= 0 && hoverY < sz) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.strokeRect(hoverX * cs + 0.5, hoverY * cs + 0.5, cs - 1, cs - 1);
    ctx.globalAlpha = 1;
  }

  rafId = requestAnimationFrame(render);
}

// ===== HISTORY =====
function pushHistory() {
  S.past.push(S.grid.slice());
  if (S.past.length > S.maxHistory) S.past.shift();
  S.future.length = 0;
  updateHistoryBtns();
}

function undo() {
  if (S.past.length === 0) return;
  S.future.push(S.grid.slice());
  S.grid = S.past.pop();
  updateHistoryBtns();
  needsRender = true;
  save();
}

function redo() {
  if (S.future.length === 0) return;
  S.past.push(S.grid.slice());
  S.grid = S.future.pop();
  updateHistoryBtns();
  needsRender = true;
  save();
}

function updateHistoryBtns() {
  $('#btnUndo').disabled = S.past.length === 0;
  $('#btnRedo').disabled = S.future.length === 0;
}

// ===== GRID HELPERS =====
function idx(x, y) { return y * S.size + x; }
function inBounds(x, y) { return x >= 0 && x < S.size && y >= 0 && y < S.size; }

function setPixel(x, y, color) {
  if (!inBounds(x, y)) return;
  S.grid[idx(x, y)] = color;
  needsRender = true;
}

function getPixel(x, y) {
  if (!inBounds(x, y)) return undefined;
  return S.grid[idx(x, y)];
}

// ===== ALGORITHMS =====
function bresenham(x0, y0, x1, y1) {
  const pixels = [];
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    pixels.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return pixels;
}

function rectPixels(x0, y0, x1, y1) {
  const pixels = [];
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++)
      pixels.push([x, y]);
  return pixels;
}

function floodFill(sx, sy, newColor) {
  const srcColor = getPixel(sx, sy);
  if (srcColor === newColor) return;
  const sz = S.size;
  const stack = [[sx, sy]];
  const visited = new Uint8Array(sz * sz);
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const i = idx(x, y);
    if (!inBounds(x, y) || visited[i] || S.grid[i] !== srcColor) continue;
    visited[i] = 1;
    S.grid[i] = newColor;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  needsRender = true;
}

// ===== POINTER / TOUCH INPUT =====
let drawing = false;
let startX = -1, startY = -1;
let visited = new Set();

function pointerToGrid(e) {
  if (!canvasRect) canvasRect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - canvasRect.left) / cellSize);
  const y = Math.floor((e.clientY - canvasRect.top) / cellSize);
  return [x, y];
}

function onPointerDown(e) {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  const [x, y] = pointerToGrid(e);
  if (!inBounds(x, y)) return;

  drawing = true;
  startX = x; startY = y;
  visited.clear();

  switch (S.tool) {
    case 'pencil':
      pushHistory();
      visited.add(idx(x, y));
      setPixel(x, y, S.color);
      break;
    case 'eraser':
      pushHistory();
      visited.add(idx(x, y));
      setPixel(x, y, null);
      break;
    case 'fill':
      pushHistory();
      floodFill(x, y, S.color);
      save();
      drawing = false;
      break;
    case 'eyedropper': {
      const c = getPixel(x, y);
      if (c) setColor(c);
      drawing = false;
      break;
    }
    case 'line':
    case 'rect':
      pushHistory();
      break;
  }
}

function onPointerMove(e) {
  const [x, y] = pointerToGrid(e);
  hoverX = x; hoverY = y;
  needsRender = true;
  updateStatus(x, y);

  if (!drawing) return;
  e.preventDefault();

  switch (S.tool) {
    case 'pencil': {
      // Interpolate from last point for smooth drawing
      const lastKey = [...visited].pop();
      const lx = lastKey % S.size, ly = (lastKey / S.size) | 0;
      const pts = bresenham(lx, ly, x, y);
      for (const [px, py] of pts) {
        const k = idx(px, py);
        if (!visited.has(k) && inBounds(px, py)) {
          visited.add(k);
          setPixel(px, py, S.color);
        }
      }
      break;
    }
    case 'eraser': {
      const lastKey = [...visited].pop();
      const lx = lastKey % S.size, ly = (lastKey / S.size) | 0;
      const pts = bresenham(lx, ly, x, y);
      for (const [px, py] of pts) {
        const k = idx(px, py);
        if (!visited.has(k) && inBounds(px, py)) {
          visited.add(k);
          setPixel(px, py, null);
        }
      }
      break;
    }
    case 'line':
      previewPixels = bresenham(startX, startY, x, y);
      needsRender = true;
      break;
    case 'rect':
      previewPixels = rectPixels(startX, startY, x, y);
      needsRender = true;
      break;
  }
}

function onPointerUp(e) {
  if (!drawing) return;
  drawing = false;
  const [x, y] = pointerToGrid(e);

  switch (S.tool) {
    case 'line': {
      const pts = bresenham(startX, startY, x, y);
      for (const [px, py] of pts) setPixel(px, py, S.color);
      break;
    }
    case 'rect': {
      const pts = rectPixels(startX, startY, x, y);
      for (const [px, py] of pts) setPixel(px, py, S.color);
      break;
    }
  }

  previewPixels = null;
  needsRender = true;
  save();
}

function onPointerLeave() {
  hoverX = -1; hoverY = -1;
  needsRender = true;
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointerleave', onPointerLeave);
canvas.addEventListener('pointercancel', onPointerUp);
// Prevent context menu on long press (mobile)
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ===== RESIZE =====
const ro = new ResizeObserver(() => { calcCellSize(); });
ro.observe(wrap);

// ===== TOOLS =====
function setTool(t) {
  S.tool = t;
  $$('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
}

$$('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

// ===== COLOR =====
let palette = [...DEFAULT_PALETTE];

function setColor(c) {
  S.color = c;
  $('#colorPicker').value = c;
  $('#colorHex').value = c;
  updatePaletteUI();
  updateStatusColor();
}

function updatePaletteUI() {
  const el = $('#palette');
  el.innerHTML = '';
  for (const c of palette) {
    const sw = document.createElement('button');
    sw.className = 'swatch' + (c === S.color ? ' active' : '');
    sw.style.background = c;
    sw.addEventListener('click', () => setColor(c));
    el.appendChild(sw);
  }
}

$('#colorPicker').addEventListener('input', (e) => setColor(e.target.value));
$('#colorHex').addEventListener('change', (e) => {
  const v = e.target.value;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(v);
});
$('#addColor').addEventListener('click', () => {
  const c = S.color;
  if (!palette.includes(c)) {
    palette.push(c);
    updatePaletteUI();
    save();
    toast('Color added', 'success');
  }
});

// ===== CANVAS SIZE =====
function resizeCanvas(newSize) {
  newSize = Math.max(2, Math.min(512, newSize | 0));
  if (newSize === S.size) return;

  pushHistory();
  const oldGrid = S.grid;
  const oldSize = S.size;
  const newGrid = new Array(newSize * newSize).fill(null);

  // Nearest-neighbor resample
  for (let y = 0; y < newSize; y++) {
    for (let x = 0; x < newSize; x++) {
      const sx = Math.floor(x * oldSize / newSize);
      const sy = Math.floor(y * oldSize / newSize);
      newGrid[y * newSize + x] = oldGrid[sy * oldSize + sx];
    }
  }

  S.size = newSize;
  S.grid = newGrid;
  visited = new Set();

  // Update UI
  $$('.size-pills .pill').forEach(p => p.classList.toggle('active', +p.dataset.size === newSize));
  $('#customSize').value = newSize;
  $('#statusSize').textContent = newSize + 'x' + newSize;

  calcCellSize();
  save();
}

$$('.size-pills .pill').forEach(p => {
  p.addEventListener('click', () => resizeCanvas(+p.dataset.size));
});
$('#applySize').addEventListener('click', () => resizeCanvas(+$('#customSize').value));

// ===== EXPORT =====
function exportPNG() {
  const sc = S.scale;
  const sz = S.size;
  const c = document.createElement('canvas');
  c.width = sz * sc;
  c.height = sz * sc;
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = false;

  for (let i = 0; i < sz * sz; i++) {
    if (S.grid[i] !== null) {
      cx.fillStyle = S.grid[i];
      cx.fillRect((i % sz) * sc, ((i / sz) | 0) * sc, sc, sc);
    }
  }

  const link = document.createElement('a');
  link.download = `glyph-${sz}${sc > 1 ? '@' + sc + 'x' : ''}.png`;
  link.href = c.toDataURL('image/png');
  link.click();
  toast('Exported ' + link.download, 'success');
}

$$('.scale-pills .pill').forEach(p => {
  p.addEventListener('click', () => {
    S.scale = +p.dataset.scale;
    $$('.scale-pills .pill').forEach(b => b.classList.toggle('active', +b.dataset.scale === S.scale));
  });
});
$('#btnExport').addEventListener('click', exportPNG);

// ===== IMPORT =====
function importPNG(file) {
  if (!file || !file.type.startsWith('image/')) {
    toast('Only PNG files', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.min(img.width, 512);
      const h = Math.min(img.height, 512);
      const sz = Math.max(w, h);

      pushHistory();
      S.size = sz;
      S.grid = new Array(sz * sz).fill(null);

      const tc = document.createElement('canvas');
      tc.width = w; tc.height = h;
      const tcx = tc.getContext('2d');
      tcx.drawImage(img, 0, 0);
      const data = tcx.getImageData(0, 0, w, h).data;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (data[i + 3] > 10) {
            const hex = '#' + ((1 << 24) + (data[i] << 16) + (data[i + 1] << 8) + data[i + 2]).toString(16).slice(1);
            S.grid[y * sz + x] = hex;
          }
        }
      }

      $$('.size-pills .pill').forEach(p => p.classList.toggle('active', +p.dataset.size === sz));
      $('#customSize').value = sz;
      $('#statusSize').textContent = sz + 'x' + sz;
      calcCellSize();
      save();
      toast('Imported ' + w + 'x' + h, 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

const dropZone = $('#dropZone');
const fileInput = $('#fileInput');

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) importPNG(e.target.files[0]);
  e.target.value = '';
});

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) importPNG(e.dataTransfer.files[0]);
});

// ===== GRID TOGGLE =====
$('#btnGrid').addEventListener('click', () => {
  S.showGrid = !S.showGrid;
  $('#btnGrid').classList.toggle('active', S.showGrid);
  needsRender = true;
  save();
});

// ===== THEME =====
function loadTheme() {
  const saved = localStorage.getItem('glyph-theme');
  if (saved) {
    document.documentElement.dataset.theme = saved;
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.dataset.theme = 'light';
  }
}

$('#btnTheme').addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme;
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('glyph-theme', next);
  needsRender = true;
});

// ===== PROPS PANEL =====
const props = $('#props');
const propsToggle = $('#propsToggle');
const isMobile = () => window.innerWidth <= 768;

propsToggle.addEventListener('click', () => {
  if (isMobile()) {
    props.classList.toggle('open');
  } else {
    props.classList.toggle('collapsed');
    setTimeout(calcCellSize, 220);
  }
});

// Collapse panels
$$('.panel-title').forEach(t => {
  t.addEventListener('click', () => {
    t.classList.toggle('collapsed');
  });
});

// ===== KEYBOARD =====
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); redo(); return; }
  if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); return; }
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exportPNG(); return; }

  switch (e.key.toLowerCase()) {
    case 'b': setTool('pencil'); break;
    case 'e': setTool('eraser'); break;
    case 'g': setTool('fill'); break;
    case 'i': setTool('eyedropper'); break;
    case 'l': setTool('line'); break;
    case 'r': setTool('rect'); break;
  }
});

// ===== UNDO/REDO BUTTONS =====
$('#btnUndo').addEventListener('click', undo);
$('#btnRedo').addEventListener('click', redo);

// ===== STATUS BAR =====
function updateStatus(x, y) {
  $('#statusCoord').textContent = inBounds(x, y) ? `${x}, ${y}` : '';
}
function updateStatusColor() {
  const el = $('#statusColor');
  el.style.background = S.color;
}

// ===== TOAST =====
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }, 2500);
}

// ===== PERSISTENCE =====
const SAVE_KEY = 'glyph-drawer-v1';

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      size: S.size,
      grid: S.grid,
      color: S.color,
      showGrid: S.showGrid,
      palette: palette,
    }));
  } catch (e) { /* quota exceeded — ignore */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.size) { S.size = d.size; S.grid = d.grid || new Array(d.size * d.size).fill(null); }
    if (d.color) S.color = d.color;
    if (d.showGrid !== undefined) S.showGrid = d.showGrid;
    if (d.palette) palette = d.palette;
  } catch (e) { /* corrupted — ignore */ }
}

// ===== INIT =====
function init() {
  loadTheme();
  load();

  // Update UI to match state
  $('#colorPicker').value = S.color;
  $('#colorHex').value = S.color;
  $('#customSize').value = S.size;
  $('#statusSize').textContent = S.size + 'x' + S.size;
  $('#btnGrid').classList.toggle('active', S.showGrid);

  $$('.size-pills .pill').forEach(p => p.classList.toggle('active', +p.dataset.size === S.size));

  updatePaletteUI();
  updateStatusColor();
  updateHistoryBtns();
  calcCellSize();

  rafId = requestAnimationFrame(render);
}

init();
