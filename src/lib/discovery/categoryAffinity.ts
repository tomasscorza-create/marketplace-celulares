import type { PublicCategory } from "../../types/public";

type CategoryAffinityOptions = {
  limit?: number;
  minScore?: number;
};

const CATEGORY_AFFINITY_GROUPS: string[][] = [
  ["celulares", "smartphones", "telefonia"],
  ["fundas", "protectores", "vidrios templados", "hidrogel"],
  ["cargadores", "cables", "baterias portatiles", "powerbanks"],
  ["auriculares", "parlantes", "audio", "inalambricos"],
  ["smartwatches", "relojes", "mallas"],
  ["soportes", "accesorios auto", "aros de luz"],
];

const CATEGORY_DIRECT_AFFINITIES: Record<string, string[]> = {
  celulares: ["fundas", "vidrios templados", "cargadores", "auriculares"],
  smartphones: ["fundas", "vidrios templados", "cargadores", "auriculares"],
  fundas: ["vidrios templados", "celulares", "hidrogel"],
  "vidrios templados": ["fundas", "celulares"],
  hidrogel: ["fundas", "celulares"],
  cargadores: ["cables", "celulares", "baterias portatiles"],
  cables: ["cargadores", "baterias portatiles"],
  "baterias portatiles": ["cables", "cargadores", "celulares"],
  auriculares: ["celulares", "audio"],
  parlantes: ["audio", "celulares"],
  smartwatches: ["mallas", "celulares", "cargadores"],
  mallas: ["smartwatches"],
  soportes: ["accesorios auto", "celulares"],
  "accesorios auto": ["soportes", "cargadores"],
};

export function normalizeCategoryName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCategoryTerms(category: PublicCategory) {
  return new Set(
    normalizeCategoryName(`${category.name} ${category.slug}`)
      .split(/\s+/)
      .filter((term) => term.length >= 3),
  );
}

function getSharedTermScore(leftCategory: PublicCategory, rightCategory: PublicCategory) {
  const leftTerms = getCategoryTerms(leftCategory);
  const rightTerms = getCategoryTerms(rightCategory);
  let sharedTerms = 0;

  leftTerms.forEach((term) => {
    if (rightTerms.has(term)) {
      sharedTerms += 1;
    }
  });

  return Math.min(sharedTerms * 12, 24);
}

function getSharedGroupScore(leftName: string, rightName: string) {
  return CATEGORY_AFFINITY_GROUPS.some(
    (group) => group.includes(leftName) && group.includes(rightName),
  )
    ? 45
    : 0;
}

function getDirectAffinityScore(leftName: string, rightName: string) {
  if (CATEGORY_DIRECT_AFFINITIES[leftName]?.includes(rightName)) {
    return 70;
  }

  if (CATEGORY_DIRECT_AFFINITIES[rightName]?.includes(leftName)) {
    return 64;
  }

  return 0;
}

export function getCategoryAffinityScore(
  sourceCategory: PublicCategory,
  candidateCategory: PublicCategory,
) {
  if (sourceCategory.id === candidateCategory.id) {
    return 100;
  }

  const sourceName = normalizeCategoryName(sourceCategory.name);
  const candidateName = normalizeCategoryName(candidateCategory.name);

  return Math.max(
    getDirectAffinityScore(sourceName, candidateName),
    getSharedGroupScore(sourceName, candidateName),
    getSharedTermScore(sourceCategory, candidateCategory),
  );
}

export function getRelatedCategories(
  sourceCategory: PublicCategory,
  categories: PublicCategory[],
  options: CategoryAffinityOptions = {},
) {
  const { limit = 6, minScore = 24 } = options;

  return categories
    .filter((category) => category.id !== sourceCategory.id)
    .map((category) => ({
      category,
      score: getCategoryAffinityScore(sourceCategory, category),
    }))
    .filter(({ score }) => score >= minScore)
    .sort((leftItem, rightItem) => {
      if (rightItem.score !== leftItem.score) {
        return rightItem.score - leftItem.score;
      }

      return leftItem.category.name.localeCompare(rightItem.category.name, "es");
    })
    .slice(0, limit)
    .map(({ category }) => category);
}

export function getRelatedCategoryIds(
  sourceCategory: PublicCategory,
  categories: PublicCategory[],
  options?: CategoryAffinityOptions,
) {
  return getRelatedCategories(sourceCategory, categories, options).map(
    (category) => category.id,
  );
}
