"use client";

import { Trail } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useSite } from "@/lib/site/store";
import { COLORS, PICKUP, PICKUP_U, TAXI_PATH } from "./world";

type TaxiParams = { current: { taxiU: number; taxiVisible: boolean; roofSign: number } };

/** Stylised taxi with a glowing roof sign, headlight trails, and the waiting traveller. */
export function Taxi({ params, taxiPosition }: { params: TaxiParams; taxiPosition: { current: THREE.Vector3 } }) {
  const group = useRef<THREE.Group>(null);
  const sign = useRef<THREE.MeshBasicMaterial>(null);
  const person = useRef<THREE.Group>(null);
  const u = useRef(0);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), ahead: new THREE.Vector3() }), []);
  const amber = useMemo(() => new THREE.Color(COLORS.amber), []);
  const mobile = useSite((s) => s.mobile);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const p = params.current;
    const target = THREE.MathUtils.clamp(p.taxiU, 0, 1);
    u.current = Math.abs(target - u.current) > 0.5 ? target : THREE.MathUtils.damp(u.current, target, 4, dt);
    TAXI_PATH.getPointAt(u.current, tmp.p);
    TAXI_PATH.getPointAt(Math.min(1, u.current + 0.002), tmp.ahead);
    g.position.copy(tmp.p);
    if (tmp.ahead.distanceToSquared(tmp.p) > 1e-6) g.lookAt(tmp.ahead);
    g.visible = p.taxiVisible && u.current > 0.001 && u.current < 0.999;
    taxiPosition.current.copy(tmp.p);
    sign.current?.color.copy(amber).multiplyScalar(0.3 + p.roofSign * 4);
    // The traveller waits at the kerb until the taxi has picked them up.
    if (person.current) person.current.visible = p.taxiVisible && u.current < PICKUP_U + 0.004;
  });

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
          {[-0.6, 0.6].map((z) =>
            mobile ? (
              <mesh key={z} position={[2.12, 0.85, z]}>
                <boxGeometry args={[0.06, 0.2, 0.4]} />
                <meshBasicMaterial color={[5, 4.6, 3.8]} toneMapped={false} />
              </mesh>
            ) : (
              <Trail key={z} width={0.9} length={10} color={"#ffe2a8"} attenuation={(w) => w * w}>
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
