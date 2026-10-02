// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StructureFormulaPreview } from "../src/components/StructureFormulaPreview";
import { carbohydrates, moleculeById, NO_FOCUS, structures } from "../src/data/carbohydrates";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(cleanup);

for (const molecule of carbohydrates) it(`${molecule.id}: exactly one reference, with all carbon/residue targets and no external images`, () => {
  const { container } = render(<StructureFormulaPreview molecule={molecule} focus={NO_FOCUS} onFocus={() => {}} />);
  const data = structures[molecule.id];
  expect(screen.getByRole("region", { name: `${molecule.name} 2D 구조식` })).toBeTruthy();
  expect(container.querySelectorAll("svg")).toHaveLength(1);
  expect(container.querySelectorAll("img, image, iframe")).toHaveLength(0);
  if (molecule.representationType === "molecule") {
    for (const r of data.residues) for (const c of Object.keys(r.carbons))
      expect(screen.getByRole("button", { name: `${data.residues.length > 1 ? `${r.id} · ` : ""}${c} 강조` })).toBeTruthy();
    expect(container.querySelectorAll("polygon")).toHaveLength(data.residues.length);
    expect(container.querySelectorAll(".formula-bond")).toHaveLength(data.glycosidicBonds.length);
  } else {
    expect(screen.getByText(/대표 fragment입니다/)).toBeTruthy();
    for (const r of data.residues) expect(screen.getByRole("button", { name: `${r.sugarLabel} ${r.id} 강조` })).toBeTruthy();
  }
});

it("sucrose retains β on fructose and never draws free OH at either linked carbon", () => {
  const { container } = render(<StructureFormulaPreview molecule={moleculeById("SUC")} focus={NO_FOCUS} onFocus={() => {}} />);
  expect(screen.getByRole("group").getAttribute("aria-label")).toContain("α(1→2)β");
  expect(screen.getByText(/환원 말단 없음/)).toBeTruthy();
  expect(container.querySelector('[data-residue="A"] [data-substituent="O1"]')).toBeNull();
  expect(container.querySelector('[data-residue="B"] [data-substituent="O2"]')).toBeNull();
  expect(container.querySelectorAll("polygon")[1].getAttribute("points")!.split(" ")).toHaveLength(5);
});

it("deoxyribose explicitly shows both C2 hydrogens and no C2 OH", () => {
  const { container } = render(<StructureFormulaPreview molecule={moleculeById("2DR")} focus={NO_FOCUS} onFocus={() => {}} />);
  expect(container.querySelectorAll('[data-carbon="C2"]')).toHaveLength(2);
  expect(container.querySelector('[data-substituent="O2"]')).toBeNull();
  expect(screen.getByText(/C2는 CH₂/)).toBeTruthy();
});

it("carbon and linkage selection supports Enter/Space, residue qualification and deselection", () => {
  const onFocus = vi.fn(), molecule = moleculeById("MAL");
  const { rerender } = render(<StructureFormulaPreview molecule={molecule} focus={NO_FOCUS} onFocus={onFocus} />);
  const c = screen.getByRole("button", { name: "B · C1 강조" });
  fireEvent.keyDown(c, { key: " " });
  const selected = { carbon: "C1", residue: "B", bond: null };
  expect(onFocus).toHaveBeenLastCalledWith(selected);
  rerender(<StructureFormulaPreview molecule={molecule} focus={selected} onFocus={onFocus} />);
  expect(c.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(c);
  expect(onFocus).toHaveBeenLastCalledWith(NO_FOCUS);
  fireEvent.keyDown(screen.getByRole("button", { name: /A:C1–O–B:C4/ }), { key: "Enter" });
  expect(onFocus).toHaveBeenLastCalledWith({ carbon: null, residue: null, bond: "L1" });
});

it("enlargement is a labelled dialog, avoids duplicate interactive targets, and restores focus on Escape", () => {
  render(<StructureFormulaPreview molecule={moleculeById("BGC")} focus={NO_FOCUS} onFocus={() => {}} />);
  const opener = screen.getByRole("button", { name: /크게 보기/ });
  fireEvent.click(opener);
  const dialog = screen.getByRole("dialog", { name: "β-D-glucose · 2D 구조식" });
  expect(within(dialog).getAllByRole("button")).toHaveLength(1);
  expect(within(dialog).getByRole("img")).toBeTruthy();
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
});
