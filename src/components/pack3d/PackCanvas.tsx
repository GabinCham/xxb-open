import { Asset } from 'expo-asset';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  ACESFilmicToneMapping,
  Color,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  ClampToEdgeWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { Canvas, useFrame, useLoader, useThree } from './r3f';

const packGltfModule = require('../../../assets/BoosterOP.glb');

type PackCanvasProps = {
  textureUrl: string;
  accent: string;
  autoRotate?: boolean;
};

function isMesh(object: Object3D): object is Mesh {
  return (object as Mesh).isMesh === true;
}

function foilKind(object: Mesh): 'FRONT' | 'BACK' | null {
  const names = `${object.name} ${object.parent?.name ?? ''}`;
  if (names.includes('FRONT_FOIL')) return 'FRONT';
  if (names.includes('BACK_FOIL')) return 'BACK';
  return null;
}

function useBoosterGltfUri() {
  const [modelUri, setModelUri] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Asset.fromModule(packGltfModule)
      .downloadAsync()
      .then((asset) => {
        if (!live) return;
        const uri = asset.localUri ?? asset.uri;
        if (uri) setModelUri(uri);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return modelUri;
}

function PackLights() {
  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight position={[2.6, 3.4, 4.2]} intensity={1.7} />
      <directionalLight position={[-2.4, 1.2, 2.8]} intensity={0.55} />
      <directionalLight position={[0.2, -1.2, 2]} intensity={0.25} />
    </>
  );
}

export function PackCanvas({ textureUrl, accent, autoRotate = false }: PackCanvasProps) {
  const modelUri = useBoosterGltfUri();

  return (
    <Canvas
      style={styles.canvas}
      frameloop={autoRotate ? 'always' : 'demand'}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, preserveDrawingBuffer: true }}
      camera={{ position: [1.05, 0.18, 3.4], fov: 26, near: 0.1, far: 20 }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <PackLights />
      {modelUri ? (
        <Suspense fallback={null}>
          <PackModel uri={modelUri} textureUrl={textureUrl} accent={accent} autoRotate={autoRotate} />
        </Suspense>
      ) : null}
    </Canvas>
  );
}

function PackModel({
  uri,
  textureUrl,
  accent,
  autoRotate,
}: {
  uri: string;
  textureUrl: string;
  accent: string;
  autoRotate: boolean;
}) {
  const gltf = useLoader(GLTFLoader, uri);
  const group = useRef<Group>(null);
  const { invalidate } = useThree();
  const applied = useRef<Texture | null>(null);

  const scene = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((child) => {
      if (!isMesh(child)) return;
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => (material as Material).clone())
        : (child.material as Material).clone();
    });
    return root;
  }, [gltf]);

  useEffect(() => {
    const loader = new TextureLoader();
    loader.setCrossOrigin('anonymous');
    let cancelled = false;

    loader.load(
      textureUrl,
      (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        texture.flipY = false;
        texture.wrapS = ClampToEdgeWrapping;
        texture.wrapT = ClampToEdgeWrapping;
        texture.repeat.set(0.9, 0.93);
        texture.offset.set(0.05, 0.035);
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        applied.current?.dispose();
        applied.current = texture;

        scene.traverse((child) => {
          if (!isMesh(child)) return;
          const kind = foilKind(child);
          if (!kind) return;
          const material = child.material as MeshStandardMaterial;
          material.map = texture;
          material.color.set('#ffffff');
          material.metalness = kind === 'FRONT' ? 0.1 : 0.22;
          material.roughness = kind === 'FRONT' ? 0.38 : 0.5;
          if (kind === 'BACK') material.color = new Color(accent).lerp(new Color('#ffffff'), 0.35);
          material.needsUpdate = true;
        });
        invalidate();
      },
      undefined,
      () => invalidate(),
    );

    return () => {
      cancelled = true;
    };
  }, [accent, invalidate, scene, textureUrl]);

  useEffect(
    () => () => {
      applied.current?.dispose();
    },
    [],
  );

  const t = useRef(0);

  useFrame((_, delta) => {
    if (!group.current || !autoRotate) return;
    t.current += delta;
    group.current.rotation.y = Math.PI + 0.38 + Math.sin(t.current * 0.55) * 0.42;
  });

  return (
    <group ref={group} rotation={[0, Math.PI + 0.38, 0]} position={[0, -0.02, 0]}>
      <primitive object={scene} />
    </group>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: 'transparent' },
});
