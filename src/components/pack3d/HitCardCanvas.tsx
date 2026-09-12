import { Asset } from 'expo-asset';
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { Canvas, useFrame, useLoader } from './r3f';

const cardGltfModule = require('../../../assets/OP_CARD.glb');
const cardBackModule = require('../../../assets/OP_CARD_BACK.webp');

const CARD_W = 250;
const CARD_H = 349;

type Props = {
  frontUrl?: string;
};

function isMesh(object: Object3D): object is Mesh {
  return (object as Mesh).isMesh === true;
}

function meshLabel(object: Mesh): string {
  return `${object.name} ${object.parent?.name ?? ''}`;
}

function applyPlanarUVs(mesh: Mesh, mirrorU: boolean, flipV: boolean) {
  const geometry = mesh.geometry as BufferGeometry;
  const position = geometry.getAttribute('position');
  if (!position) return;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;
  const width = Math.max(box.max.x - box.min.x, 1e-6);
  const height = Math.max(box.max.z - box.min.z, 1e-6);
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    let u = (position.getX(i) - box.min.x) / width;
    let v = (position.getZ(i) - box.min.z) / height;
    if (mirrorU) u = 1 - u;
    if (flipV) v = 1 - v;
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
}

async function uriFromModule(moduleId: number): Promise<string | null> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri ?? null;
}

export function HitCardCanvas({ frontUrl }: Props) {
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const spin = useRef({ x: 0, y: 0 });
  const lastPan = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let live = true;
    Promise.all([uriFromModule(cardGltfModule), uriFromModule(cardBackModule)]).then(([model, back]) => {
      if (!live) return;
      if (model) setModelUri(model);
      if (back) setBackUri(back);
    });
    return () => {
      live = false;
    };
  }, []);

  const resetPan = () => {
    lastPan.current = { x: 0, y: 0 };
  };

  const followPan = (tx: number, ty: number) => {
    spin.current.y += (tx - lastPan.current.x) * 0.0085;
    spin.current.x = Math.max(-0.7, Math.min(0.7, spin.current.x + (ty - lastPan.current.y) * 0.0075));
    lastPan.current = { x: tx, y: ty };
  };

  const pan = Gesture.Pan()
    .minDistance(1)
    .onStart(() => {
      runOnJS(resetPan)();
    })
    .onUpdate((event) => {
      runOnJS(followPan)(event.translationX, event.translationY);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill}>
        {modelUri ? (
          <Canvas
            style={styles.canvas}
            frameloop="always"
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping }}
            camera={{ position: [0, 0, 2.85], fov: 21, near: 0.1, far: 30 }}
            onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[-0.7, 0.55, 1.8]} intensity={0.4} color="#9bb7ff" />
            <Suspense fallback={null}>
              <HitCardModel uri={modelUri} backUri={backUri} frontUrl={frontUrl} spin={spin} />
            </Suspense>
          </Canvas>
        ) : null}
      </View>
    </GestureDetector>
  );
}

function HitCardModel({
  uri,
  backUri,
  frontUrl,
  spin,
}: {
  uri: string;
  backUri: string | null;
  frontUrl?: string;
  spin: MutableRefObject<{ x: number; y: number }>;
}) {
  const gltf = useLoader(GLTFLoader, uri);
  const group = useRef<Object3D>(null);
  const spark = useRef<DirectionalLight>(null);
  const maps = useRef<{ front?: Texture; back?: Texture }>({});

  const scene = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((child) => {
      if (!isMesh(child)) return;
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => material.clone())
        : child.material.clone();
      const label = meshLabel(child);
      if (label.includes('FrontPrint')) {
        applyPlanarUVs(child, false, true);
        child.material = printMaterial(0.22, 0.55);
      } else if (label.includes('BackPrint')) {
        applyPlanarUVs(child, true, true);
        child.material = printMaterial(0.18, 0.48);
      }
    });
    return root;
  }, [gltf]);

  useEffect(() => {
    const loader = new TextureLoader();
    loader.setCrossOrigin('anonymous');
    let cancelled = false;

    const paint = (kind: 'FrontPrint' | 'BackPrint', texture: Texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = true;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      scene.traverse((child) => {
        if (!isMesh(child) || !meshLabel(child).includes(kind)) return;
        const material = child.material as MeshPhysicalMaterial;
        material.map = texture;
        material.color.set('#ffffff');
        material.needsUpdate = true;
      });
    };

    if (backUri) {
      loader.load(backUri, (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        maps.current.back?.dispose();
        maps.current.back = texture;
        paint('BackPrint', texture);
      });
    }

    if (frontUrl) {
      loader.load(frontUrl, (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        maps.current.front?.dispose();
        maps.current.front = texture;
        paint('FrontPrint', texture);
      });
    }

    return () => {
      cancelled = true;
      maps.current.front?.dispose();
      maps.current.back?.dispose();
    };
  }, [backUri, frontUrl, scene]);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.x = spin.current.x;
      group.current.rotation.y = spin.current.y;
    }
    if (spark.current) {
      spark.current.position.set(Math.sin(spin.current.y) * 1.2 + 0.2, 0.9, Math.cos(spin.current.y) * 1.4 + 1.1);
    }
  });

  return (
    <>
      <directionalLight ref={spark} intensity={2.05} color="#fff4e0" />
      <pointLight position={[0.2, 0.45, 1.6]} intensity={0.9} color="#ffffff" distance={4} />
      <group ref={group}>
        <group rotation={[Math.PI / 2, 0, 0]} scale={8.15}>
          <primitive object={scene} />
        </group>
      </group>
    </>
  );
}

function printMaterial(metalness: number, clearcoat: number) {
  return new MeshPhysicalMaterial({
    color: '#ffffff',
    metalness,
    roughness: 0.28,
    clearcoat,
    clearcoatRoughness: 0.18,
    reflectivity: 0.55,
  });
}

const styles = StyleSheet.create({
  fill: { width: CARD_W, height: CARD_H, overflow: 'hidden', backgroundColor: 'transparent' },
  canvas: { width: CARD_W, height: CARD_H, backgroundColor: 'transparent', pointerEvents: 'none' },
});
