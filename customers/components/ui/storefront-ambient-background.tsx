"use client";

import { StorefrontDoodleBackground } from "@/customers/components/ui/storefront-doodle-background";

const PEARL_COUNT = 10;

/**
 * Full-viewport, decorative storefront backdrop: a warm milk-tea gradient with slowly
 * drifting flavor glows (brown sugar, taro, matcha, strawberry), gently bobbing doodles,
 * and a few boba pearls rising in the background. Pure CSS animations, disabled for
 * users who prefer reduced motion (see app/globals.css).
 */
export function StorefrontAmbientBackground() {
  return (
    <div aria-hidden="true" className="storefront-ambient pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="storefront-ambient-blob storefront-ambient-blob--caramel" />
      <div className="storefront-ambient-blob storefront-ambient-blob--taro" />
      <div className="storefront-ambient-blob storefront-ambient-blob--matcha" />
      <div className="storefront-ambient-blob storefront-ambient-blob--strawberry" />

      <div className="absolute inset-0 opacity-70">
        <StorefrontDoodleBackground animated count={96} />
      </div>

      <div className="storefront-ambient-pearls">
        {Array.from({ length: PEARL_COUNT }, (_, index) => (
          <span key={index} />
        ))}
      </div>

      <div className="storefront-ambient-vignette" />
    </div>
  );
}

export default StorefrontAmbientBackground;
