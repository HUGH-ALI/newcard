import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DEFAULT_VIEW_STATE, FINISH_LABELS } from '@/lib/card/defaults';
import type { CardLayers, CardViewState, FinishMode } from '@/lib/card/types';

const CARD_WORLD_W = 2;
const CARD_WORLD_H = 3;

const vertexShader = `
uniform float uScale;
varying vec2 vUv;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vec3 transformed = position;
  transformed.xy *= uScale;
  vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
  vViewDir = normalize(cameraPosition - worldPosition.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const layerFragmentShader = `
uniform sampler2D map;
uniform sampler2D maskMap;
uniform float uDepth;
uniform float uScale;
uniform int uKind;
varying vec2 vUv;
varying vec3 vViewDir;
void main() {
  vec2 uv = (vUv - 0.5) * uScale + 0.5
    + vViewDir.xy / max(abs(vViewDir.z), 0.35) * uDepth * 0.14;
  if (uKind == 5) uv = vec2(1.0 - vUv.x, vUv.y);
  vec4 texel = texture2D(map, uv);
  float mask = texture2D(maskMap, vUv).r;
  if (uKind == 2) {
    float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
    float ink = smoothstep(0.82, 0.22, luma);
    vec3 line = vec3(0.02, 0.08, 0.12) + vec3(0.10, 0.85, 0.95) * 0.28;
    gl_FragColor = vec4(line, ink * 0.42 * mask);
  } else {
    gl_FragColor = vec4(texel.rgb, texel.a * mask);
  }
  #include <colorspace_fragment>
}
`;

const foilFragmentShader = `
uniform sampler2D maskMap;
uniform float uTime;
uniform float uFoil;
uniform int uFinish;
varying vec2 vUv;
varying vec3 vViewDir;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 holo(float t) {
  t = fract(t);
  vec3 c = mix(vec3(1.0, 0.20, 0.72), vec3(1.0, 0.83, 0.35), smoothstep(0.0, 0.33, t));
  c = mix(c, vec3(0.26, 0.95, 1.0), smoothstep(0.33, 0.66, t));
  return mix(c, vec3(0.95, 0.98, 1.0), smoothstep(0.66, 1.0, t));
}

float sparkleVoronoi(vec2 uv, float t) {
  vec2 id = floor(uv);
  vec2 f = fract(uv);
  float d = 1.0;
  for (int y = -1; y <= 1; y += 1) {
    for (int x = -1; x <= 1; x += 1) {
      vec2 neighbor = vec2(float(x), float(y));
      float h = hash21(id + neighbor);
      vec2 o = vec2(h, hash21(id + neighbor + 7.13));
      o = 0.5 + 0.42 * sin(t * 1.4 + 6.2831 * o);
      d = min(d, length(neighbor + o - f));
    }
  }
  return smoothstep(0.10, 0.01, d) * (0.6 + 0.4 * sin(t * 3.0 + hash21(id) * 6.2831));
}

