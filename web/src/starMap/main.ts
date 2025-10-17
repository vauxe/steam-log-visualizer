import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { csvParse } from 'd3-dsv';

import { createI18n } from '../i18n';

interface StarRow {
  appID: string;
  name: string;
  pos: number;
  neg: number;
  tags: string;
  total_reviews: number;
  log_total_reviews: number;
  positive_ratio: number;
  x: number;
  y: number;
  z: number;
  __raw: Record<string, string>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const i18n = createI18n('en');

function cctToRGB(kelvin: number) {
  const k = clamp(Number.isFinite(kelvin) ? kelvin : 6500, 1000, 40000) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (k <= 66) r = 255;
  else r = 329.698727446 * Math.pow(k - 60, -0.1332047592);

  if (k <= 66) g = 99.4708025861 * Math.log(k) - 161.1195681661;
  else g = 288.1221695283 * Math.pow(k - 60, -0.0755148492);

  if (k >= 66) b = 255;
  else if (k <= 19) b = 0;
  else b = 138.5177312231 * Math.log(k - 10) - 305.0447927307;

  return new THREE.Color(clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255);
}

async function init() {
  const app = document.getElementById('app') as HTMLDivElement | null;
  const hud = document.getElementById('hud') as HTMLDivElement | null;
  const panel = document.getElementById('panel') as HTMLDivElement | null;
  const hoverTip = document.getElementById('hoverTip') as HTMLDivElement | null;
  const qInput = document.getElementById('q') as HTMLInputElement | null;
  const btnSearch = document.getElementById('btnSearch') as HTMLButtonElement | null;
  const btnRandom = document.getElementById('btnRandom') as HTMLButtonElement | null;
  const langSelect = document.getElementById('langSelect') as HTMLSelectElement | null;
  const header = document.querySelector('.steam-header') as HTMLElement | null;
  const searchContainer = document.getElementById('search') as HTMLDivElement | null;
  const navDashboard = document.getElementById('navDashboard') as HTMLAnchorElement | null;
  const navStarMap = document.getElementById('navStarMap') as HTMLAnchorElement | null;
  const titleEl = document.getElementById('title') as HTMLHeadingElement | null;

  if (!app || !hud || !panel) {
    console.error('Star map container elements are missing');
    return;
  }

  let rows: StarRow[] = [];
  let selectedIndex: number | null = null;

  type HudMessageKind = 'loading' | 'fail' | 'notFound' | 'summary' | 'empty' | null;
  let hudMessage: { kind: HudMessageKind; payload?: unknown } = { kind: 'loading' };

  const renderHudMessage = () => {
    if (!hud) return;
    switch (hudMessage.kind) {
      case 'loading':
        hud.textContent = i18n.t('starMapHudLoading');
        break;
      case 'fail':
        hud.textContent = i18n.t('starMapHudFail');
        break;
      case 'notFound':
        hud.textContent = i18n.t('starMapHudNotFound', String(hudMessage.payload ?? ''));
        break;
      case 'summary':
        hud.textContent = i18n.t('starMapHudSummary', Number(hudMessage.payload ?? 0));
        break;
      case 'empty':
        hud.textContent = i18n.t('starMapHudEmpty');
        break;
      default:
        hud.textContent = '';
    }
  };

  const setHudMessage = (kind: HudMessageKind, payload?: unknown) => {
    hudMessage = { kind, payload };
    renderHudMessage();
  };

  const applyStaticLabels = () => {
    document.title = i18n.t('starMapTitle');
    if (titleEl) titleEl.textContent = i18n.t('starMapTitle');
    if (navDashboard) navDashboard.textContent = i18n.t('navDashboard');
    if (navStarMap) navStarMap.textContent = i18n.t('navStarMap');
    if (qInput) qInput.placeholder = i18n.t('starMapSearchPlaceholder');
    if (searchContainer) searchContainer.setAttribute('aria-label', i18n.t('starMapSearchAria'));
    if (btnSearch) btnSearch.textContent = i18n.t('starMapJump');
    if (btnRandom) btnRandom.textContent = i18n.t('starMapRandom');
    renderHudMessage();
  };

  if (langSelect) {
    langSelect.value = i18n.locale;
    langSelect.addEventListener('change', () => {
      i18n.setLocale(langSelect.value);
      applyStaticLabels();
      updateHeaderOffset();
      if (panel.style.display !== 'none' && selectedIndex != null) {
        const row = rows[selectedIndex];
        if (row) showInfo(row);
      }
    });
  }

  const updateHeaderOffset = () => {
    if (!header) return;
    const offset = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--starmap-header-offset', `${Math.ceil(offset)}px`);
  };
  applyStaticLabels();
  updateHeaderOffset();
  setHudMessage('loading');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.set(0, 0, 200);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.02;

  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const csvUrl = `${normalizedBase}data/steam_dataset.csv`;

  let text: string;
  try {
    setHudMessage('loading');
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    text = await response.text();
  } catch (error) {
    setHudMessage('fail');
    console.error('Failed to load star map CSV', error);
    return;
  }

  const parsedRows = csvParse(text, (d, _index, columns) => {
    const positive = Number(d.positive ?? 0);
    const negative = Number(d.negative ?? 0);
    const total = positive + negative;
    const positiveRatio = total > 0 ? positive / total : 0;
    const logTotalReviews = Math.log10(total + 1);
    const raw: Record<string, string> = {};
    columns.forEach((key) => {
      raw[key] = d[key] ?? '';
    });

    const row: StarRow = {
      appID: String(d.appID ?? ''),
      name: String(d.name ?? ''),
      pos: positive,
      neg: negative,
      tags: String(d.tags ?? ''),
      total_reviews: total,
      log_total_reviews: logTotalReviews,
      positive_ratio: positiveRatio,
      x: Number(d.umap_x_3d ?? 0),
      y: Number(d.umap_y_3d ?? 0),
      z: Number(d.umap_z_3d ?? 0),
      __raw: raw,
    };
    return row;
  });

  rows = Array.from(parsedRows);

  if (!rows.length) {
    setHudMessage('empty');
    return;
  }

  const xs = rows.map((r) => r.x);
  const ys = rows.map((r) => r.y);
  const zs = rows.map((r) => r.z);
  const maxAbs = Math.max(
    ...[...xs, ...ys, ...zs].map((v) => Math.abs(Number.isFinite(v) ? v : 0))
  );
  const targetRadius = 100;
  const coordScale = maxAbs > 0 ? targetRadius / maxAbs : 1;

  const sizes = rows.map((r) => r.log_total_reviews).filter((n) => Number.isFinite(n)) as number[];
  const sizeMin = Math.min(...sizes);
  const sizeMax = Math.max(...sizes);

  const sizePxFromLog = (value: number) => {
    if (!Number.isFinite(value) || sizeMax === sizeMin) return 6;
    const t = clamp((value - sizeMin) / (sizeMax - sizeMin), 0, 1);
    return lerp(2.0, 100.0, Math.pow(t, 2));
  };

  const worldDiameterFromLog = (value: number) => {
    if (!Number.isFinite(value) || sizeMax === sizeMin) return 0.2;
    const t = clamp((value - sizeMin) / (sizeMax - sizeMin), 0, 1);
    return lerp(0.2, 10.0, Math.pow(t, 2));
  };

  const CORE_FACTOR = 0.3;
  const count = rows.length;
  setHudMessage('summary', count);

  const prs = Array.from({ length: count }, (_, i) => ({
    index: i,
    value: rows[i].positive_ratio || 0,
  }));
  prs.sort((a, b) => a.value - b.value);

  const ratioQ = new Float32Array(count);
  prs.forEach(({ index }, rank) => {
    ratioQ[index] = count > 1 ? rank / (count - 1) : 0;
  });

  const qToCCT = (q: number) => lerp(1500, 12000, Math.pow(clamp(q, 0, 1), 2));

  const Rmin = 0.7;
  const Rmax = 2.4;
  const gammaR = 1.15;
  const gammaL = 1.2;
  const logLs = new Float32Array(count);
  let logLMin = Infinity;
  let logLMax = -Infinity;

  for (let i = 0; i < count; i += 1) {
    const row = rows[i];
    const t = clamp((row.log_total_reviews - sizeMin) / (sizeMax - sizeMin || 1), 0, 1);
    const R = Rmin + (Rmax - Rmin) * Math.pow(t, gammaR);
    const T = qToCCT(ratioQ[i]);
    const logL = 2 * Math.log(Math.max(1e-6, R)) + 4 * Math.log(Math.max(1e-6, T));
    logLs[i] = logL;
    if (logL < logLMin) logLMin = logL;
    if (logL > logLMax) logLMax = logL;
  }

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizesPx = new Float32Array(count);
  const brights = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const row = rows[i];
    const px = (row.x || 0) * coordScale;
    const py = (row.y || 0) * coordScale;
    const pz = (row.z || 0) * coordScale;
    positions[i * 3 + 0] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;

    sizesPx[i] = sizePxFromLog(row.log_total_reviews);

    const lum01 = clamp((logLs[i] - logLMin) / (logLMax - logLMin || 1), 0, 1);
    const baseBright = lerp(0.04, 1.0, Math.pow(lum01, gammaL));
    brights[i] = baseBright;

    const q = ratioQ[i];
    const col = cctToRGB(qToCCT(q));
    const boost = 1.0 + 0.35 * Math.pow(q, 2.4);
    colors[i * 3 + 0] = col.r;
    colors[i * 3 + 1] = Math.min(1, col.g * boost);
    colors[i * 3 + 2] = Math.min(1, col.b * boost);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('aSize', new THREE.BufferAttribute(sizesPx, 1));
  geom.setAttribute('aBright', new THREE.BufferAttribute(brights, 1));

  const ids = new Float32Array(count);
  for (let i = 0; i < count; i += 1) ids[i] = i + 1;
  geom.setAttribute('aId', new THREE.BufferAttribute(ids, 1));

  const starsMat = new THREE.ShaderMaterial({
    uniforms: {
      sizeScale: { value: 50.0 },
      pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      coreFactor: { value: CORE_FACTOR },
      hoverId: { value: 0.0 },
      selectedId: { value: 0.0 },
    },
    vertexShader: `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aBright;
      attribute float aId;
      varying vec3 vColor;
      varying float vBright;
      varying float vId;
      uniform float sizeScale;
      uniform float pixelRatio;
      void main(){
        vColor = aColor;
        vBright = aBright;
        vId = aId;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = max(1.0, -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * pixelRatio * (sizeScale / dist);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying vec3 vColor;
      varying float vBright;
      varying float vId;
      uniform float coreFactor;
      uniform float hoverId;
      uniform float selectedId;
      void main(){
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r = length(c);
        if (r > 1.0) discard;
        float t = max(0.0, r - coreFactor) / (1.0 - coreFactor);
        float brightnessFactor = pow(1.0 - t, 1.5);
        vec3 baseColor = vColor * vBright * brightnessFactor;
        float isHover = 1.0 - step(0.5, abs(vId - hoverId));
        float isSel   = 1.0 - step(0.5, abs(vId - selectedId));
        vec3 colorBoost = mix(baseColor, vec3(1.0), 0.6 * isHover);
        colorBoost = mix(colorBoost, vec3(1.0), 0.85 * isSel);
        float alpha = vBright * brightnessFactor * (1.0 + 0.5 * isHover + 0.8 * isSel);
        gl_FragColor = vec4(colorBoost, alpha);
      }
    `,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    toneMapped: false,
  });

  const starsPoints = new THREE.Points(geom, starsMat);
  scene.add(starsPoints);

  const pickingScene = new THREE.Scene();
  const pickingMat = new THREE.ShaderMaterial({
    uniforms: {
      sizeScale: starsMat.uniforms.sizeScale,
      pixelRatio: starsMat.uniforms.pixelRatio,
    },
    vertexShader: `
      attribute float aSize;
      attribute float aId;
      uniform float sizeScale;
      uniform float pixelRatio;
      varying float vId;
      void main(){
        vId = aId;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = max(1.0, -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * pixelRatio * (sizeScale / dist);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying float vId;
      void main(){
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        if (length(c) > 1.0) discard;
        float id = floor(vId + 0.5);
        float r = mod(id, 256.0);
        float g = mod(floor(id / 256.0), 256.0);
        float b = mod(floor(id / 65536.0), 256.0);
        gl_FragColor = vec4(r / 255.0, g / 255.0, b / 255.0, 1.0);
      }
    `,
    depthTest: true,
    depthWrite: true,
    transparent: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });

  const pickingPoints = new THREE.Points(geom, pickingMat);
  pickingScene.add(pickingPoints);

  const pickTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    stencilBuffer: false,
    generateMipmaps: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
  });

  const indexByAppID = new Map<string, number>();
  rows.forEach((row, index) => {
    if (row.appID) indexByAppID.set(String(row.appID), index);
  });

  const getPosByIndex = (index: number) =>
    new THREE.Vector3(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]);

  let currentFlyAnimationId: number | null = null;

  const flyToPosition = (
    target: THREE.Vector3,
    duration = 1000,
    desiredDistance: number | null = null
  ) => {
    if (currentFlyAnimationId) cancelAnimationFrame(currentFlyAnimationId);

    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();

    let distance =
      Number.isFinite(desiredDistance || 0) && desiredDistance && desiredDistance > 0
        ? desiredDistance
        : camera.position.distanceTo(target);
    if (!Number.isFinite(distance) || distance <= 0) distance = 60;

    const direction = camera.position.clone().sub(target).normalize();
    if (!Number.isFinite(direction.lengthSq()) || direction.lengthSq() < 1e-8)
      direction.set(0, 0, 1);

    const toTarget = target.clone();
    const toPos = target.clone().add(direction.multiplyScalar(distance));
    const start = performance.now();
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (now: number) => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = easeInOutCubic(t);
      camera.position.lerpVectors(fromPos, toPos, eased);
      controls.target.lerpVectors(fromTarget, toTarget, eased);
      if (t < 1) currentFlyAnimationId = requestAnimationFrame(step);
      else currentFlyAnimationId = null;
    };

    currentFlyAnimationId = requestAnimationFrame(step);
  };

  const showInfo = (row: StarRow) => {
    panel.style.display = 'block';
    const safe = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const labels = {
      close: i18n.t('starMapPanelClose'),
      unknown: i18n.t('starMapUnknown'),
      appId: i18n.t('starMapPanelAppId'),
      totalReviews: i18n.t('starMapPanelTotalReviews'),
      posNeg: i18n.t('starMapPanelPosNeg'),
      positiveRatio: i18n.t('starMapPanelPositiveRatio'),
      coordinates: i18n.t('starMapPanelCoordinates'),
      tags: i18n.t('starMapPanelLabels'),
    };
    panel.innerHTML =
      `<button class="close" aria-label="${labels.close}">&times;</button>` +
      `<h2>${safe(row.name || labels.unknown)}</h2>` +
      `<div class="kv"><b>${labels.appId}:</b>${row.appID || ''}</div>` +
      `<div class="kv"><b>${labels.totalReviews}:</b>${row.total_reviews || 0}</div>` +
      `<div class="kv"><b>${labels.posNeg}:</b>${row.pos || 0} / ${row.neg || 0}</div>` +
      `<div class="kv"><b>${labels.positiveRatio}:</b>${Number.isFinite(row.positive_ratio) ? (row.positive_ratio * 100).toFixed(1) + '%' : '-'}</div>` +
      `<div class="kv"><b>${labels.coordinates}:</b>(${Number.isFinite(row.x) ? row.x.toFixed(2) : row.x}, ${Number.isFinite(row.y) ? row.y.toFixed(2) : row.y}, ${Number.isFinite(row.z) ? row.z.toFixed(2) : row.z})</div>` +
      `<div class="kv"><b>${labels.tags}:</b></div>` +
      `<div class="tags">${row.tags
        .split('|')
        .filter(Boolean)
        .slice(0, 50)
        .map((tag) => `<span class="tag">${safe(tag)}</span>`)
        .join('')}</div>`;

    const closeBtn = panel.querySelector('.close') as HTMLButtonElement | null;
    if (closeBtn) {
      closeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        panel.style.display = 'none';
        controls.autoRotate = true;
        selectedIndex = null;
        if (starsMat.uniforms.selectedId) starsMat.uniforms.selectedId.value = 0.0;
      });
    }
  };

  const selectIndex = (index: number) => {
    const row = rows[index];
    if (!row) return;
    selectedIndex = index;
    showInfo(row);
    if (starsMat.uniforms.selectedId) starsMat.uniforms.selectedId.value = index + 1;
    const position = getPosByIndex(index);
    const diameter = worldDiameterFromLog(row.log_total_reviews);
    const desired = Math.max(1e-3, diameter * 0.5 * 2);
    flyToPosition(position, 1000, desired);
  };

  const runSearch = () => {
    const query = (qInput?.value || '').trim();
    if (!query) return;
    const byID = indexByAppID.get(query);
    if (byID != null) {
      selectIndex(byID);
      setHudMessage('summary', rows.length);
      return;
    }
    const lower = query.toLowerCase();
    const found = rows.findIndex((row) => row.name.toLowerCase().includes(lower));
    if (found >= 0) {
      selectIndex(found);
      setHudMessage('summary', rows.length);
    } else {
      setHudMessage('notFound', query);
    }
  };

  const updateSuggestions = () => {
    const list = document.getElementById('suggestions') as HTMLDataListElement | null;
    if (!list || !qInput) return;
    const query = qInput.value.trim().toLowerCase();
    list.innerHTML = '';
    if (!query) return;
    const seen = new Set<string>();
    if (/^\d+$/.test(query)) {
      let countMatches = 0;
      for (let i = 0; i < rows.length && countMatches < 5; i += 1) {
        const id = rows[i].appID;
        if (id && id.startsWith(query) && !seen.has(id)) {
          const opt = document.createElement('option');
          opt.value = id;
          list.appendChild(opt);
          seen.add(id);
          countMatches += 1;
        }
      }
    }
    let countNames = 0;
    for (let i = 0; i < rows.length && countNames < 15; i += 1) {
      const name = rows[i].name;
      if (!name) continue;
      if (name.toLowerCase().includes(query) && !seen.has(name)) {
        const opt = document.createElement('option');
        opt.value = name;
        list.appendChild(opt);
        seen.add(name);
        countNames += 1;
      }
    }
  };

  if (btnSearch) btnSearch.addEventListener('click', runSearch);
  if (qInput) {
    qInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') runSearch();
    });
    qInput.addEventListener('input', updateSuggestions);
  }

  if (btnRandom) {
    btnRandom.addEventListener('click', () => {
      if (!rows.length) return;
      const index = Math.floor(Math.random() * rows.length);
      selectIndex(index);
    });
  }

  const fitRadius = targetRadius + 10;
  controls.target.set(0, 0, 0);
  camera.position.set(0, 0, fitRadius * 2.2);
  controls.update();

  const _pickPixelBuffer = new Uint8Array(4);
  const drawingBufferSize = new THREE.Vector2();
  const storedClearColor = new THREE.Color();

  const pickIndexAtCss = (xCss: number, yCss: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    if (xCss < 0 || yCss < 0 || xCss >= rect.width || yCss >= rect.height) return -1;

    renderer.getDrawingBufferSize(drawingBufferSize);
    const dbW = drawingBufferSize.x;
    const dbH = drawingBufferSize.y;

    const x = Math.floor((xCss / rect.width) * dbW);
    const y = Math.floor((yCss / rect.height) * dbH);

    camera.setViewOffset(dbW, dbH, x, y, 1, 1);

    const currentRT = renderer.getRenderTarget();
    const currentClearColor = renderer.getClearColor(storedClearColor);
    const currentClearAlpha = renderer.getClearAlpha();
    const currentAutoClear = renderer.autoClear;

    renderer.setRenderTarget(pickTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(pickingScene, camera);

    renderer.readRenderTargetPixels(pickTarget, 0, 0, 1, 1, _pickPixelBuffer);
    const hitId = _pickPixelBuffer[0] + _pickPixelBuffer[1] * 256 + _pickPixelBuffer[2] * 65536;

    renderer.setRenderTarget(currentRT);
    renderer.setClearColor(currentClearColor, currentClearAlpha);
    renderer.autoClear = currentAutoClear;
    camera.clearViewOffset();

    const idx = hitId - 1;
    if (hitId === 0 || _pickPixelBuffer[3] === 0 || idx < 0 || idx >= count) return -1;
    return idx;
  };

  const pickIndexByScreen = (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    return pickIndexAtCss(event.clientX - rect.left, event.clientY - rect.top);
  };

  let pointerInside = false;
  let mouseButtons = 0;
  let mouseCssX = 0;
  let mouseCssY = 0;
  let lastClientX = 0;
  let lastClientY = 0;
  let needsHoverCheck = false;
  let downBtn = -1;
  let downX = 0;
  let downY = 0;
  const clickThresholdPx = 5;

  const hideHover = () => {
    if (hoverTip) hoverTip.style.display = 'none';
  };

  const showHoverAtClient = (clientX: number, clientY: number, row: StarRow) => {
    if (!hoverTip) return;
    const name = row.name || 'unknown';
    const id = row.appID || '';
    hoverTip.textContent = id ? `${name} (${id})` : name;
    hoverTip.style.display = 'block';
    const pad = 3;
    const vw = window.innerWidth;
    const w = hoverTip.offsetWidth || 200;
    const h = hoverTip.offsetHeight || 24;
    let x = clientX + pad;
    let y = clientY - pad - h;
    if (x + w > vw - 6) x = vw - w - 6;
    if (y < 6) y = 6;
    hoverTip.style.left = `${x}px`;
    hoverTip.style.top = `${y}px`;
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    needsHoverCheck = true;
    pointerInside = true;
    mouseButtons = event.buttons;
    lastClientX = event.clientX;
    lastClientY = event.clientY;
    mouseCssX = event.clientX - rect.left;
    mouseCssY = event.clientY - rect.top;
  };

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerenter', () => {
    pointerInside = true;
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    pointerInside = false;
    hideHover();
    if (starsMat.uniforms.hoverId) starsMat.uniforms.hoverId.value = 0.0;
  });

  const onPointerDown = (event: PointerEvent) => {
    downBtn = event.button;
    downX = event.clientX;
    downY = event.clientY;
    mouseButtons = event.buttons;
    hideHover();
    if (starsMat.uniforms.hoverId) starsMat.uniforms.hoverId.value = 0.0;
  };

  const onPointerUp = (event: PointerEvent) => {
    mouseButtons = event.buttons;
    if (downBtn !== 0 || event.button !== 0) return;
    const dx = event.clientX - downX;
    const dy = event.clientY - downY;
    if (dx * dx + dy * dy > clickThresholdPx * clickThresholdPx) return;
    const idx = pickIndexByScreen(event as unknown as MouseEvent);
    if (idx >= 0) selectIndex(idx);
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateHeaderOffset();
  };

  window.addEventListener('resize', onResize);

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);

    if (pointerInside && mouseButtons === 0 && needsHoverCheck) {
      const idx = pickIndexAtCss(mouseCssX, mouseCssY);
      if (idx >= 0) {
        if (starsMat.uniforms.hoverId) starsMat.uniforms.hoverId.value = idx + 1;
        showHoverAtClient(lastClientX, lastClientY, rows[idx]);
      } else {
        if (starsMat.uniforms.hoverId) starsMat.uniforms.hoverId.value = 0.0;
        hideHover();
      }
      needsHoverCheck = false;
    }
  };

  animate();

  setHudMessage('summary', rows.length);
}

void init();
