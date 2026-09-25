"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useMemo, useRef } from "react";
import * as THREE from "three";
import { lerp } from "@/lib/site/story";
import { useSite } from "@/lib/site/store";
import { COLORS, TRACK_Y, TRACK_Z } from "./world";

const CARRIAGES = 4;
const CAR_LEN = 11.5;
const GAP = 0.6;
export const TRAIN_LENGTH = CARRIAGES * (CAR_LEN + GAP);
const CRUISE_SPEED = 9;
const LOOP = 240;

type TrainModelProps = { windowMat: THREE.MeshStandardMaterial; bodyColor?: string };

/** A commuter train from bevelled boxes: body, lit window band, dark skirt, headlights. */
export const TrainModel = forwardRef<THREE.Group, TrainModelProps>(function TrainModel({ windowMat, bodyColor = COLORS.trainBody }, ref) {
  return (
    <group ref={ref}>
      {Array.from({ length: CARRIAGES }, (_, i) => {
        const x = -CAR_LEN / 2 - i * (CAR_LEN + GAP);
        return (
          <group key={i} position={[x, 0, 0]}>
            <RoundedBox args={[CAR_LEN, 2.8, 2.9]} radius={0.35} smoothness={2}>
              <meshStandardMaterial color={bodyColor} metalness={0.25} roughness={0.5} emissive={bodyColor} emissiveIntensity={0.12} />
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

export function Train({ params }: { params: { current: { trainScripted: number; trainScriptX: number; flicker: number } } }) {
  const group = useRef<THREE.Group>(null);
  const x = useRef(-120);
  const windowMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1a1a1a", emissive: new THREE.Color(COLORS.window), emissiveIntensity: 1.6 }),
    [],
  );

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const { reducedMotion } = useSite.getState();
    const p = params.current;
    const cruise = reducedMotion ? -40 : -LOOP / 2 + ((clock.elapsedTime * CRUISE_SPEED) % LOOP);
    const target = lerp(cruise, p.trainScriptX, p.trainScripted);
    const prev = x.current;
    // Exponential approach doubles as braking; big jumps (loop wrap) snap.
    x.current = Math.abs(target - prev) > 60 ? target : THREE.MathUtils.damp(prev, target, 2.5, dt);
    g.position.set(x.current, TRACK_Y + 0.42 + 1.75, TRACK_Z);
    const speed = dt > 0 ? Math.abs(x.current - prev) / dt / CRUISE_SPEED : 0;
    g.userData.speed = Math.min(1, speed);
    const flick = p.flicker > 0 && Math.sin(clock.elapsedTime * 31) * Math.sin(clock.elapsedTime * 7.3) > 0.55 ? 0.25 : 1;
    windowMat.emissiveIntensity = 1.6 * flick;
  });

  return <TrainModel ref={group} windowMat={windowMat} />;
}

/** Easter egg: typing "sl" sends a bonus train across the skyline. */
export function SkylineTrains() {
  const trains = useSite((s) => s.extraTrains);
  return (
    <>
      {trains.map((t) => (
        <SkylineTrain key={t} startedAt={t} />
      ))}
    </>
  );
}

function SkylineTrain({ startedAt }: { startedAt: number }) {
  const group = useRef<THREE.Group>(null);
  const windowMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#111", emissive: new THREE.Color(COLORS.amber), emissiveIntensity: 3 }),
    [],
  );
  useFrame(() => {
    const k = (performance.now() - startedAt) / 7000;
    if (group.current) {
      group.current.position.set(lerp(-260, 300, k), 38, -48);
      group.current.visible = k >= 0 && k <= 1;
    }
  });
  return <TrainModel ref={group} windowMat={windowMat} bodyColor="#3b4458" />;
}
