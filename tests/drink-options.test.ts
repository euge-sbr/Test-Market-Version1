import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_DRINK_OPTIONS,
  EXTRA_PEARLS_PRICE,
  getPearlPriceAdjustment,
  getSizePriceAdjustment,
  isDrinkSize,
  isIceLevel,
  isPearlOption,
  isSugarLevel,
  LARGE_SIZE_PRICE_ADJUSTMENT,
} from "../customers/data/drink-options.ts";

describe("customers/data/drink-options", () => {
  it("validates sugar, ice, pearl, and size allowlists", () => {
    assert.equal(isSugarLevel("0% Sugar"), true);
    assert.equal(isSugarLevel("50% Sugar"), true);
    assert.equal(isSugarLevel("100% Sugar"), true);
    assert.equal(isSugarLevel("200% Sugar"), false);

    assert.equal(isIceLevel("Regular Ice"), true);
    assert.equal(isIceLevel("Less Ice"), true);
    assert.equal(isIceLevel("No Ice"), true);
    assert.equal(isIceLevel("Extra Ice"), false);

    assert.equal(isPearlOption("No Pearls"), true);
    assert.equal(isPearlOption("Less Pearls"), true);
    assert.equal(isPearlOption("Extra Pearls"), true);
    assert.equal(isPearlOption("Boba"), false);

    assert.equal(isDrinkSize("16 oz"), true);
    assert.equal(isDrinkSize("22 oz"), true);
    assert.equal(isDrinkSize("32 oz"), false);
  });

  it("calculates pearl and drink size price adjustments accurately", () => {
    assert.equal(getPearlPriceAdjustment("No Pearls"), 0);
    assert.equal(getPearlPriceAdjustment("Less Pearls"), 0);
    assert.equal(getPearlPriceAdjustment("Extra Pearls"), EXTRA_PEARLS_PRICE);

    assert.equal(getSizePriceAdjustment("16 oz"), 0);
    assert.equal(getSizePriceAdjustment("22 oz"), LARGE_SIZE_PRICE_ADJUSTMENT);
  });

  it("provides valid default drink options", () => {
    assert.equal(isSugarLevel(DEFAULT_DRINK_OPTIONS.sugarLevel), true);
    assert.equal(isIceLevel(DEFAULT_DRINK_OPTIONS.iceLevel), true);
    assert.equal(isPearlOption(DEFAULT_DRINK_OPTIONS.pearls), true);
    assert.equal(isDrinkSize(DEFAULT_DRINK_OPTIONS.size), true);
  });
});
