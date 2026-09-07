import type { GLViewer } from "./molecularViewer";
export function changeViewWithKey(
  v: GLViewer,
  key: string,
  initial: number[],
): boolean {
  if (
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "+",
      "=",
      "-",
      "0",
    ].includes(key)
  )
    return false;
  if (key.startsWith("Arrow"))
    v.rotate(
      key === "ArrowLeft" || key === "ArrowUp" ? -12 : 12,
      key === "ArrowLeft" || key === "ArrowRight" ? "y" : "x",
    );
  else if (key === "0") v.setView([...initial]);
  else v.zoom(key === "-" ? 0.9 : 1.1);
  v.render();
  return true;
}
