/** Temporary stand-in for the 3D viewer while src/scene is being built. */
export function ModelViewerPlaceholder() {
  return (
    <div className="viewer-placeholder">
      <div className="viewer-placeholder-figure" />
      <span>3D model loading…</span>
    </div>
  );
}
