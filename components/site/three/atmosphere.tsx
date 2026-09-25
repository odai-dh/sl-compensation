"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/lib/site/rng";
import { useSite } from "@/lib/site/store";
import { COLORS } from "./world";

const EVENING = { top: new THREE.Color("#141f40"), horizon: new THREE.Color("#5b3b4c"), fog: new THREE.Color("#1a1a2c") };
const MIDNIGHT = { top: new THREE.Color("#02040a"), horizon: new THREE.Color("#161a2a"), fog: new THREE.Color("#080b14") };

/** Gradient sky, fog and stars – all driven by the time-of-day slider. */
export function Sky() {
  const scene = useThree((s) => s.scene);
  const mobile = useSite((s) => s.mobile);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() } },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vDir;
          void main(){ float h = clamp(vDir.y * 2.2, 0.0, 1.0); vec3 c = mix(uHorizon, uTop, pow(h, 0.7));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  const stars = useMemo(() => {
    const rng = mulberry32(7);
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = rng() * Math.PI * 2;
      const y = 0.15 + rng() * 0.85;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(theta) * r * 480, y * 480, Math.sin(theta) * r * 480], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const starMat = useRef<THREE.PointsMaterial>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);

  useEffect(() => {
    scene.fog = new THREE.FogExp2(EVENING.fog.getHex(), mobile ? 0.006 : 0.0085);
    return () => {
      scene.fog = null;
      material.dispose();
      stars.dispose();
    };
  }, [scene, mobile, material, stars]);

  useFrame(() => {
    const t = useSite.getState().timeOfDay;
    material.uniforms.uTop.value.copy(EVENING.top).lerp(MIDNIGHT.top, t);
    material.uniforms.uHorizon.value.copy(EVENING.horizon).lerp(MIDNIGHT.horizon, t);
    if (scene.fog) (scene.fog as THREE.FogExp2).color.copy(EVENING.fog).lerp(MIDNIGHT.fog, t);
    if (starMat.current) starMat.current.opacity = 0.15 + t * 0.75;
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(0.9, 0.45, t);
  });

  return (
    <>
      <mesh material={material} renderOrder={-1}>
        <sphereGeometry args={[500, 32, 16]} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial ref={starMat} size={1.6} sizeAttenuation={false} color="#cfd8ff" transparent fog={false} depthWrite={false} />
      </points>
      <hemisphereLight ref={hemi} args={["#3a4a78", "#0a0c12", 0.8]} />
      <directionalLight position={[-40, 60, 30]} intensity={0.35} color="#8fa6ff" />
    </>
  );
}

const rainVertex = /* glsl */ `
  attribute float aEnd;
  attribute float aSpeed;
  uniform float uTime;
  uniform vec3 uCenter;
  #include <fog_pars_vertex>
  void main() {
    vec3 p = position;
    float h = 46.0;
    p.y = mod(p.y - uTime * aSpeed, h);
    p.x += uCenter.x;
    p.z += uCenter.z;
    p.y -= aEnd * 0.9;
    p.x += aEnd * 0.12;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const rainFragment = /* glsl */ `
  uniform float uOpacity;
  #include <fog_pars_fragment>
  void main() {
    gl_FragColor = vec4(0.72, 0.8, 0.95, uOpacity);
    #include <fog_fragment>
  }
`;

/** Light rain: line-segment drops animated entirely on the GPU. */
export function Rain({ params }: { params: { current: { rain: number } } }) {
  const mobile = useSite((s) => s.mobile);
  const count = mobile ? 1600 : 6000;
  const camera = useThree((s) => s.camera);
  const { geometry, material } = useMemo(() => {
    const rng = mulberry32(99);
    const pos = new Float32Array(count * 2 * 3);
    const end = new Float32Array(count * 2);
    const speed = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = (rng() - 0.5) * 120;
      const y = rng() * 46;
      const z = (rng() - 0.5) * 90;
      const s = 26 + rng() * 14;
      for (let k = 0; k < 2; k++) {
        pos.set([x, y, z], (i * 2 + k) * 3);
        end[i * 2 + k] = k;
        speed[i * 2 + k] = s;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: rainVertex,
      fragmentShader: rainFragment,
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { uTime: { value: 0 }, uOpacity: { value: 0.3 }, uCenter: { value: new THREE.Vector3() } },
      ]),
    });
    return { geometry: g, material: m };
  }, [count]);
  const lines = useRef<THREE.LineSegments>(null);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ clock }) => {
    const { reducedMotion } = useSite.getState();
    const intensity = reducedMotion ? 0 : params.current.rain;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uOpacity.value = 0.18 + 0.2 * intensity;
    // Keep the rain volume around the camera.
    material.uniforms.uCenter.value.set(camera.position.x, 0, camera.position.z - 30);
    geometry.setDrawRange(0, Math.floor(count * 2 * THREE.MathUtils.clamp(intensity, 0, 1)));
    if (lines.current) lines.current.visible = intensity > 0.01;
  });

  return <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} />;
}

/** Amber particle burst when SL pays out. */
export function PayoutBurst({ origin }: { origin: { current: THREE.Vector3 } }) {
  const paidCount = useSite((s) => s.demo.paidCount);
  const reducedMotion = useSite((s) => s.reducedMotion);
  const n = 420;
  const state = useMemo(() => ({ v: new Float32Array(n * 3), start: -1 }), []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  }, []);
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);

  useEffect(() => {
    if (paidCount === 0 || reducedMotion) return;
    const rng = mulberry32(paidCount * 13);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const o = origin.current;
    for (let i = 0; i < n; i++) {
      const theta = rng() * Math.PI * 2;
      const up = 0.4 + rng();
      const sp = 4 + rng() * 10;
      state.v.set([Math.cos(theta) * sp, up * sp * 1.2, Math.sin(theta) * sp], i * 3);
      pos.setXYZ(i, o.x, o.y + 2, o.z);
    }
    pos.needsUpdate = true;
    state.start = performance.now();
  }, [paidCount, reducedMotion, geometry, origin, state]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, dt) => {
    const age = (performance.now() - state.start) / 1000;
    const alive = state.start > 0 && age < 3;
    if (points.current) points.current.visible = alive;
    if (!alive) return;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) {
      state.v[i * 3 + 1] -= 9.8 * dt * 0.6;
      pos.setXYZ(i, pos.getX(i) + state.v[i * 3] * dt, Math.max(0.05, pos.getY(i) + state.v[i * 3 + 1] * dt), pos.getZ(i) + state.v[i * 3 + 2] * dt);
    }
    pos.needsUpdate = true;
    if (mat.current) mat.current.opacity = 1 - age / 3;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} visible={false}>
      <pointsMaterial ref={mat} size={0.35} color={new THREE.Color(COLORS.amber).multiplyScalar(3)} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}
