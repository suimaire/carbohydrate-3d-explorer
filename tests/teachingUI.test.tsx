// @vitest-environment jsdom
import { afterEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { ObservationQuestions } from "../src/components/ObservationQuestions";
import { HaworthPreview } from "../src/components/HaworthPreview";
import { MoleculeSidebar } from "../src/components/MoleculeSidebar";
import { ViewerControls } from "../src/components/ViewerControls";
import { PolymerSchematic } from "../src/components/PolymerSchematic";
import {
  capabilitiesOf,
  carbohydrates,
  defaultOptions,
  sidebarSections,
  structures,
} from "../src/data/carbohydrates";
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
it("the sidebar counts each category from the data and lists every molecule", () => {
  const onSelect = vi.fn();
  render(<MoleculeSidebar selected="BGC" onSelect={onSelect} />);
  const sections = sidebarSections();
  expect(sections.map((s) => s.label)).toEqual(["단당류", "이당류", "다당류"]);
  for (const section of sections) {
    const heading = screen.getByRole("heading", {
      level: 2,
      name: new RegExp(section.label),
    });
    expect(heading.textContent).toContain(String(section.count).padStart(2, "0"));
    for (const group of section.groups)
      expect(
        screen.getByRole("heading", { level: 3, name: group.name }),
      ).toBeTruthy();
  }
  for (const m of carbohydrates) {
    expect(screen.getByText(m.name)).toBeTruthy();
    expect(screen.getByText(m.koreanName)).toBeTruthy();
  }
  expect(
    screen.getByRole("button", { name: /β-D-glucose/ }).getAttribute("aria-pressed"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: /Amylopectin/ }));
  expect(onSelect).toHaveBeenCalledWith("AMYLOPECTIN");
});
it("the sidebar counts match the shipped structures", () => {
  const counts = Object.fromEntries(
    sidebarSections().map((s) => [s.category, s.count]),
  );
  expect(counts).toEqual({
    monosaccharide: 6,
    disaccharide: 4,
    polysaccharide: 4,
  });
});
it("viewer controls only offer what the current structure supports", () => {
  const onChange = vi.fn();
  const view = render(
    <ViewerControls
      options={defaultOptions}
      onChange={onChange}
      onReset={() => {}}
      capabilities={capabilitiesOf("BGC")}
    />,
  );
  expect(screen.queryByRole("button", { name: "글리코시드 결합" })).toBeNull();
  expect(screen.queryByRole("button", { name: "가지 결합" })).toBeNull();
  expect(screen.getByRole("button", { name: "axial / equatorial" })).toBeTruthy();
  view.rerender(
    <ViewerControls
      options={defaultOptions}
      onChange={onChange}
      onReset={() => {}}
      capabilities={capabilitiesOf("MAL")}
    />,
  );
  expect(screen.getByRole("button", { name: "글리코시드 결합" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "환원 말단" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "가지 결합" })).toBeNull();
  expect(screen.queryByRole("button", { name: "axial / equatorial" })).toBeNull();
  view.rerender(
    <ViewerControls
      options={defaultOptions}
      onChange={onChange}
      onReset={() => {}}
      capabilities={capabilitiesOf("GLYCOGEN")}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "가지 결합" }));
  expect(onChange).toHaveBeenCalledWith({ ...defaultOptions, branch: true });
});
it("the polymer schematic draws the fragment's own topology and stays clickable", () => {
  const residues = vi.fn();
  const bonds = vi.fn();
  render(
    <PolymerSchematic
      data={structures.AMYLOPECTIN}
      selectedResidue={null}
      onSelectResidue={residues}
      selectedBond={null}
      onSelectBond={bonds}
    />,
  );
  const group = screen.getByRole("group");
  expect(group.getAttribute("aria-label")).toContain("12개");
  expect(group.getAttribute("aria-label")).toContain("α(1→6)");
  for (const residue of structures.AMYLOPECTIN.residues)
    expect(
      within(group).getByRole("button", {
        name: `${residue.sugarLabel} ${residue.id} 강조`,
      }),
    ).toBeTruthy();
  const branch = structures.AMYLOPECTIN.glycosidicBonds.find((b) => b.branch)!;
  fireEvent.click(
    within(group).getByRole("button", {
      name: `${branch.donorResidue}에서 ${branch.acceptorResidue}로 가는 ${branch.notation} 결합 강조`,
    }),
  );
  expect(bonds).toHaveBeenCalledWith(branch.id);
  fireEvent.keyDown(within(group).getByRole("button", { name: /Glc A 강조/ }), {
    key: "Enter",
  });
  expect(residues).toHaveBeenCalledWith("A");
  expect(
    screen.getByText(/실제 가지 빈도를 나타내는 것이 아닙니다/),
  ).toBeTruthy();
});
it("the schematic is skipped for structures with fewer than three residues", () => {
  const { container } = render(
    <PolymerSchematic
      data={structures.MAL}
      selectedResidue={null}
      onSelectResidue={() => {}}
      selectedBond={null}
      onSelectBond={() => {}}
    />,
  );
  expect(container.firstChild).toBeNull();
});
