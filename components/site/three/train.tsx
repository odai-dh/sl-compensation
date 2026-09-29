"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useMemo, useRef } from "react";
import * as THREE from "three";
import { useSite } from "@/lib/site/store";
import {
  CAR_GAP,
  CAR_LEN,
  CARRIAGES,
  initialTrains,
  MAX_TRAINS,
  stepTrains,
  TRAIN_LENGTH,
  trainGoal,
  type TrainState,
} from "@/lib/site/train";
import { COLORS, TRACK_Y, TRACK_Z } from "./world";

const TRAIN_Y = TRACK_Y + 0.42 + 1.75;
/** Below this much of its colour left through the fog, a train can't be made out. */
const FOG_CUTOFF = 0.02;

type TrainModelProps = { windowMat: THREE.MeshStandardMaterial };

/** A commuter train from bevelled boxes: body, lit window band, dark skirt, headlights. */
const TrainModel = forwardRef<THREE.Group, TrainModelProps>(function TrainModel({ windowMat }, ref) {
  return (
    <group ref={ref}>
      {Array.from({ length: CARRIAGES }, (_, i) => {
        const x = -CAR_LEN / 2 - i * (CAR_LEN + CAR_GAP);
        return (
          <group key={i} position={[x, 0, 0]}>
            <RoundedBox args={[CAR_LEN, 2.8, 2.9]} radius={0.35} smoothness={2}>
              <meshStandardMaterial
                color={COLORS.trainBody}
                metalness={0.25}
                roughness={0.5}
                emissive={COLORS.trainBody}
                emissiveIntensity={0.12}
              />
            </RoundedBox>
            <mesh position={[0, 0.35, 0]} material={windowMat}>
              <boxGeometry args={[CAR_LEN * 0.9, 0.85, 2.96]} />
            </mesh>
            <mesh position={[0, -1.25, 0]}>
              <boxGeometry args={[CAR_LEN * 0.95, 0.5, 2.6]} />
              <meshStandardMaterial color="#171b24" />
            </mesh>
          </group>
        );
      })}
      {[-0.8, 0.8].map((z) => (
        <mesh key={z} position={[0.05, -0.5, z]}>
          <boxGeometry args={[0.1, 0.3, 0.45]} />
          <meshBasicMaterial color={[4, 3.6, 3]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
});

/**
 * The trains on the elevated track, driven by the simulation in lib/site/train.ts. The models are
 * identical, so which one shows which train from frame to frame doesn't matter.
 */
export function Train({ params }: { params: { current: { trainStop: number; flicker: number } } }) {
  const models = useRef<(THREE.Group | null)[]>([]);
  const trains = useRef<TrainState[] | null>(null);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const tmp = useMemo(() => ({ frustum: new THREE.Frustum(), m: new THREE.Matrix4(), box: new THREE.Box3(), p: new THREE.Vector3() }), []);
  const windowMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1a1a1a", emissive: new THREE.Color(COLORS.window), emissiveIntensity: 1.6 }),
    [],
  );

  useFrame(({ clock }, dt) => {
    const { reducedMotion } = useSite.getState();
    const p = params.current;
    const goal = trainGoal(p.trainStop);
    // What the camera saw last frame: trains only appear, skip ahead or go away where they can't be seen.
    tmp.frustum.setFromProjectionMatrix(tmp.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const density = scene.fog instanceof THREE.FogExp2 ? scene.fog.density : 0;
    const hidden = (front: number) => {
      tmp.box.min.set(front - TRAIN_LENGTH - 1, TRAIN_Y - 2, TRACK_Z - 2);
      tmp.box.max.set(front + 1, TRAIN_Y + 2, TRACK_Z + 2);
      if (!tmp.frustum.intersectsBox(tmp.box)) return true;
      const depth = -tmp.box.clampPoint(camera.position, tmp.p).applyMatrix4(camera.matrixWorldInverse).z;
      return Math.exp(-((density * depth) ** 2)) < FOG_CUTOFF;
    };
    const state = trains.current
      ? stepTrains(trains.current, goal, dt, { hidden, reducedMotion })
      : initialTrains(goal, reducedMotion);
    trains.current = state;
    models.current.forEach((g, i) => {
      if (!g) return;
      const t = state[i];
      g.visible = !!t;
      if (t) g.position.set(t.x, TRAIN_Y, TRACK_Z);
    });
    const flick = p.flicker > 0 && Math.sin(clock.elapsedTime * 31) * Math.sin(clock.elapsedTime * 7.3) > 0.55 ? 0.25 : 1;
    windowMat.emissiveIntensity = 1.6 * flick;
  });

  return (
    <>
      {Array.from({ length: MAX_TRAINS }, (_, i) => (
        <TrainModel
          key={i}
          ref={(g) => {
            models.current[i] = g;
          }}
          windowMat={windowMat}
        />
      ))}
    </>
  );
}
