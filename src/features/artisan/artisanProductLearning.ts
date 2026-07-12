import type { ArtisanCategory, ArtisanProduct, ArtisanProductInput } from "@/types/artisan";
import type { ProductAttribute } from "@/types/productAttributes";

export type ArtisanProductLearningProfile = {
  confidence: "high" | "low" | "medium" | "none";
  historyCount: number;
  suggestedAttributes: ProductAttribute[];
  suggestedCategoryId: string;
  suggestedLeadTimeDays: number | null;
  suggestedPrice: number;
  suggestedStockQuantity: number | null;
  suggestedTitlePrefixes: string[];
  suggestedTitleWords: string[];
  suggestedAvailabilityMode: ArtisanProductInput["availability_mode"];
};

type FrequencyEntry<T> = {
  count: number;
  latestIndex: number;
  value: T;
};

const TITLE_STOP_WORDS = new Set([
  "a",
  "al",
  "con",
  "de",
  "del",
  "el",
  "en",
  "la",
  "las",
  "los",
  "para",
  "por",
  "sin",
  "un",
  "una",
  "y",
]);

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function addFrequency<T>(map: Map<string, FrequencyEntry<T>>, key: string, value: T, index: number) {
  const normalizedKey = normalizeText(key);

  if (!normalizedKey) {
    return;
  }

  const currentValue = map.get(normalizedKey);

  if (!currentValue) {
    map.set(normalizedKey, {
      count: 1,
      latestIndex: index,
      value,
    });
    return;
  }

  currentValue.count += 1;
  currentValue.latestIndex = Math.min(currentValue.latestIndex, index);
}

function getTopEntries<T>(map: Map<string, FrequencyEntry<T>>) {
  return Array.from(map.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.latestIndex - right.latestIndex;
  });
}

function getMedian(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex];
  }

  return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
}

function getRoundedPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value >= 1000) {
    return Math.round(value / 100) * 100;
  }

  if (value >= 100) {
    return Math.round(value / 10) * 10;
  }

  return Math.round(value);
}

function getMostUsedAvailabilityMode(products: ArtisanProduct[]) {
  const stockCount = products.filter((product) => product.availability_mode === "stock").length;
  const madeToOrderCount = products.length - stockCount;

  return madeToOrderCount > stockCount ? "made_to_order" : "stock";
}

function getConfidence(historyCount: number, suggestedAttributesCount: number) {
  if (historyCount === 0) {
    return "none";
  }

  if (historyCount >= 10 && suggestedAttributesCount >= 3) {
    return "high";
  }

  if (historyCount >= 4) {
    return "medium";
  }

  return "low";
}

function getTitlePrefixes(products: ArtisanProduct[]) {
  const prefixes = new Map<string, FrequencyEntry<string>>();

  products.forEach((product, index) => {
    const words = normalizeText(product.title)
      .split(" ")
      .filter((word) => word.length > 2);

    if (words.length >= 2) {
      addFrequency(prefixes, words.slice(0, 2).join(" "), words.slice(0, 2).join(" "), index);
    }

    if (words.length >= 3) {
      addFrequency(prefixes, words.slice(0, 3).join(" "), words.slice(0, 3).join(" "), index);
    }
  });

  return getTopEntries(prefixes)
    .filter((entry) => entry.count >= 2)
    .slice(0, 5)
    .map((entry) => entry.value);
}

function getTitleWords(products: ArtisanProduct[]) {
  const titleWords = new Map<string, FrequencyEntry<string>>();

  products.forEach((product, index) => {
    normalizeText(product.title)
      .split(" ")
      .filter((word) => word.length > 3 && !TITLE_STOP_WORDS.has(word))
      .forEach((word) => {
        addFrequency(titleWords, word, word, index);
      });
  });

  return getTopEntries(titleWords)
    .filter((entry) => entry.count >= 2)
    .slice(0, 8)
    .map((entry) => entry.value);
}

function getSuggestedAttributes(products: ArtisanProduct[]) {
  const attributesByKey = new Map<string, FrequencyEntry<string>>();
  const valuesByKey = new Map<string, Map<string, FrequencyEntry<string>>>();

  products.forEach((product, productIndex) => {
    product.product_attributes?.forEach((attribute) => {
      const key = normalizeText(attribute.key);
      const value = attribute.value.trim();

      if (!key || !value) {
        return;
      }

      addFrequency(attributesByKey, key, key, productIndex);

      const valueMap = valuesByKey.get(key) ?? new Map<string, FrequencyEntry<string>>();
      addFrequency(valueMap, value, value, productIndex);
      valuesByKey.set(key, valueMap);
    });
  });

  return getTopEntries(attributesByKey)
    .filter((entry) => entry.count >= 2 || entry.count / Math.max(products.length, 1) >= 0.35)
    .slice(0, 6)
    .map((entry) => {
      const valueEntry = getTopEntries(
        valuesByKey.get(entry.value) ?? new Map<string, FrequencyEntry<string>>(),
      )[0];

      return {
        key: entry.value,
        value: valueEntry?.value ?? "",
      };
    });
}

export function buildArtisanProductLearningProfile(
  products: ArtisanProduct[],
  categories: ArtisanCategory[],
): ArtisanProductLearningProfile {
  const activeCategoryIds = new Set(categories.map((category) => category.id));
  const categoryFrequency = new Map<string, FrequencyEntry<string>>();

  products.forEach((product, index) => {
    if (activeCategoryIds.has(product.category_id)) {
      addFrequency(categoryFrequency, product.category_id, product.category_id, index);
    }
  });

  const prices = products
    .map((product) => Number(product.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  const availabilityMode = getMostUsedAvailabilityMode(products);
  const suggestedAttributes = getSuggestedAttributes(products);
  const stockValues = products
    .map((product) => product.stock_quantity)
    .filter((value): value is number => Number.isFinite(value) && value !== null && value > 0);
  const leadTimeValues = products
    .map((product) => product.lead_time_days)
    .filter((value): value is number => Number.isFinite(value) && value !== null && value > 0);

  return {
    confidence: getConfidence(products.length, suggestedAttributes.length),
    historyCount: products.length,
    suggestedAttributes,
    suggestedAvailabilityMode: availabilityMode,
    suggestedCategoryId: getTopEntries(categoryFrequency)[0]?.value ?? categories[0]?.id ?? "",
    suggestedLeadTimeDays:
      availabilityMode === "made_to_order" ? Math.max(1, Math.round(getMedian(leadTimeValues))) || 7 : null,
    suggestedPrice: getRoundedPrice(getMedian(prices)),
    suggestedStockQuantity:
      availabilityMode === "stock" ? Math.max(1, Math.round(getMedian(stockValues))) || 1 : null,
    suggestedTitlePrefixes: getTitlePrefixes(products),
    suggestedTitleWords: getTitleWords(products),
  };
}
