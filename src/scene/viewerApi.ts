/**
 * Small imperative API for the UI toolbar (screenshot). Reset view & auto-rotate go through the store
 * (`resetView()`, `setAutoRotate()`).
 */
import type * as THREE from 'three';

interface ViewerHandles {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
}

let handles: ViewerHandles | null = null;

/** @internal set by <ModelViewer/> */
export function registerViewer(h: ViewerHandles | null) {
  handles = h;
}

/** Render the current frame and return it as a PNG data URL (null if the viewer is not mounted). */
export function captureViewerPNG(): string | null {
  if (!handles) return null;
  const { gl, scene, camera } = handles;
  gl.render(scene, camera);
  return gl.domElement.toDataURL('image/png');
}

/** Convenience: trigger a download of the current view. */
export function downloadViewerScreenshot(filename = 'diamond-armory.png') {
  const url = captureViewerPNG();
  if (!url) return false;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  return true;
}
