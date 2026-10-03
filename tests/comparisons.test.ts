import { expect, it } from "vitest";
import { moleculeIds } from "../src/data/carbohydrates";
import { comparisons, preferredComparisonByMolecule, preferredComparisonForMolecule,
  comparisonCapabilities } from "../src/data/comparisons";

const expected = [
  ["GLC", "anomer"], ["BGC", "anomer"], ["GAL", "epimer"], ["FRU", "aldoseKetose"],
  ["BDR", "deoxy"], ["2DR", "deoxy"], ["MAL", "linkage"], ["CBI", "linkage"],
  ["LAT", "disaccharideEpimer"], ["SUC", "reducingDisaccharide"],
  ["AMYLOSE", "glucan"], ["CELLULOSE", "glucan"],
  ["AMYLOPECTIN", "branching"], ["GLYCOGEN", "branching"],
] as const;

it.each(expected)("%s enters %s and remains in the pair", (id, kind) => {
  expect(preferredComparisonForMolecule(id)).toBe(kind);
  expect([comparisons[kind].left, comparisons[kind].right]).toContain(id);
});

it("covers the entire molecule library", () => {
  expect(Object.keys(preferredComparisonByMolecule).sort()).toEqual([...moleculeIds].sort());
});

it.each([
  ["aldoseKetose", "BGC", "FRU"],
  ["disaccharideEpimer", "CBI", "LAT"],
  ["reducingDisaccharide", "MAL", "SUC"],
] as const)("%s preserves its teaching order", (kind, left, right) => {
  expect(comparisons[kind]).toMatchObject({ left, right });
});

it("offers reducing-end inspection for maltose/sucrose and excludes chair axes for fructose", () => {
  expect(comparisonCapabilities("reducingDisaccharide")).toMatchObject({ reducing: true, glycosidic: true });
  expect(comparisonCapabilities("aldoseKetose").axial).toBe(false);
  expect(comparisonCapabilities("disaccharideEpimer").glycosidic).toBe(true);
});
