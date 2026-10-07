export const SUGAR_LEVELS = [
  { value: "0% Sugar", label: "0% Sugar" },
  { value: "50% Sugar", label: "50% Sugar" },
  { value: "100% Sugar", label: "100% Sugar" },
] as const;

export const ICE_LEVELS = [
  { value: "Regular Ice", label: "Regular Ice" },
  { value: "Less Ice", label: "Less Ice" },
  { value: "No Ice", label: "No Ice" },
] as const;

export const PEARL_OPTIONS = [
  { value: "No Pearls", label: "No Pearls" },
  { value: "Less Pearls", label: "Less Pearls" },
  { value: "Extra Pearls", label: "Extra Pearls (+$0.75)" },
] as const;

export const DRINK_SIZES = [
  { value: "16 oz", label: "16 oz" },
  { value: "22 oz", label: "22 oz (+$1.00)" },
] as const;

export type SugarLevel = (typeof SUGAR_LEVELS)[number]["value"];
export type IceLevel = (typeof ICE_LEVELS)[number]["value"];
export type PearlOption = (typeof PEARL_OPTIONS)[number]["value"];
export type DrinkSize = (typeof DRINK_SIZES)[number]["value"];

export interface DrinkOptions {
  sugarLevel: SugarLevel;
  iceLevel: IceLevel;
  pearls: PearlOption;
  size: DrinkSize;
}

export const DEFAULT_DRINK_OPTIONS: DrinkOptions = {
  sugarLevel: "100% Sugar",
  iceLevel: "Regular Ice",
  pearls: "No Pearls",
  size: "16 oz",
};

export const EXTRA_PEARLS_PRICE = 0.75;
export const LARGE_SIZE_PRICE_ADJUSTMENT = 1;

export function isSugarLevel(value: unknown): value is SugarLevel {
  return SUGAR_LEVELS.some((option) => option.value === value);
}

export function isIceLevel(value: unknown): value is IceLevel {
  return ICE_LEVELS.some((option) => option.value === value);
}

export function isPearlOption(value: unknown): value is PearlOption {
  return PEARL_OPTIONS.some((option) => option.value === value);
}

export function isDrinkSize(value: unknown): value is DrinkSize {
  return DRINK_SIZES.some((option) => option.value === value);
}

export function getPearlPriceAdjustment(pearls: PearlOption): number {
  return pearls === "Extra Pearls" ? EXTRA_PEARLS_PRICE : 0;
}

export function getSizePriceAdjustment(size: DrinkSize): number {
  return size === "22 oz" ? LARGE_SIZE_PRICE_ADJUSTMENT : 0;
}
