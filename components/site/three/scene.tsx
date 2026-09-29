"use client";

import { PerformanceMonitor, Stats } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { cameraT, sceneAt, type SceneParams } from "@/lib/site/story";
import { useSite } from "@/lib/site/store";
import { City } from "./city";
import { PayoutBurst, Rain, Sky } from "./atmosphere";
import { Signal, Street, Streetlights, Track } from "./infrastructure";
import { Phone } from "./phone";
import { Taxi } from "./taxi";
import { Train } from "./train";
import { PICKUP, PICKUP_U, STATIONS_DESKTOP, STATIONS_MOBILE, type Station } from "./world";

const initialParams = (): SceneParams => sceneAt(0, { disruption: false, taxiOrdered: false, rideProgress: 0, rideDone: false }, PICKUP_U);

/** Derives everything from the store once per frame, before anything else renders. */
function SceneController({ params }: { params: { current: SceneParams } }) {
  useFrame(() => {
    const s = useSite.getState();
    params.current = sceneAt(s.storyT, s.demo, PICKUP_U);
  }, -2);
  return null;
}

function curvesFor(stations: Station[]) {
  const pos = new THREE.CatmullRomCurve3(stations.map((s) => new THREE.Vector3(...s.pos)), false, "centripetal");
  const target = new THREE.CatmullRomCurve3(stations.map((s) => new THREE.Vector3(...s.target)), false, "centripetal");
  return { pos, target, n: stations.length };
}

/** Flies the camera along a Catmull-Rom spline driven by the scroll story. */
function CameraRig({ params, taxiPosition }: { params: { current: SceneParams }; taxiPosition: { current: THREE.Vector3 } }) {
  const mobile = useSite((s) => s.mobile);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const curves = useMemo(() => curvesFor(mobile ? STATIONS_MOBILE : STATIONS_DESKTOP), [mobile]);
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3(), look: new THREE.Vector3(), first: true }), []);

  useEffect(() => {
    camera.fov = mobile ? 62 : 45;
    camera.updateProjectionMatrix();
  }, [camera, mobile]);

  useFrame(({ clock }, dt) => {
    const { storyT, reducedMotion } = useSite.getState();
    const t = cameraT(storyT, reducedMotion) / (curves.n - 1);
    curves.pos.getPoint(t, tmp.pos);
    curves.target.getPoint(t, tmp.target);
    // Chapter 4: follow the taxi as it drives off.
    if (params.current.cameraFollow > 0) {
      tmp.target.lerp(taxiPosition.current, 0.45 * params.current.cameraFollow);
    }
    if (!reducedMotion) {
      tmp.pos.x += Math.sin(clock.elapsedTime * 0.23) * 0.5;
      tmp.pos.y += Math.sin(clock.elapsedTime * 0.31) * 0.3;
    }
    if (tmp.first || reducedMotion) {
      camera.position.copy(tmp.pos);
      tmp.look.copy(tmp.target);
      tmp.first = false;
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, tmp.pos.x, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, tmp.pos.y, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, tmp.pos.z, 5, dt);
      tmp.look.x = THREE.MathUtils.damp(tmp.look.x, tmp.target.x, 5, dt);
      tmp.look.y = THREE.MathUtils.damp(tmp.look.y, tmp.target.y, 5, dt);
      tmp.look.z = THREE.MathUtils.damp(tmp.look.z, tmp.target.z, 5, dt);
    }
    camera.lookAt(tmp.look);
  });
  return null;
}

function Effects() {
  const quality = useSite((s) => s.quality);
  const mobile = useSite((s) => s.mobile);
  if (quality !== "high" || mobile) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={0.62} luminanceSmoothing={0.2} intensity={0.85} radius={0.7} />
      <Vignette offset={0.28} darkness={0.72} />
      <Noise opacity={0.035} premultiply />
    </EffectComposer>
  );
}

/** Below this the scene is genuinely choppy, whatever the screen's refresh rate… */
const CHOPPY_FPS = 24;
/** …and above this it's smooth enough to raise the resolution again. */
const SMOOTH_FPS = 45;

/**
 * Keeps the 3D on slower devices by stepping down gradually: first no postprocessing or reflections, then a
 * lower resolution in steps. Only if it is still choppy at the lowest resolution does the illustrated
 * fallback take over. The thresholds are fixed on purpose: drei's defaults follow the refresh rate, so on
 * a 120 Hz screen anything under 60 fps counted as slow and a smooth scene was swapped for the fallback.
 */
function QualityMonitor({ onResolution }: { onResolution: (factor: number) => void }) {
  const atLowestDpr = useRef(false);
  return (
    <PerformanceMonitor
      factor={1}
      step={0.25}
      bounds={() => [CHOPPY_FPS, SMOOTH_FPS]}
      // Not onChange: drei keeps its "last factor" in a render-body variable, so after a re-render it can miss
      // the step down to 0 and the resolution would never reach its lowest step.
      onDecline={({ factor }) => {
        const s = useSite.getState();
        if (s.quality === "high") s.set({ quality: "low" });
        // The lowest resolution gets one full check of its own before giving up.
        else if (factor === 0 && atLowestDpr.current) s.set({ quality: "fallback" });
        atLowestDpr.current = factor === 0;
        onResolution(factor);
      }}
      onIncline={({ factor }) => {
        atLowestDpr.current = false;
        onResolution(factor);
      }}
    />
  );
}

/** Pauses rendering while the tab is hidden. */
function useVisibleFrameloop() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return visible ? "always" : "never";
}

function MarkLoaded() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 3) useSite.getState().set({ loaded: true });
  });
  return null;
}

export default function Scene() {
  const params = useRef<SceneParams>(initialParams());
  const taxiPosition = useRef(new THREE.Vector3());
  const pickupPoint = useRef(PICKUP.clone());
  const debug = useSite((s) => s.debug);
  const mobile = useSite((s) => s.mobile);
  const frameloop = useVisibleFrameloop();

  const maxDpr = mobile ? 1.5 : 1.75;
  // 1 = full resolution, 0 = 1× pixel ratio. Kept as the Canvas prop: R3F re-applies `dpr` whenever the
  // Canvas re-renders (switching to "low" does), which would undo a ratio set with setDpr.
  const [resolution, setResolution] = useState(1);
  const dpr: number | [number, number] =
    resolution === 1 ? [1, maxDpr] : 1 + (Math.max(1, Math.min(window.devicePixelRatio, maxDpr)) - 1) * resolution;

  return (
    <Canvas
      frameloop={frameloop}
      dpr={dpr}
      gl={{ antialias: !mobile, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 45, near: 0.5, far: 1200, position: [-40, 12, 36] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.domElement.addEventListener("webglcontextlost", () => useSite.getState().set({ quality: "fallback" }));
      }}
      aria-hidden
    >
      {/* No `flipflops`/`onFallback` either: drei counts every incline as a flip, so a smooth scene hit that
          limit after ~12 s. */}
      <QualityMonitor onResolution={setResolution} />
      <SceneController params={params} />
      <CameraRig params={params} taxiPosition={taxiPosition} />
      <Suspense fallback={null}>
        <Sky />
        <City params={params} />
        <Track />
        <Street />
        <Streetlights />
        <Signal params={params} />
        <Train params={params} />
        <Taxi params={params} taxiPosition={taxiPosition} />
        <Phone params={params} />
        <Rain params={params} />
        <PayoutBurst origin={pickupPoint} />
        <Effects />
        <MarkLoaded />
      </Suspense>
      {debug && <Stats />}
    </Canvas>
  );
}
