import { Asset } from 'expo-asset';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  OrthographicCamera,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { HIT_CANVAS_H, HIT_CANVAS_W, HIT_FRUSTUM_H, HIT_FRUSTUM_W } from '../../data/cardSize';
import { Canvas, useFrame, useLoader, useThree } from './r3f';

const cardGltfModule = require('../../../assets/OP_CARD.glb');
const cardBackModule = require('../../../assets/OP_CARD_BACK.webp');

const PITCH_MAX = 0.48;
const YAW_SENS = 0.0058;
const PITCH_SENS = 0.0042;

type SpinApi = {
  yaw: number;
  pitch: number;
  start: () => void;
  drag: (dx: number, dy: number) => void;
  end: () => void;
  tick: (dt: number) => void;
};

function createSpinApi(): SpinApi {
  let dragging = false;
  const api: SpinApi = {
    yaw: 0,
    pitch: 0,
    start() {
      dragging = true;
    },
    drag(dx: number, dy: number) {
      api.yaw -= dx * YAW_SENS;
      api.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, api.pitch - dy * PITCH_SENS));
    },
    end() {
      dragging = false;
    },
    tick(dt: number) {
      if (dragging) return;
      api.pitch += (0 - api.pitch) * (1 - Math.exp(-6 * dt));
    },
  };
  return api;
}

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
  const spinApi = useRef(createSpinApi()).current;
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

  const startPan = () => {
    lastPan.current = { x: 0, y: 0 };
    spinApi.start();
  };

  const followPan = (tx: number, ty: number) => {
    spinApi.drag(tx - lastPan.current.x, ty - lastPan.current.y);
    lastPan.current = { x: tx, y: ty };
  };

  const endPan = () => {
    spinApi.end();
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart(() => {
      runOnJS(startPan)();
    })
    .onUpdate((event) => {
      runOnJS(followPan)(event.translationX, event.translationY);
    })
    .onEnd(() => {
      runOnJS(endPan)();
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill}>
        {modelUri ? (
          <Canvas
            style={styles.canvas}
            orthographic
            frameloop="always"
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping }}
            camera={{ position: [0, 0, 1], near: 0.01, far: 10, zoom: 1 }}
            onCreated={({ camera, gl }) => {
              gl.toneMappingExposure = 0.95;
              const cam = camera as OrthographicCamera & { manual?: boolean };
              cam.manual = true;
              cam.left = -HIT_FRUSTUM_W / 2;
              cam.right = HIT_FRUSTUM_W / 2;
              cam.top = HIT_FRUSTUM_H / 2;
              cam.bottom = -HIT_FRUSTUM_H / 2;
              cam.updateProjectionMatrix();
              cam.lookAt(0, 0, 0);
            }}
          >
            <FitCardCamera />
            <hemisphereLight args={['#e8eef5', '#2a221c', 0.55]} />
            <ambientLight intensity={0.4} color="#f4eee6" />
            <directionalLight position={[-0.45, 0.38, 0.75]} intensity={0.9} color="#fff2dc" />
            <directionalLight position={[0.55, 0.12, 0.4]} intensity={0.28} color="#9bb4d0" />
            <directionalLight position={[0.2, 0.4, -0.55]} intensity={0.22} color="#e8d2a8" />
            <Suspense fallback={null}>
              <HitCardModel uri={modelUri} backUri={backUri} frontUrl={frontUrl} spinApi={spinApi} />
            </Suspense>
          </Canvas>
        ) : null}
      </View>
    </GestureDetector>
  );
}

function FitCardCamera() {
  const { camera } = useThree();

  useLayoutEffect(() => {
    const cam = camera as OrthographicCamera & { manual?: boolean };
    cam.manual = true;
    cam.left = -HIT_FRUSTUM_W / 2;
    cam.right = HIT_FRUSTUM_W / 2;
    cam.top = HIT_FRUSTUM_H / 2;
    cam.bottom = -HIT_FRUSTUM_H / 2;
    cam.near = 0.01;
    cam.far = 10;
    cam.position.set(0, 0, 1);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function HitCardModel({
  uri,
  backUri,
  frontUrl,
  spinApi,
}: {
  uri: string;
  backUri: string | null;
  frontUrl?: string;
  spinApi: SpinApi;
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
        child.material = printMaterial();
      } else if (label.includes('BackPrint')) {
        applyPlanarUVs(child, true, true);
        child.material = printMaterial();
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

  useFrame((_, dt) => {
    spinApi.tick(dt);
    if (group.current) {
      group.current.rotation.set(spinApi.pitch, spinApi.yaw, 0);
    }
    if (spark.current) {
      spark.current.position.set(
        Math.sin(spinApi.yaw) * 0.7 + 0.45,
        0.62,
        0.28 + Math.cos(spinApi.yaw) * 0.22,
      );
    }
  });

  return (
    <>
      <directionalLight ref={spark} intensity={1.15} color="#fff6e8" />
      <pointLight position={[0.08, 0.12, 0.22]} intensity={0.35} color="#fff8ee" distance={0.7} />
      <group ref={group}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <primitive object={scene} />
        </group>
      </group>
    </>
  );
}

function printMaterial() {
  return new MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0.18,
    roughness: 0.3,
    clearcoat: 0.72,
    clearcoatRoughness: 0.12,
    reflectivity: 0.52,
    ior: 1.5,
    sheen: 0.18,
    sheenRoughness: 0.45,
    sheenColor: '#e8d4a4',
  });
}

const styles = StyleSheet.create({
  fill: { width: HIT_CANVAS_W, height: HIT_CANVAS_H, backgroundColor: 'transparent' },
  canvas: { width: HIT_CANVAS_W, height: HIT_CANVAS_H, backgroundColor: 'transparent', pointerEvents: 'none' },
});
