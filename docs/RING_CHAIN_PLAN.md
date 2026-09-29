# Ring–chain interconversion preflight (2026-09-29)

- Branch: `main`; clean worktree before changes. No branch change, commit or push.
- Baseline: `npm test` 7 files / 92 tests passed; typecheck and build passed.
  Existing warning: direct `eval` inside bundled 3Dmol 2.5.5.
- React 19 / TypeScript / Vite, 14 structures. 3Dmol 2.5.5 is installed.
- MoleculeViewer fetches local SDF with AbortController/disposed guards, reuses
  GLViewer, clears models only for structure loads and restores the initial camera
  on explicit reset. ComparisonViewer keeps its two viewers and synchronizes views.
- Metadata names atoms, residues, OH and anomeric sites. applyAnnotations owns
  labels/shapes. Existing keyboard controls operate on the same camera.
- Scientific build uses original CCD CIF + PubChem SDF, RDKit 3D stereochemistry,
  SHA-256 provenance, rigid alignment and exported metadata. Tests independently
  read shipped SDF and exercise the real 3Dmol parser as well as mocked lifecycle.
- Reduced motion stops automatic rotation; offline build caches local SDF and
  all bundled application assets. New animation data must be bundled locally.

Implementation plan: preserve source endpoints; map C1–C6/O1–O6 explicitly;
generate staged internal-coordinate keyframes with geometry validation; add a
small glucose-only mode and RAF timeline that stops at the shared open endpoint
until an anomer is chosen; use the same viewer and stable heavy atom objects;
keep coordinate updates separate from discrete bond-state changes; restore normal
annotations on exit; test geometry, lifecycle, camera, accessibility and regression.

API inspection: `node_modules/3dmol/src/GLModel.ts` in installed 2.5.5 has no
`syncAtomPositions`. Public `addFrame` / `setFrame` accept AtomSpec arrays and
invalidate model geometry; they do not clear GLViewer or change its camera.
One mutable local frame can therefore retain atom identity while coordinates and
explicit bond arrays change. This rebuilds the tiny model geometry, not the viewer.
