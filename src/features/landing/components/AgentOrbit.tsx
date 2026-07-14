import { Html, Line, Preload } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

interface Agent {
  readonly label: string;
  readonly angle: number;
  readonly radius: number;
  readonly height: number;
  readonly highlight?: boolean;
}

const agents: Agent[] = [
  { label: "TaskManager", angle: 0, radius: 1.64, height: 0.15, highlight: true },
  { label: "Scheduler", angle: 1.04, radius: 1.52, height: 0.62 },
  { label: "Registry", angle: 2.08, radius: 1.68, height: -0.18, highlight: true },
  { label: "Tool Gateway", angle: 3.12, radius: 1.56, height: 0.36, highlight: true },
  { label: "Session & Trace", angle: 4.72, radius: 1.55, height: -0.72 },
  { label: "Data Access", angle: 5.22, radius: 1.5, height: 0.08 },
];

function pointFromAgent(agent: Agent): [number, number, number] {
  return [
    Math.cos(agent.angle) * agent.radius,
    agent.height,
    Math.sin(agent.angle) * agent.radius * 0.58,
  ];
}

function AgentNode({ agent }: { readonly agent: Agent }) {
  const ref = useRef<THREE.Group>(null);
  const base = useMemo(() => pointFromAgent(agent), [agent]);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    const time = clock.elapsedTime;
    ref.current.position.set(
      base[0],
      base[1] + Math.sin(time * 0.8 + agent.angle) * 0.06,
      base[2],
    );
  });

  return (
    <group position={base} ref={ref}>
      <mesh>
        <sphereGeometry args={[agent.highlight ? 0.18 : 0.145, 32, 32]} />
        <meshStandardMaterial
          color={agent.highlight ? "#C75F43" : "#F8F0E6"}
          emissive={agent.highlight ? "#7A2F21" : "#000000"}
          emissiveIntensity={agent.highlight ? 0.14 : 0}
          metalness={0.1}
          roughness={0.64}
        />
      </mesh>
      <mesh scale={1.65}>
        <sphereGeometry args={[agent.highlight ? 0.18 : 0.145, 32, 32]} />
        <meshBasicMaterial
          color={agent.highlight ? "#C75F43" : "#BBAEA2"}
          opacity={agent.highlight ? 0.16 : 0.1}
          transparent
        />
      </mesh>
      <Html
        center
        className="agent-label"
        distanceFactor={3.5}
        sprite
        transform
        zIndexRange={[20, 0]}
      >
        <div className="agent-label-card">{agent.label}</div>
      </Html>
    </group>
  );
}

function CoreNode() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.1) * 0.035;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.34, 40, 40]} />
        <meshStandardMaterial
          color="#171411"
          emissive="#2B1510"
          emissiveIntensity={0.18}
          metalness={0.2}
          roughness={0.58}
        />
      </mesh>
      <mesh scale={1.9}>
        <sphereGeometry args={[0.34, 40, 40]} />
        <meshBasicMaterial color="#C75F43" opacity={0.12} transparent />
      </mesh>
      <Html
        center
        className="agent-label"
        distanceFactor={3.45}
        sprite
        transform
        zIndexRange={[20, 0]}
      >
        <div className="agent-label-card core">ReactAgent Runtime</div>
      </Html>
    </group>
  );
}

function OrbitRings() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    ref.current.rotation.y = clock.elapsedTime * 0.12;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.2) * 0.025;
  });

  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[1.56, 0.004, 12, 128]} />
        <meshBasicMaterial color="#8F8175" opacity={0.52} transparent />
      </mesh>
      <mesh rotation={[Math.PI / 2.6, 0.35, 0]}>
        <torusGeometry args={[0.98, 0.004, 12, 128]} />
        <meshBasicMaterial color="#C75F43" opacity={0.36} transparent />
      </mesh>
      <mesh rotation={[Math.PI / 2.05, -0.4, 0]}>
        <torusGeometry args={[1.96, 0.003, 12, 128]} />
        <meshBasicMaterial color="#8E8175" opacity={0.24} transparent />
      </mesh>
    </group>
  );
}

function AgentLines() {
  const edges = useMemo(
    () =>
      agents.map((agent) => ({
        end: pointFromAgent(agent),
        highlight: agent.highlight,
      })),
    [],
  );

  return (
    <>
      {edges.map((edge, index) => (
        <Line
          color={edge.highlight ? "#C75F43" : "#94887D"}
          key={index}
          lineWidth={edge.highlight ? 0.95 : 0.62}
          opacity={edge.highlight ? 0.5 : 0.3}
          points={[[0, 0, 0], edge.end]}
          transparent
        />
      ))}
    </>
  );
}

function OrbitingCluster() {
  const cluster = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (!cluster.current) {
      return;
    }
    cluster.current.rotation.y += delta * 0.09;
    cluster.current.rotation.x = Math.sin(clock.elapsedTime * 0.18) * 0.08;
  });

  return (
    <group ref={cluster}>
      <OrbitRings />
      <AgentLines />
      {agents.map((agent) => (
        <AgentNode agent={agent} key={agent.label} />
      ))}
    </group>
  );
}

function Scene() {
  const scene = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!scene.current) {
      return;
    }
    scene.current.rotation.y = THREE.MathUtils.lerp(
      scene.current.rotation.y,
      state.pointer.x * 0.12,
      0.04,
    );
    scene.current.rotation.x = THREE.MathUtils.lerp(
      scene.current.rotation.x,
      -state.pointer.y * 0.08,
      0.04,
    );
  });

  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight color="#FFF7EE" intensity={1.8} position={[4, 4, 5]} />
      <directionalLight color="#C75F43" intensity={0.46} position={[-3, -2, 4]} />
      <group ref={scene}>
        <CoreNode />
        <OrbitingCluster />
      </group>
    </>
  );
}

export default function AgentOrbit() {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 6.8], fov: 43 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ height: "100%", width: "100%" }}
    >
      <Suspense fallback={null}>
        <Scene />
        <Preload all />
      </Suspense>
    </Canvas>
  );
}
