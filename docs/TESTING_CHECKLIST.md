# CinderellaFit Testing Checklist

This checklist should be followed whenever major changes are made to the core features (Closet, Gallery, Filters) to ensure no regressions occur.

## 1. Gallery Filters Verification
- [ ] **Search by Keyword**: Enter a keyword and verify that only items matching the description or title appear.
- [ ] **Filter by Category**: Click "Online", "Retail", or "Handmade" and verify the list updates to only show items of that purchase type.
- [ ] **Filter by Plushie Size**: 
  - Click a specific plushie button (e.g. "Unaka Size").
  - **Crucial**: Verify that the displayed results *actually change* and that the `resultsCount` indicator shows the correct number of items.
  - Verify that items lacking size data are correctly filtered out.
- [ ] **Filter by Pattern**: Toggle the "Has Pattern" filter and verify only items with patterns or URLs appear.
- [ ] **Clear Filters**: Click the "Reset Filters" button when empty, or manually revert all options to "All", and verify the full list returns.

## 2. Closet Edit & Save Verification
- [ ] **Edit Existing Item**: Open an item in the closet, click edit, change a field (e.g., description), and click "Save".
- [ ] **Verify Sticky Button**: Ensure the "Save" button is visible at the bottom of the screen even on mobile devices.
- [ ] **Gallery Sync**: Edit a closet item directly from the Gallery modal, save it, and verify the changes immediately reflect in the Gallery without reloading.

## 3. Data Integrity & Firestore
- [ ] **Measurement Mapping**: When fetching `closetItems` from Firestore via `collectionGroup`, ensure fields like `plushieHeight`, `waistFlat`, `clothesLength`, and `cuffWidth` are explicitly mapped and parsed as numbers.
- [ ] **Ghost State Avoidance**: Check that no unused UI state variables (like old toggles) are blocking core logic in `useEffect` or `useMemo` hooks.
