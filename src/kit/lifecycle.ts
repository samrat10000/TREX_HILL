import * as THREE from 'three';
import { KIT } from './core';
import { useEffect, useState } from 'react';

export function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse((node: any) => {
    if(node.isInstancedMesh)node.dispose();
    if(node.shadow)node.shadow.dispose();
    KIT.glowSprites.delete(node);
    // Three shares one billboard geometry between all Sprite instances.
    if (node.geometry&&!node.isSprite) geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
      if (material.userData.kitShared) continue;
      materials.add(material);
      // Kit glow texture is shared; number/decal textures are owned by each vehicle.
      if (material.map?.isCanvasTexture && !node.isSprite) textures.add(material.map);
    }
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
}

/** Allocate factories in effects, so discarded StrictMode renders cannot leak GPU objects. */
export function useKitObject<T>(factory: () => T, key: string, dispose: (value: T) => void): T | null {
  const [record, setRecord] = useState<{ key: string; value: T } | null>(null);
  useEffect(() => {
    const next = factory(); setRecord({ key, value: next });
    return () => dispose(next);
    // key describes the full factory input; factory/dispose identities may change each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return record?.key === key ? record.value : null;
}

export function updateObject(root: THREE.Object3D, dt: number, t: number, env: any, focus?: THREE.Vector3) {
  if (!root.visible) return;
  if (root.userData.rig) { root.userData.rig.update(dt, t, env); root.userData.rig.setLights(env.night); return; }
  if (root.userData.update) { root.userData.update(dt, t, env, focus); return; }
  for (const child of root.children) updateObject(child, dt, t, env, focus);
}
