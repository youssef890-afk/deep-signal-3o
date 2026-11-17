import { OrbitControls, Sky, Stars } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

function DesertTerrain() {
  const geometry = useMemo(() => {
    const size = 240
    const segments = 180
    const vertices: number[] = []
    const indices: number[] = []

    for (let z = 0; z <= segments; z++) {
      for (let x = 0; x <= segments; x++) {
        const px = (x / segments - 0.5) * size
        const pz = (z / segments - 0.5) * size

        const dunes =
          Math.sin(px * 0.045 + Math.sin(pz * 0.025) * 2) * 2.8 +
          Math.sin(pz * 0.065 + px * 0.018) * 1.7 +
          Math.sin(px * 0.018 + pz * 0.022) * 2.2

        const height = dunes + Math.sin(px * 0.11 + pz * 0.08) * 0.35

        vertices.push(px, height, pz)

        if (x < segments && z < segments) {
          const a = z * (segments + 1) + x
          const b = a + segments + 1
          indices.push(a, b, a + 1, b, b + 1, a + 1)
        }
      }
    }

    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#bd8247" roughness={1} />
    </mesh>
  )
}

function Mountains() {
  const mountains = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        x: Math.sin(i * 12.73) * 100,
        z: -65 - Math.cos(i * 7.31) * 65,
        height: 15 + (i % 7) * 5,
        radius: 12 + (i % 5) * 4,
      })),
    [],
  )

  return (
    <group>
      {mountains.map((mountain, i) => (
        <mesh
          key={i}
          position={[mountain.x, mountain.height / 2 - 2, mountain.z]}
          castShadow
          receiveShadow
        >
          <coneGeometry args={[mountain.radius, mountain.height, 6]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? '#76513e' : '#8c6044'}
            roughness={1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

function RacingTrack() {
  const track = useMemo(() => {
    const points = [
      new THREE.Vector3(-85, 0.5, 35),
      new THREE.Vector3(-55, 0.5, 12),
      new THREE.Vector3(-20, 0.5, 5),
      new THREE.Vector3(10, 0.5, 18),
      new THREE.Vector3(42, 0.5, 4),
      new THREE.Vector3(72, 0.5, -22),
      new THREE.Vector3(48, 0.5, -52),
      new THREE.Vector3(8, 0.5, -45),
      new THREE.Vector3(-30, 0.5, -35),
      new THREE.Vector3(-65, 0.5, -10),
    ]

    return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.2)
  }, [])

  return (
    <group>
      <mesh>
        <tubeGeometry args={[track, 320, 5.2, 12, true]} />
        <meshStandardMaterial color="#302c2a" roughness={0.94} />
      </mesh>

      <mesh position={[0, 0.15, 0]}>
        <tubeGeometry args={[track, 320, 0.13, 6, true]} />
        <meshBasicMaterial color="#d7a75f" />
      </mesh>
    </group>
  )
}

export function DesertScene({ rotateSpeed }: { rotateSpeed: number }) {
  return (
    <>
      <color attach="background" args={['#d28c62']} />
      <fog attach="fog" args={['#d28c62', 75, 220]} />

      <ambientLight intensity={0.65} />
      <directionalLight
        position={[-55, 70, 25]}
        intensity={2.5}
        color="#ffd39a"
        castShadow
      />

      <Sky
        distance={450000}
        sunPosition={[-55, 18, 20]}
        inclination={0.48}
        azimuth={0.25}
        rayleigh={2}
        turbidity={9}
      />

      <Stars radius={180} depth={40} count={500} factor={2} fade />

      <DesertTerrain />
      <Mountains />
      <RacingTrack />

      <OrbitControls
        makeDefault
        minDistance={12}
        maxDistance={145}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 2, 0]}
        rotateSpeed={rotateSpeed}
      />
    </>
  )
}
