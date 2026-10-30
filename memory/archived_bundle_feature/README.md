# Archived Bundle Feature Backup

This directory contains the original bundle discount implementation and pre-curated festive bundle logic for Sridattam E-Commerce, archived on **October 30, 2026**.

## Why was this archived?
The business decided to transition the **Clubbing Module** from rigid fixed-quantity bundles (e.g., "Any 3 for ₹999", "Buy 4 Get 20% Off", pre-curated boxed bundles) into a **Custom Clubbing Promotional Showcase**:
- Admin selects specific individual items from the inventory.
- Admin assigns custom clubbing prices / discounts per item.
- Products show up with their exact clubbing prices on the Products Catalog and on the Clubbing Page with horizontal scroll showcase.
- Separate Desktop and Mobile banner images uploaded directly by the admin.

## Archived Components & Files
1. `festive-bundles.backup.js`: Pre-curated boxed bundles with complimentary brass gifts and MRP calculations.
2. `bundle-discount-calc.backup.js`: Cart bundle discount calculation algorithms (`calculateClubbingDiscount` for `fixed_price_bundle` and `percentage_off_bundle`).
3. `clubbing-form-view.bundle-version.jsx`: The original admin campaign creation form with fixed price / percentage bundle rules.
4. `clubbing-page.bundle-version.jsx`: The original customer clubbing page showcasing pre-curated festive boxes.
5. `products-page.bundle-version.jsx`: The original products page featuring the festive bundle modal and bundle filter.

## How to Restore Bundle Feature (If Needed Later)
1. Restore `lib/festive-bundles.js` from `festive-bundles.backup.js`.
2. Re-import `calculateClubbingDiscount` in `lib/api/clubbings.js`.
3. Re-enable the bundle discount rules card in `components/clubbings/clubbing-form-view.jsx`.
