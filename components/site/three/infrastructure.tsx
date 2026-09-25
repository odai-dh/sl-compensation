"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useSite } from "@/lib/site/store";
import { COLORS, LAMP_SPACING, LAMP_Z, SIGNAL_X, STREET_WIDTH, STREET_Z, TRACK_Y, TRACK_Z } from "./world";

const LENGTH = 520;

function useInstances(count: number, place: (i: number, o: THREE.Object3D) => void) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      place(i, o);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count, place]);
  return ref;
}

/** Raised rail track on pillars. */
export function Track() {
  const pillars = Math.floor(LENGTH / 12);
  const place = useMemo(
    () => (i: number, o: THREE.Object3D) => {
      o.position.set(-LENGTH / 2 + i * 12, TRACK_Y / 2, TRACK_Z);
      o.scale.set(1.1, TRACK_Y, 1.4);
    },
    [],
  );
  const ref = useInstances(pillars, place);
  return (
    <group>
      <mesh position={[0, TRACK_Y, TRACK_Z]}>
        <boxGeometry args={[LENGTH, 0.7, 4.4]} />
        <meshStandardMaterial color="#2a3244" roughness={0.8} />
      </mesh>
      {[-0.75, 0.75].map((z) => (
        <mesh key={z} position={[0, TRACK_Y + 0.42, TRACK_Z + z]}>
          <boxGeometry args={[LENGTH, 0.14, 0.12]} />
          <meshStandardMaterial color="#8d97a8" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, pillars]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#232b3b" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** Wet street with reflections, kerbs and lane markings. */
export function Street() {
  const quality = useSite((s) => s.quality);
  const mobile = useSite((s) => s.mobile);
  const dashes = Math.floor(LENGTH / 8);
  const place = useMemo(
    () => (i: number, o: THREE.Object3D) => {
      o.position.set(-LENGTH / 2 + i * 8, 0.02, STREET_Z);
      o.rotation.x = -Math.PI / 2;
      o.scale.set(3, 0.18, 1);
    },
    [],
  );
  const ref = useInstances(dashes, place);
  const reflective = quality === "high" && !mobile;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <planeGeometry args={[LENGTH, 400]} />
        <meshStandardMaterial color="#0b0f18" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, STREET_Z]}>
        <planeGeometry args={[LENGTH, STREET_WIDTH]} />
        {reflective ? (
          <MeshReflectorMaterial
            resolution={512}
            blur={[300, 80]}
            mixBlur={1}
            mixStrength={3.2}
            mirror={0.6}
            roughness={0.75}
            depthScale={0.6}
            minDepthThreshold={0.5}
            maxDepthThreshold={1.2}
            color="#10151f"
            metalness={0.5}
          />
        ) : (
          <meshStandardMaterial color="#121824" roughness={0.35} metalness={0.4} />
        )}
      </mesh>
      {[STREET_Z - STREET_WIDTH / 2 - 0.6, STREET_Z + STREET_WIDTH / 2 + 0.6].map((z) => (
        <mesh key={z} position={[0, 0.12, z]}>
          <boxGeometry args={[LENGTH, 0.25, 1.2]} />
          <meshStandardMaterial color="#232a36" roughness={0.9} />
        </mesh>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, dashes]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#7b8494" transparent opacity={0.45} />
      </instancedMesh>
    </group>
  );
}

const LAMP_COUNT = Math.floor(LENGTH / LAMP_SPACING);
const lampX = (i: number) => -Math.floor(LAMP_COUNT / 2) * LAMP_SPACING + i * LAMP_SPACING;

/** Sodium streetlights: instanced poles and bulbs, plus a few real lights around the pickup. */
export function Streetlights() {
  const count = LAMP_COUNT;
  const placePole = useMemo(
    () => (i: number, o: THREE.Object3D) => {
      o.position.set(lampX(i), 3.4, LAMP_Z);
      o.scale.set(0.18, 6.8, 0.18);
    },
    [],
  );
  const placeArm = useMemo(
    () => (i: number, o: THREE.Object3D) => {
      o.position.set(lampX(i), 6.75, LAMP_Z - 1.4);
      o.scale.set(0.14, 0.14, 2.9);
    },
    [],
  );
  const placeBulb = useMemo(
    () => (i: number, o: THREE.Object3D) => {
      o.position.set(lampX(i), 6.55, LAMP_Z - 2.7);
      o.scale.set(0.9, 0.22, 0.5);
    },
    [],
  );
  const poles = useInstances(count, placePole);
  const arms = useInstances(count, placeArm);
  const bulbs = useInstances(count, placeBulb);
  const bulbMat = useRef<THREE.MeshBasicMaterial>(null);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const base = useMemo(() => new THREE.Color(COLORS.sodium), []);

  useFrame(() => {
    // Streetlights burn brighter as the night gets darker.
    const k = THREE.MathUtils.lerp(0.9, 1.35, useSite.getState().timeOfDay);
    bulbMat.current?.color.copy(base).multiplyScalar(2.2 * k);
    for (const l of lights.current) if (l) l.intensity = 38 * k;
  });

  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#2c3342" />
      </instancedMesh>
      <instancedMesh ref={arms} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2c3342" />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={bulbMat} toneMapped={false} />
      </instancedMesh>
      {[-LAMP_SPACING, 0, LAMP_SPACING].map((lx, i) => (
        <pointLight
          key={lx}
          ref={(el) => {
            lights.current[i] = el;
          }}
          position={[lx, 6.2, LAMP_Z - 2.7]}
          color={COLORS.sodium}
          distance={26}
          decay={1.6}
        />
      ))}
    </group>
  );
}

/** The railway signal that turns red when the disruption hits. */
export function Signal({ params }: { params: { current: { signalRed: boolean } } }) {
  const red = useRef<THREE.MeshBasicMaterial>(null);
  const green = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const redC = useMemo(() => new THREE.Color(COLORS.signalRed), []);
  const greenC = useMemo(() => new THREE.Color(COLORS.signalGreen), []);
  const off = useMemo(() => new THREE.Color("#1a1d24"), []);

  useFrame(({ clock }) => {
    const isRed = params.current.signalRed;
    const pulse = isRed ? 0.75 + 0.25 * Math.sin(clock.elapsedTime * 4) : 1;
    red.current?.color.copy(isRed ? redC : off).multiplyScalar(isRed ? 3 * pulse : 1);
    green.current?.color.copy(isRed ? off : greenC).multiplyScalar(isRed ? 1 : 2.4);
    if (light.current) {
      light.current.color.copy(isRed ? redC : greenC);
      light.current.intensity = (isRed ? 30 : 12) * pulse;
    }
  });

  return (
    <group position={[SIGNAL_X, TRACK_Y, TRACK_Z - 2.7]}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 4, 8]} />
        <meshStandardMaterial color="#3a4152" />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <boxGeometry args={[0.6, 1.5, 0.5]} />
        <meshStandardMaterial color="#10131a" />
      </mesh>
      <mesh position={[-0.31, 4.75, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshBasicMaterial ref={red} toneMapped={false} />
      </mesh>
      <mesh position={[-0.31, 4.1, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshBasicMaterial ref={green} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[-1, 4.4, 0]} distance={14} decay={1.5} />
    </group>
  );
}
