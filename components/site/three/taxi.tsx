"use client";

import { Trail } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useSite } from "@/lib/site/store";
import { COLORS, PICKUP, PICKUP_U, TAXI_PATH } from "./world";

type TaxiParams = { current: { taxiU: number; taxiVisible: boolean; roofSign: number } };

const TRAIL_LENGTH = 10;
/** drei's Trail keeps one point per frame, `length * 10` points in all. */
const TRAIL_FRAMES = TRAIL_LENGTH * 10;

/** Stylised taxi with a glowing roof sign, headlight trails, and the waiting traveller. */
export function Taxi({ params, taxiPosition }: { params: TaxiParams; taxiPosition: { current: THREE.Vector3 } }) {
  const group = useRef<THREE.Group>(null);
  const sign = useRef<THREE.MeshBasicMaterial>(null);
  const person = useRef<THREE.Group>(null);
  const u = useRef(0);
  const trails = useRef<(THREE.Object3D | null)[]>([]);
  // Frames since the taxi last jumped or moved unseen. Starts dirty: drei seeds a new trail at the origin.
  const cleanFrames = useRef(0);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), ahead: new THREE.Vector3() }), []);
  const amber = useMemo(() => new THREE.Color(COLORS.amber), []);
  const mobile = useSite((s) => s.mobile);

  // Runs before the camera rig (priority 0), so the camera follows this frame's position.
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const p = params.current;
    const target = THREE.MathUtils.clamp(p.taxiU, 0, 1);
    const prev = u.current;
    // A hidden taxi jumps straight to its target instead of driving there (or backwards) unseen.
    const jump = !p.taxiVisible || Math.abs(target - prev) > 0.5;
    u.current = jump ? target : THREE.MathUtils.damp(prev, target, 4, dt);
    TAXI_PATH.getPointAt(u.current, tmp.p);
    TAXI_PATH.getPointAt(Math.min(1, u.current + 0.002), tmp.ahead);
    g.position.copy(tmp.p);
    if (tmp.ahead.distanceToSquared(tmp.p) > 1e-6) g.lookAt(tmp.ahead);
    const visible = p.taxiVisible && u.current > 0.001 && u.current < 0.999;
    g.visible = visible;
    taxiPosition.current.copy(tmp.p);
    // Trails live outside the taxi's group and remember its path, so after a jump they would draw a
    // streak across the city: keep them hidden until that history has scrolled out.
    cleanFrames.current = jump && u.current !== prev ? 0 : cleanFrames.current + 1;
    const showTrails = visible && cleanFrames.current > TRAIL_FRAMES;
    for (const t of trails.current) if (t) t.visible = showTrails;
    sign.current?.color.copy(amber).multiplyScalar(0.3 + p.roofSign * 4);
    // The traveller waits at the kerb until the taxi has picked them up.
    if (person.current) person.current.visible = p.taxiVisible && u.current < PICKUP_U + 0.004;
  }, -1);

  return (
    <>
      <group ref={group}>
        <group rotation-y={-Math.PI / 2}>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[4.2, 1, 1.9]} />
            <meshStandardMaterial color={COLORS.taxi} emissive={COLORS.taxi} emissiveIntensity={0.18} metalness={0.2} roughness={0.35} />
          </mesh>
          <mesh position={[-0.2, 1.62, 0]}>
            <boxGeometry args={[2.3, 0.78, 1.72]} />
            <meshStandardMaterial color="#1a2230" metalness={0.6} roughness={0.2} />
          </mesh>
          <mesh position={[-0.2, 2.16, 0]}>
            <boxGeometry args={[0.9, 0.3, 0.45]} />
            <meshBasicMaterial ref={sign} toneMapped={false} />
          </mesh>
          {[
            [1.3, 0.95],
            [1.3, -0.95],
            [-1.3, 0.95],
            [-1.3, -0.95],
          ].map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, 0.4, z]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.4, 0.4, 0.3, 12]} />
              <meshStandardMaterial color="#0d0f14" />
            </mesh>
          ))}
          {[-0.6, 0.6].map((z, i) =>
            mobile ? (
              <mesh key={z} position={[2.12, 0.85, z]}>
                <boxGeometry args={[0.06, 0.2, 0.4]} />
                <meshBasicMaterial color={[5, 4.6, 3.8]} toneMapped={false} />
              </mesh>
            ) : (
              <Trail
                key={z}
                // drei types this ref as the geometry, but it is the trail's mesh.
                ref={(m) => {
                  trails.current[i] = m as unknown as THREE.Object3D | null;
                }}
                width={0.9}
                length={TRAIL_LENGTH}
                color={"#ffe2a8"}
                attenuation={(w) => w * w}
              >
                <mesh position={[2.12, 0.85, z]}>
                  <boxGeometry args={[0.06, 0.2, 0.4]} />
                  <meshBasicMaterial color={[5, 4.6, 3.8]} toneMapped={false} />
                </mesh>
              </Trail>
            ),
          )}
          {[-0.65, 0.65].map((z) => (
            <mesh key={z} position={[-2.12, 0.85, z]}>
              <boxGeometry args={[0.06, 0.18, 0.35]} />
              <meshBasicMaterial color={[3, 0.2, 0.2]} toneMapped={false} />
            </mesh>
          ))}
          <pointLight position={[4, 1, 0]} color="#ffe2b0" intensity={25} distance={16} decay={1.6} />
        </group>
      </group>
      <group ref={person} position={[PICKUP.x + 1.5, 0, PICKUP.z + 3.2]}>
        <mesh position={[0, 0.95, 0]}>
          <capsuleGeometry args={[0.3, 1.1, 4, 8]} />
          <meshStandardMaterial color="#2c3448" />
        </mesh>
        <mesh position={[0, 1.95, 0]}>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshStandardMaterial color="#c9a88a" />
        </mesh>
        <mesh position={[0.35, 1.3, 0.2]}>
          <boxGeometry args={[0.1, 0.18, 0.02]} />
          <meshBasicMaterial color={[2.5, 1.6, 0.3]} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}
