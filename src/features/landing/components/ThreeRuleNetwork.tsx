import { Html, Line, Preload } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

type Point = [number, number, number];

interface NodeDefinition {
  readonly label: string;
  readonly position: Point;
  readonly highlight?: boolean;
}

const outerNodes: NodeDefinition[] = [
  { label: "制度审核", position: [-2.12, 1.24, 0.12], highlight: true },
  { label: "文件分类", position: [0.08, 1.92, -0.12], highlight: true },
  { label: "智能问答", position: [2.22, 0.64, 0.08] },
  { label: "文件审核", position: [1.42, -1.54, 0.18], highlight: true },
  { label: "知识库管理", position: [-1.68, -1.42, 0.22] },
];

const centerPoint: Point = [0, 0, 0];

function seededNoise(index: number, salt: number): number {
  const value = Math.sin(index * 91.73 + salt * 37.11) * 10000;
  return value - Math.floor(value);
}

function PulseDot({
  start,
  end,
  delay = 0,
  highlight = false,
}: {
  readonly start: Point;
  readonly end: Point;
  readonly delay?: number;
  readonly highlight?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const startVector = useMemo(() => new THREE.Vector3(...start), [start]);
  const endVector = useMemo(() => new THREE.Vector3(...end), [end]);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    const progress = (clock.elapsedTime * 0.16 + delay) % 1;
    ref.current.position.copy(startVector).lerp(endVector, progress);
    const scale = highlight ? 1.15 : 0.86;
    ref.current.scale.setScalar(scale + Math.sin(progress * Math.PI) * 0.24);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[highlight ? 0.035 : 0.026, 12, 12]} />
      <meshBasicMaterial
        color={highlight ? "#C75F43" : "#B7AA9E"}
        opacity={highlight ? 0.82 : 0.52}
        transparent
      />
    </mesh>
  );
}

function NetworkNode({
  node,
  core = false,
}: {
  readonly node: NodeDefinition;
  readonly core?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    const time = clock.elapsedTime;
    ref.current.position.set(
      node.position[0] + Math.sin(time * 0.6 + node.position[0]) * 0.035,
      node.position[1] + Math.cos(time * 0.7 + node.position[1]) * 0.055,
      node.position[2] + Math.sin(time * 0.5 + node.position[2]) * 0.025,
    );
  });

  return (
    <group position={node.position} ref={ref}>
      <mesh>
        <sphereGeometry args={[core ? 0.22 : node.highlight ? 0.14 : 0.105, 32, 32]} />
        <meshStandardMaterial
          color={core ? "#171411" : node.highlight ? "#C75F43" : "#F8F0E6"}
          emissive={node.highlight ? "#7A2F21" : "#000000"}
          emissiveIntensity={node.highlight ? 0.16 : 0}
          metalness={0.12}
          roughness={0.62}
        />
      </mesh>
      <mesh scale={core ? 1.8 : node.highlight ? 1.62 : 1.38}>
        <sphereGeometry args={[core ? 0.22 : node.highlight ? 0.14 : 0.105, 32, 32]} />
        <meshBasicMaterial
          color={core ? "#171411" : node.highlight ? "#C75F43" : "#BBAEA2"}
          opacity={core ? 0.08 : node.highlight ? 0.1 : 0.07}
          transparent
        />
      </mesh>
      <Html
        center
        className="r3f-label"
        distanceFactor={core ? 5.1 : 5.9}
        sprite
        transform
        zIndexRange={[20, 0]}
      >
        <div
          className={[
            "r3f-label-card",
            core ? "core" : "",
            node.highlight ? "highlight" : "",
          ].join(" ")}
        >
          {node.label}
        </div>
      </Html>
    </group>
  );
}

function NetworkLines() {
  const crossEdges = useMemo<Array<[Point, Point, boolean]>>(
    () =>
      outerNodes.map((node, index) => [
        node.position,
        outerNodes[(index + 1) % outerNodes.length].position,
        index % 2 === 0,
      ]),
    [],
  );

  return (
    <>
      {outerNodes.map((node, index) => (
        <group key={`core-${node.label}`}>
          <Line
            color={node.highlight ? "#C75F43" : "#9D9186"}
            lineWidth={node.highlight ? 0.82 : 0.55}
            opacity={node.highlight ? 0.46 : 0.28}
            points={[centerPoint, node.position]}
            transparent
          />
          <PulseDot
            delay={index * 0.09}
            end={node.position}
            highlight={node.highlight}
            start={centerPoint}
          />
        </group>
      ))}
      {crossEdges.map(([start, end, highlight], index) => (
        <group key={`cross-${index}`}>
          <Line
            color={highlight ? "#C75F43" : "#8F8379"}
            lineWidth={highlight ? 0.7 : 0.45}
            opacity={highlight ? 0.3 : 0.18}
            points={[start, end]}
            transparent
          />
          <PulseDot
            delay={index * 0.13}
            end={end}
            highlight={highlight}
            start={start}
          />
        </group>
      ))}
    </>
  );
}

function SubtleField() {
  const points = useMemo(() => {
    const positions: number[] = [];
    for (let index = 0; index < 90; index += 1) {
      positions.push(
        (seededNoise(index, 1) - 0.5) * 7.6,
        (seededNoise(index, 2) - 0.5) * 5.4,
        (seededNoise(index, 3) - 0.5) * 1.8 - 0.7,
      );
    }
    return new Float32Array(positions);
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          args={[points, 3]}
          attach="attributes-position"
          count={points.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#9A8D82" opacity={0.18} size={0.012} transparent />
    </points>
  );
}

function Scene() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) {
      return;
    }
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      state.pointer.x * 0.14,
      0.045,
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -state.pointer.y * 0.1,
      0.045,
    );
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.18) * 0.018;
  });

  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight color="#FFF7EE" intensity={1.9} position={[3, 4, 5]} />
      <directionalLight color="#C75F43" intensity={0.52} position={[-4, -2, 3]} />
      <SubtleField />
      <group ref={group} scale={0.76}>
        <mesh>
          <ringGeometry args={[2.66, 2.675, 96]} />
          <meshBasicMaterial color="#9D9186" opacity={0.16} transparent />
        </mesh>
        <mesh>
          <ringGeometry args={[3.08, 3.09, 96]} />
          <meshBasicMaterial color="#C75F43" opacity={0.1} transparent />
        </mesh>
        <NetworkLines />
        <NetworkNode
          core
          node={{ label: "文件治理", position: centerPoint, highlight: true }}
        />
        {outerNodes.map((node) => (
          <NetworkNode key={node.label} node={node} />
        ))}
      </group>
    </>
  );
}

export default function ThreeRuleNetwork() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.4], fov: 42 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ height: "100%", minHeight: "inherit", width: "100%" }}
    >
      <Suspense fallback={null}>
        <Scene />
        <Preload all />
      </Suspense>
    </Canvas>
  );
}
