import type { PublicArtisanStorefront, PublicCatalogFeedItem, PublicCatalogStorefrontGroup, PublicProduct } from "../../types/public";

type InterestSignalsLike = {
  recentArtisanIds: string[];
  recentCategoryIds: string[];
  recentProductIds: string[];
  recentSearches: string[];
};

function normalizeTerm(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPhraseIntoTerms(value: string) {
  const normalizedValue = normalizeTerm(value);

  if (!normalizedValue) {
    return [] as string[];
  }

  const tokens = normalizedValue
    .split(/[\s/,-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  return [
    ...(normalizedValue.length <= 40 ? [normalizedValue] : []),
    ...tokens,
  ];
}

export function dedupeSemanticTerms(
  values: Array<string | null | undefined>,
  limit = 24,
) {
  const uniqueTerms = new Set<string>();

  values.forEach((value) => {
    splitPhraseIntoTerms(value ?? "").forEach((term) => {
      if (uniqueTerms.size < limit) {
        uniqueTerms.add(term);
      }
    });
  });

  return Array.from(uniqueTerms);
}

export function getStorefrontSemanticTerms(
  storefront: Pick<PublicArtisanStorefront, "full_name" | "store_description" | "store_name"> | null | undefined,
) {
  if (!storefront) {
    return [] as string[];
  }

  return dedupeSemanticTerms(
    [storefront.store_name, storefront.full_name, storefront.store_description],
    24,
  );
}

export function getProductSemanticTerms(
  product: Pick<
    PublicProduct,
    "categories" | "description" | "product_attributes" | "title"
  >,
  storefront?: Pick<PublicArtisanStorefront, "full_name" | "store_description" | "store_name"> | null,
) {
  return dedupeSemanticTerms(
    [
      product.title,
      product.description,
      product.categories?.name ?? null,
      ...(product.product_attributes ?? []).flatMap((attribute) => [attribute.key, attribute.value]),
      ...(storefront ? getStorefrontSemanticTerms(storefront) : []),
    ],
    40,
  );
}

export function getInterestSemanticTerms(signals: InterestSignalsLike) {
  return dedupeSemanticTerms(signals.recentSearches, 24);
}

function getTermOverlapScore(
  interestTerms: string[],
  candidateTerms: string[],
  maxMatches: number,
  pointsPerMatch: number,
) {
  if (interestTerms.length === 0 || candidateTerms.length === 0) {
    return 0;
  }

  const candidateTermSet = new Set(candidateTerms);
  let matches = 0;

  for (const interestTerm of interestTerms) {
    if (candidateTermSet.has(interestTerm)) {
      matches += 1;
    }

    if (matches >= maxMatches) {
      break;
    }
  }

  return matches * pointsPerMatch;
}

export function getCatalogFeedItemRelevanceScore(
  item: PublicCatalogFeedItem,
  signals: InterestSignalsLike,
) {
  const interestTerms = getInterestSemanticTerms(signals);
  const productTerms = getProductSemanticTerms(item.product, item.storefront);

  return (
    (signals.recentProductIds.includes(item.product.id) ? 18 : 0) +
    (signals.recentCategoryIds.includes(item.product.category_id) ? 10 : 0) +
    (signals.recentArtisanIds.includes(item.product.artisan_id) ? 8 : 0) +
    getTermOverlapScore(interestTerms, productTerms, 5, 3)
  );
}

export function getStorefrontRelevanceScore(
  storefront: PublicArtisanStorefront,
  signals: InterestSignalsLike,
) {
  const interestTerms = getInterestSemanticTerms(signals);
  const storefrontTerms = getStorefrontSemanticTerms(storefront);

  return (
    (signals.recentArtisanIds.includes(storefront.id) ? 14 : 0) +
    getTermOverlapScore(interestTerms, storefrontTerms, 5, 3)
  );
}

export function getStorefrontReferenceSimilarityScore(
  storefront: PublicArtisanStorefront,
  referenceTerms: string[],
) {
  return getTermOverlapScore(referenceTerms, getStorefrontSemanticTerms(storefront), 6, 4);
}

export function getStorefrontGroupRelevanceScore(
  group: PublicCatalogStorefrontGroup,
  signals: InterestSignalsLike,
) {
  const storefrontScore = getStorefrontRelevanceScore(group.storefront, signals);
  const productScore = group.products.reduce((highestScore, product) => {
    const nextScore = getCatalogFeedItemRelevanceScore(
      {
        isBoosted: false,
        product,
        storefront: group.storefront,
      },
      signals,
    );

    return Math.max(highestScore, nextScore);
  }, 0);

  return storefrontScore + productScore;
}
