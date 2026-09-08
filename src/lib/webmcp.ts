import { flushSync } from "react-dom";
import { moleculeIds } from "../data/carbohydrates";
import type { MoleculeId } from "../types/carbohydrate";
interface Registry {
  registerTool(
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
}
export function registerExplorerTool(select: (id: MoleculeId) => void) {
  const context = (document as Document & { modelContext?: Registry })
    .modelContext;
  if (!context) return;
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: "select_carbohydrate",
          title: "탄수화물 선택",
          description:
            "단일 분자 보기로 전환하고 지정한 탄수화물을 선택합니다. 단당류·이당류·다당류 대표 구조를 모두 지원합니다. 3D 파일은 이후 비동기로 로드됩니다.",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", enum: moleculeIds },
            },
            required: ["id"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute(input) {
            if (
              !input ||
              typeof input !== "object" ||
              !("id" in input) ||
              !(moleculeIds as string[]).includes(String(input.id)) ||
              Object.keys(input).length !== 1
            )
              throw Error("유효한 분자 id 한 개가 필요합니다.");
            const id = input.id as MoleculeId;
            flushSync(() => select(id));
            return { selected: id, mode: "single" };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(console.warn);
  } catch (error) {
    console.warn(error);
  }
  return () => lifecycle.abort();
}
