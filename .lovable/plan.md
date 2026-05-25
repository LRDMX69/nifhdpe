## Goal

Replace the hand-coded letterhead/footer drawing in `src/lib/generatePdf.ts` with the user's actual letterhead image (the green/blue triangles, NIF logo, contact strip, faint pipe watermark, and bottom corner) — used as a full-page background on every page of every generated PDF.

This guarantees pixel-perfect brand fidelity, since the existing `jsPDF` shape-drawing approximation can never match the real letterhead exactly.

## What changes

### 1. Add the letterhead asset
- Copy the uploaded image to `src/assets/letterhead-bg.png`.
- Import it as an ES6 module in `src/lib/generatePdf.ts` so Vite bundles and fingerprints it.
- Convert it to a base64 data URL once at module load (fetch the bundled URL → blob → dataURL), cached in a module-level promise so we only do it once per session.

### 2. Rewrite `drawLetterhead` and the per-page footer loop
- Replace the entire `drawLetterhead` function body with a single `doc.addImage(letterheadDataUrl, "PNG", 0, 0, pageW, pageH)` call that stretches the image to the full A4 page.
- Remove all the hand-drawn triangles, fake grid logo, contact rows, separator lines, watermark circles/lines, bottom green line, and bottom-right blue triangle from both `drawLetterhead` and the page-loop footer block — the image already contains all of them.
- Keep `drawContinuationHeader` removed/no-op; instead, draw the same full-page background image on every page (page 1 and continuation pages) in the final page loop so multi-page docs stay branded.

### 3. Adjust content safe area
- The image reserves roughly the top ~50mm for letterhead and the bottom ~20mm for the footer strip. Update the starting `y` returned for content (currently ~84mm) to sit just below the green underline (~58mm), and tighten the bottom page-break threshold in `checkPageBreak` so body text never overlaps the bottom green/blue corner band.
- Keep left/right margins at 20mm — the image's side decorations stay within that.

### 4. Keep everything else identical
- Title block, sender info card, content sections, bullets, tables (`autoTable`), signature lines, circular approval stamp, and document ID/date all stay exactly as they are — they just render on top of the new image background.
- `generateWaybill`, `generateIdCard`, and every other caller of `generatePdf` keep working without changes.

## Technical notes

- jsPDF `addImage` with a PNG data URL at full page size is the standard pattern for letterhead backgrounds. Drawing it first (before any text) means all existing content renders on top.
- Caching the base64 in a module-scoped `Promise<string>` avoids re-encoding the image for every PDF generated in a session.
- The image is ~A4 aspect ratio already, so stretching to 210×297mm will not distort it noticeably.
- File size impact: the PNG (~150-300KB) will be embedded once per PDF page. Acceptable for branded documents; if needed later we can downsample to JPEG at quality 0.85 to shrink output.

## Out of scope

- No changes to PDF content, sections, tables, stamps, or any caller.
- No changes to the in-app web UI letterhead (this is PDF-only).