void main() {
  float mask = texture2D(maskMap, vUv).r;
  if (mask < 0.01) discard;
  float phase = vViewDir.x * 2.4 + vViewDir.y * 1.8;
  float wave = 0.5 + 0.5 * sin((vUv.x * 7.0 + vUv.y * 18.0 + phase * 2.2));
  float distorted = 0.5 + 0.5 * sin(vUv.y * 32.0 + phase * 5.0 + wave * 7.0);
  vec3 color = holo(phase * 0.13 + vUv.x * 0.25 + vUv.y * 0.18 + wave * 0.18);
  float ax = smoothstep(0.78, 1.0, abs(vUv.x - 0.5) * 2.0);
  float ay = smoothstep(0.86, 1.0, abs(vUv.y - 0.5) * 2.0);
  float edge = max(ax, ay);
  float corners = pow(max(0.0, abs(vUv.x - 0.5) * 2.0 * abs(vUv.y - 0.5) * 2.0), 2.5);
  float alpha = 0.0;
  if (uFinish == 0) {
    alpha = (edge * 0.22 + corners * 0.34) * (0.35 + 0.65 * distorted) + wave * 0.05;
  } else if (uFinish == 1) {
    float sweep = smoothstep(0.35, 0.0, abs(fract(vUv.x - vUv.y * 0.45 + phase * 0.12) - 0.5));
    alpha = 0.13 + sweep * 0.16 + edge * 0.12;
  } else if (uFinish == 2) {
    alpha = sparkleVoronoi(vUv * 16.0 + vec2(phase * 0.2, 0.0), uTime) * 0.7 + edge * 0.08;
  } else {
    alpha = edge * 0.055;
  }
  gl_FragColor = vec4(color, alpha * mask * uFoil);
  #include <colorspace_fragment>
}
`;

interface StudioApi {
  updateLayers: (layers: CardLayers) => void;
  download: () => void;
}

function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function RangeRow({
  label, value, min, max, step, onChange, format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-cyan-100/80">{label}</span>
        <span className="font-mono text-cyan-200">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="holo-range w-full"
      />
    </label>
  );
}

export default function CardStudio({ layers }: { layers: CardLayers | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const failureRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<StudioApi | null>(null);
  const [view, setView] = useState<CardViewState>(DEFAULT_VIEW_STATE);
  const viewRef = useRef(view);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layers || apiRef.current) return;
    let disposed = false;
    let frame = 0;

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 2 / 3, 0.1, 50);
      camera.position.set(0, 0, 7.2);

      scene.add(new THREE.AmbientLight(0x9bdfff, 0.85));
      const key = new THREE.DirectionalLight(0x42f3ff, 2.2);
      key.position.set(-3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xff3bb8, 2.6);
      rim.position.set(4, -2, 3);
      scene.add(rim);
      const gold = new THREE.PointLight(0xffd35c, 1.1, 12);
      gold.position.set(0, 1.6, 3.5);
      scene.add(gold);

      const root = new THREE.Group();
      scene.add(root);

      const cardShape = roundedRectShape(CARD_WORLD_W, CARD_WORLD_H, 0.14);
      const cardGeometry = new THREE.ExtrudeGeometry(cardShape, {
        depth: 0.09,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.025,
        bevelSegments: 5,
        curveSegments: 18,
      });
      cardGeometry.translate(0, 0, -0.045);
      const capMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      });
      const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0x0b1a2a,
        metalness: 0.9,
        roughness: 0.28,
        emissive: 0x06243a,
        emissiveIntensity: 0.45,
      });
      const body = new THREE.Mesh(cardGeometry, [capMaterial, edgeMaterial]);
      root.add(body);

      const planeGeometry = new THREE.PlaneGeometry(CARD_WORLD_W, CARD_WORLD_H);
      const makeLayer = (kind: number, z: number, order: number) => {
        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader: layerFragmentShader,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: {
            map: { value: null },
            maskMap: { value: null },
            uDepth: { value: 0 },
            uScale: { value: 1 },
            uKind: { value: kind },
          },
        });
        if (kind === 3) material.blending = THREE.AdditiveBlending;
        const mesh = new THREE.Mesh(planeGeometry, material);
        mesh.position.z = z;
        mesh.renderOrder = order;
        root.add(mesh);
        return material;
      };

      const backgroundMaterial = makeLayer(0, -0.09, 10);
      const subjectMaterial = makeLayer(1, 0.005, 10);
      const lineartMaterial = makeLayer(2, 0.025, 10);
      const effectsMaterial = makeLayer(3, 0.055, 10);
      const foilMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: foilFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          maskMap: { value: null },
          uTime: { value: 0 },
          uFoil: { value: DEFAULT_VIEW_STATE.foil },
          uFinish: { value: 0 },
        },
      });
      const foilMesh = new THREE.Mesh(planeGeometry, foilMaterial);
      foilMesh.position.z = 0.08;
      foilMesh.renderOrder = 10;
      root.add(foilMesh);
      const textMaterial = makeLayer(4, 0.105, 10);
      const backMaterial = makeLayer(5, -0.115, 10);

      const textureFromCanvas = (source: HTMLCanvasElement) => {
        const texture = new THREE.CanvasTexture(source);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return texture;
      };
      const setMap = (material: THREE.ShaderMaterial, source: HTMLCanvasElement) => {
        const old = material.uniforms.map.value as THREE.Texture | null;
        old?.dispose();
        material.uniforms.map.value = textureFromCanvas(source);
      };
      const setMask = (material: THREE.ShaderMaterial, source: HTMLCanvasElement) => {
        const old = material.uniforms.maskMap.value as THREE.Texture | null;
        old?.dispose();
        material.uniforms.maskMap.value = textureFromCanvas(source);
      };
      const updateLayers = (nextLayers: CardLayers) => {
        setMap(backgroundMaterial, nextLayers.background);
        setMap(subjectMaterial, nextLayers.subject);
        setMap(lineartMaterial, nextLayers.lineart);
        setMap(effectsMaterial, nextLayers.effects);
        setMap(textMaterial, nextLayers.text);
        setMap(backMaterial, nextLayers.back);
        [backgroundMaterial, subjectMaterial, lineartMaterial, effectsMaterial, foilMaterial, textMaterial, backMaterial]
          .forEach((material) => setMask(material, nextLayers.mask));
      };
      updateLayers(layers);

      const resize = () => {
        const width = Math.max(1, canvas.clientWidth);
        const height = Math.max(1, canvas.clientHeight);
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        const requiredWidth = Math.floor(width * pixelRatio);
        if (canvas.width !== requiredWidth || canvas.height !== Math.floor(height * pixelRatio)) {
          renderer.setSize(width, height, false);
        }
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);

      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      const pointerDown = (event: PointerEvent) => {
        dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
      };
      const pointerMove = (event: PointerEvent) => {
        if (!dragging) return;
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        setView((current) => ({
          ...current,
          auto: false,
          ry: THREE.MathUtils.clamp(current.ry + dx * 0.008, -1.2, 1.2),
          rx: THREE.MathUtils.clamp(current.rx - dy * 0.008, -1.05, 1.05),
        }));
      };
      const pointerUp = () => {
        dragging = false;
      };
      const wheel = (event: WheelEvent) => {
        event.preventDefault();
        setView((current) => ({
          ...current,
          scale: THREE.MathUtils.clamp(current.scale - event.deltaY * 0.001, 0.7, 1.45),
        }));
      };
      canvas.addEventListener('pointerdown', pointerDown);
      canvas.addEventListener('pointermove', pointerMove);
      canvas.addEventListener('pointerup', pointerUp);
      canvas.addEventListener('pointercancel', pointerUp);
      canvas.addEventListener('wheel', wheel, { passive: false });

      const download = () => {
        renderer.render(scene, camera);
        const link = document.createElement('a');
        link.download = 'neon-holographic-card.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      apiRef.current = { updateLayers, download };

      const uniforms = {
        background: backgroundMaterial.uniforms,
        subject: subjectMaterial.uniforms,
        lineart: lineartMaterial.uniforms,
        effects: effectsMaterial.uniforms,
        foil: foilMaterial.uniforms,
        text: textMaterial.uniforms,
        back: backMaterial.uniforms,
      };
      window.__holo = {
        ready: true,
        config: viewRef.current,
        renderer,
        root,
        uniforms,
        reset: () => setView(DEFAULT_VIEW_STATE),
        flip: () => setView((current) => ({ ...current, flipped: !current.flipped })),
        getState: () => viewRef.current,
      };

      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;
        const delta = Math.min(clock.getDelta(), 0.05);
        const state = viewRef.current;
        if (state.auto) {
          root.rotation.y += delta * 0.38;
          root.rotation.x = Math.sin(clock.elapsedTime * 0.55) * 0.08;
        } else {
          const targetY = state.flipped ? Math.PI + state.ry : state.ry;
          root.rotation.x += (state.rx - root.rotation.x) * 0.1;
          root.rotation.y += (targetY - root.rotation.y) * 0.1;
        }
        root.scale.setScalar(state.scale);
        backgroundMaterial.uniforms.uDepth.value = state.backgroundDepth;
        subjectMaterial.uniforms.uDepth.value = state.subjectDepth;
        subjectMaterial.uniforms.uScale.value = state.subjectScale;
        lineartMaterial.uniforms.uDepth.value = state.subjectDepth + 0.02;
        lineartMaterial.uniforms.uScale.value = state.subjectScale;
        effectsMaterial.uniforms.uDepth.value = state.effectsDepth;
        foilMaterial.uniforms.uTime.value = clock.elapsedTime;
        foilMaterial.uniforms.uFoil.value = state.foil;
        foilMaterial.uniforms.uFinish.value = state.finish;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      animate();

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('pointerdown', pointerDown);
        canvas.removeEventListener('pointermove', pointerMove);
        canvas.removeEventListener('pointerup', pointerUp);
        canvas.removeEventListener('pointercancel', pointerUp);
        canvas.removeEventListener('wheel', wheel);
        planeGeometry.dispose();
        cardGeometry.dispose();
        capMaterial.dispose();
        edgeMaterial.dispose();
        [backgroundMaterial, subjectMaterial, lineartMaterial, effectsMaterial, foilMaterial, textMaterial, backMaterial]
          .forEach((material) => {
            (material.uniforms.map?.value as THREE.Texture | null)?.dispose();
            (material.uniforms.maskMap.value as THREE.Texture | null)?.dispose();
            material.dispose();
          });
        renderer.dispose();
        apiRef.current = null;
        window.__holo = undefined;
      };
    } catch {
      failureRef.current?.classList.replace('hidden', 'grid');
      return undefined;
    }
  }, [layers]);

  useEffect(() => {
    if (layers) apiRef.current?.updateLayers(layers);
  }, [layers]);

  const patchView = (patch: Partial<CardViewState>) => {
    setView((current) => ({ ...current, ...patch }));
  };

  return (
    <section className="rounded-3xl border border-cyan-300/20 bg-slate-950/62 p-4 shadow-[0_0_50px_rgba(66,243,255,.12)] backdrop-blur">
      <div className="relative mx-auto aspect-[2/3] w-full max-w-[520px] overflow-hidden rounded-[2rem] border border-cyan-300/25 bg-[radial-gradient(circle_at_50%_35%,rgba(66,243,255,.14),rgba(5,7,13,.96)_58%)]">
        <canvas ref={canvasRef} className="h-full w-full touch-none" />
        {!layers && (
          <div className="absolute inset-0 grid place-items-center text-sm text-cyan-100/80">
            正在装载 Neon Protocol 示例卡...
          </div>
        )}
        <div ref={failureRef} className="absolute inset-0 hidden place-items-center p-8 text-center text-sm text-cyan-100/80">
          当前浏览器无法启动 WebGL，请更换新版 Chrome、Edge 或 Firefox。
        </div>
      </div>

      <div className="mx-auto mt-4 grid max-w-[520px] gap-3">
        <div className="grid grid-cols-4 gap-2">
          <button type="button" className="holo-button" onClick={() => patchView({ flipped: !view.flipped })}>翻转</button>
          <button type="button" className="holo-button" onClick={() => patchView({ auto: !view.auto })}>{view.auto ? '暂停' : '自动'}</button>
          <button type="button" className="holo-button" onClick={() => setView(DEFAULT_VIEW_STATE)}>复位</button>
          <button type="button" className="holo-button" onClick={() => apiRef.current?.download()}>下载</button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {FINISH_LABELS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`holo-button ${view.finish === index ? 'holo-button-active' : ''}`}
              onClick={() => patchView({ finish: index as FinishMode })}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-2xl border border-cyan-300/15 bg-slate-950/45 p-3 sm:grid-cols-2">
          <RangeRow label="画面比例" value={view.subjectScale} min={0.8} max={1.25} step={0.01} onChange={(subjectScale) => patchView({ subjectScale })} />
          <RangeRow label="镭射强度" value={view.foil} min={0} max={1.5} step={0.01} onChange={(foil) => patchView({ foil })} />
          <RangeRow label="画面景深" value={view.subjectDepth} min={0} max={0.8} step={0.01} onChange={(subjectDepth) => patchView({ subjectDepth })} />
          <RangeRow label="特效景深" value={view.effectsDepth} min={0} max={0.9} step={0.01} onChange={(effectsDepth) => patchView({ effectsDepth })} />
          <RangeRow label="底纹景深" value={view.backgroundDepth} min={-0.5} max={0.1} step={0.01} onChange={(backgroundDepth) => patchView({ backgroundDepth })} />
          <RangeRow label="整体缩放" value={view.scale} min={0.7} max={1.45} step={0.01} onChange={(scale) => patchView({ scale })} />
        </div>
      </div>
    </section>
  );
}
