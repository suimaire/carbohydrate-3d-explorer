// @vitest-environment jsdom
import { afterEach, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ObservationQuestions } from "../src/components/ObservationQuestions";
import { HaworthPreview } from "../src/components/HaworthPreview";
afterEach(cleanup);
it("keeps the answer hidden until requested and allows hiding it again", () => {
  render(
    <ObservationQuestions
      questions={["C1을 찾으세요."]}
      answer="검사할 해설"
    />,
  );
  expect(screen.queryByText("검사할 해설")).toBeNull();
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("검사할 해설")).toBeTruthy();
  fireEvent.click(screen.getByRole("button"));
  expect(screen.queryByText("검사할 해설")).toBeNull();
});
it("Haworth carbon choices support click and keyboard", () => {
  const chosen: string[] = [];
  render(
    <HaworthPreview
      id="BGC"
      selected={null}
      onSelect={(n) => chosen.push(n)}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "C1 강조" }));
  fireEvent.keyDown(screen.getByRole("button", { name: "C4 강조" }), {
    key: "Enter",
  });
  expect(chosen).toEqual(["C1", "C4"]);
});
