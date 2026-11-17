import { Canvas } from '@react-three/fiber';
import type { GraphicsQuality } from './types/game-ui';
import { DesertScene } from './components/DesertScene';

type Props = {
  quality: GraphicsQuality;
  rotateSpeed: number;
};

export default function GameCanvas({ quality, rotateSpeed }: Props) {
  const dpr: number | [number, number] =
    quality === 'performance' ? 1 : quality === 'balanced' ? [1, 1.4] : [1, 1.7];

  return (
    <Canvas
      shadows={quality !== 'performance'}
      camera={{ position: [72, 48, 82], fov: 48 }}
      dpr={dpr}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <DesertScene rotateSpeed={rotateSpeed} />
    </Canvas>
  );
}
