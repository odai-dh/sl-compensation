"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SL_RULES } from "@/lib/core/sl-rules";
import { lerp } from "@/lib/site/story";
import { COLORS } from "./world";

function drawScreen(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 360;
  c.height = 740;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, "#0e1522");
  grad.addColorStop(1, "#1b1408");
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = COLORS.amber;
  g.font = "700 44px system-ui, sans-serif";
  g.fillText("Vidare", 34, 110);
  g.fillStyle = "#e9eef7";
  g.font = "600 30px system-ui, sans-serif";
  g.fillText("Taxi on its way", 34, 200);
  g.fillStyle = "#9aa7bd";
  g.font = "24px system-ui, sans-serif";
  g.fillText("Pickup in 3 min", 34, 244);
  g.fillStyle = "rgba(255,176,32,0.14)";
  g.beginPath();
  g.roundRect(28, 300, 304, 150, 22);
  g.fill();
  g.fillStyle = COLORS.amber;
  g.font = "600 24px system-ui, sans-serif";
  g.fillText("Vidare pays", 52, 350);
  g.font = "800 56px system-ui, sans-serif";
  g.fillText("354 kr", 52, 420);
  g.fillStyle = "#e9eef7";
  g.font = "600 24px system-ui, sans-serif";
  g.fillText("You pay 0 kr", 34, 510);
  g.fillStyle = "#9aa7bd";
  g.font = "20px system-ui, sans-serif";
  g.fillText(`SL cap: ${SL_RULES.maxPayoutPerOccasion.toLocaleString("sv-SE")} kr`, 34, 548);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The glowing phone that rises into view in chapter 4. */
export function Phone({ params }: { params: { current: { phoneRise: number } } }) {
  const group = useRef<THREE.Group>(null);
  const texture = useMemo(() => (typeof document === "undefined" ? null : drawScreen()), []);
  useEffect(() => () => texture?.dispose(), [texture]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const rise = params.current.phoneRise;
    g.visible = rise > 0.001;
    g.position.set(-3.5, lerp(-4, 6.4, rise), 21);
    g.rotation.set(0.05 * Math.sin(clock.elapsedTime * 0.8), 0.35 + 0.08 * Math.sin(clock.elapsedTime * 0.6), 0);
  });

  return (
    <group ref={group}>
      <RoundedBox args={[1.9, 3.9, 0.2]} radius={0.24} smoothness={3}>
        <meshStandardMaterial color="#0c0f16" metalness={0.7} roughness={0.25} />
      </RoundedBox>
      <mesh position={[0, 0, 0.105]}>
        <planeGeometry args={[1.72, 3.66]} />
        <meshBasicMaterial map={texture ?? undefined} toneMapped={false} color={[1.6, 1.6, 1.6]} />
      </mesh>
      <pointLight position={[0, 0, 1.5]} color={COLORS.amber} intensity={12} distance={9} />
    </group>
  );
}
