"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/lib/site/rng";
import { useSite } from "@/lib/site/store";
import { COLORS, TRACK_Z } from "./world";

type Building = { x: number; z: number; w: number; d: number; h: number; seed: number };

/** Seeded, so the skyline is identical on every load. */
export function generateCity(dense: boolean): Building[] {
  const rng = mulberry32(20260925);
  const out: Building[] = [];
  const step = dense ? 15 : 24;
  const push = (x: number, z: number, hMin: number, hMax: number) => {
    const w = 6 + rng() * (step - 8);
    const d = 6 + rng() * (step - 8);
    const tower = rng() > 0.93;
    out.push({ x, z, w, d, h: tower ? hMax * (1.3 + rng()) : hMin + rng() * (hMax - hMin), seed: rng() });
  };
  // Behind the track: dense blocks rising towards a skyline.
  for (let z = TRACK_Z - 14; z > -170; z -= step) {
    for (let x = -240; x <= 240; x += step) {
      if (rng() < 0.12) continue;
      const far = Math.min(1, (TRACK_Z - 14 - z) / 150);
      push(x + (rng() - 0.5) * 4, z + (rng() - 0.5) * 4, 8 + far * 14, 20 + far * 45);
    }
  }
  // In front of the street, keeping a corridor open for the camera.
  for (let z = 26; z < 130; z += step) {
    for (let x = -240; x <= 240; x += step) {
      if (Math.abs(x) < 52 && z < 110) continue;
      if (rng() < 0.2) continue;
      push(x + (rng() - 0.5) * 4, z + (rng() - 0.5) * 4, 6, 22);
    }
  }
  return out;
}

const vertexShader = /* glsl */ `
  attribute float aSeed;
  varying vec3 vFacade;
  varying vec3 vN;
  varying float vSeed;
  #include <fog_pars_vertex>
  void main() {
    vec3 scale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vFacade = position * scale;
    vN = normal;
    vSeed = aSeed;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uWall;
  uniform vec3 uWindow;
  uniform float uLit;
  uniform float uGain;
  uniform float uTime;
  uniform float uFlicker;
  varying vec3 vFacade;
  varying vec3 vN;
  varying float vSeed;
  #include <fog_pars_fragment>
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    vec3 n = normalize(vN);
    vec3 col = uWall * (0.5 + 0.5 * max(dot(n, normalize(vec3(-0.4, 0.8, 0.5))), 0.0));
    if (n.y < 0.5) {
      vec2 f = abs(n.x) > 0.5 ? vec2(vFacade.z, vFacade.y) : vec2(vFacade.x, vFacade.y);
      vec2 cell = vec2(2.4, 3.2);
      vec2 id = floor(f / cell);
      vec2 uv = fract(f / cell);
      vec2 fw = fwidth(f / cell);
      float detail = 1.0 - smoothstep(0.18, 0.45, max(fw.x, fw.y));
      float win = step(0.22, uv.x) * step(uv.x, 0.78) * step(0.28, uv.y) * step(uv.y, 0.78) * step(0.5, id.y);
      float r = hash(vec3(id, vSeed * 91.0 + n.x * 3.0 + n.z * 7.0));
      float lit = step(1.0 - uLit, r);
      float flick = 1.0 - uFlicker * step(0.8, hash(vec3(id, floor(uTime * 9.0) + vSeed)));
      vec3 wc = mix(uWindow, vec3(0.55, 0.75, 1.0), step(0.85, fract(r * 13.0)));
      vec3 sharp = mix(col, col * 0.55 + vec3(0.015, 0.02, 0.035), win) + win * lit * wc * uGain * flick * (0.6 + 0.8 * fract(r * 7.0));
      // Far away, windows are sub-pixel: show their average glow instead of shimmering.
      vec3 soft = col * 0.8 + uWindow * uGain * uLit * 0.16;
      col = mix(soft, sharp, detail);
    } else {
      col *= 0.55;
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function City({ params }: { params: { current: { flicker: number } } }) {
  const mobile = useSite((s) => s.mobile);
  const buildings = useMemo(() => generateCity(!mobile), [mobile]);
  const mesh = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(new Float32Array(buildings.map((b) => b.seed)), 1));
    return g;
  }, [buildings]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uWall: { value: new THREE.Color(COLORS.wall) },
            uWindow: { value: new THREE.Color(COLORS.window) },
            uLit: { value: 0.45 },
            uGain: { value: 2.2 },
            uTime: { value: 0 },
            uFlicker: { value: 0 },
          },
        ]),
      }),
    [],
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    buildings.forEach((b, i) => {
      o.position.set(b.x, 0, b.z);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [buildings]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ clock }) => {
    const tod = useSite.getState().timeOfDay;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uFlicker.value = params.current.flicker;
    // Evening: many windows lit. Midnight: fewer, but brighter against the dark.
    material.uniforms.uLit.value = THREE.MathUtils.lerp(0.55, 0.22, tod);
    material.uniforms.uGain.value = THREE.MathUtils.lerp(1.9, 2.6, tod);
  });

  return <instancedMesh ref={mesh} args={[geometry, material, buildings.length]} frustumCulled={false} />;
}
