# Responsive Mobile Live Evidence — 2026-08-16

## Playwright session

The authenticated Playwright session logged into `https://nifhdpe.vercel.app` with the supplied maintenance account and was resized to `390×844`.

## Dashboard at 390×844

The live Dashboard loaded successfully. The automated bounds check returned viewport `390`, document `scrollWidth` `390`, body `scrollWidth` `390`, and no offending elements extending beyond the viewport. This is a measured PASS for horizontal overflow on the Dashboard at the tested mobile width.

Additional route checks remain: Opportunities, HR, Finance, and Documents. Tablet width and real permission boundaries also remain to be tested or explicitly documented.

## Opportunities at 390×844 — defect found and fixed

The first live measurement found a real defect: the Opportunities grid itself was `358px` wide, but its first card and title were `702.217px` and `575.333px` wide because the grid track used the long title’s automatic minimum content size. The document scroll width was masked at `390px` by the shell’s hidden overflow, so a scroll-width-only check would have incorrectly passed.

The fix added `min-w-0` to the grid and card content, `max-w-full` and `overflow-hidden` to cards, and `min-w-0 flex-1` to the card title row. CI passed. The live retest on the latest deployment returned viewport `390`, document and body scroll widths `390`, grid width `358`, first card width `358`, first title width `231`, and `0` card offenders among the first 50 rendered cards. This is a measured PASS for the previous Opportunities mobile overflow defect.

## HR at 390×844

The HR route loaded without app-level horizontal overflow: document and body scroll widths both measured `390px`. The ten HR tabs form an intentional bounded horizontal scroll surface: the wrapper is `358px` wide from `x=16` to `x=374`, has `overflow-x:auto`, and its internal tab list is `915px` wide. The tab row is therefore swipeable inside the content width rather than widening the document. This is recorded as a responsive PASS with an intentional scrollable control strip, not a broken page overflow.

## Finance at 390×844

Finance loaded with document and body scroll widths both `390px`. The visible Payments and Bank Analysis tabs extend beyond the viewport inside an intentional tablist scroll surface: the tablist itself is bounded from `x=16` to `x=374` at `358px` wide, has `overflow-x:auto`, `clientWidth=358`, and `scrollWidth=565`. No page-level horizontal overflow was detected. This is a responsive PASS with a bounded, swipeable tab control.

## Document Registry at 390×844

Document Registry loaded with the live numbered-document dataset and remained within the app shell: document and body scroll widths both measured `390px`. The operational revision-history table is intentionally scrollable inside a bounded container (`567px` table inside a `324px` scroll wrapper), and the document-type tab strip is intentionally scrollable inside a `358px` wrapper with `scrollWidth=1859px`. The table and type tabs are therefore reachable by horizontal swipe without page-level overflow. The waybill registry data is present in the live route, including `WAYBILLS/2026/0002` and its Reprint action in the rendered document list from the authenticated desktop view. This is a responsive PASS for the Document Registry surface.

## Tablet matrix at 768×1024

An authenticated Playwright matrix measured Dashboard, Opportunities, HR, Finance, and Documents at `768×1024`. Dashboard and Opportunities had document/body scroll widths of `768px` and no offenders. HR had document/body scroll widths of `768px`; its `915px` tab list sits inside a `480px` `overflow-x:auto` wrapper. Finance had document/body scroll widths of `768px`; its tablist was bounded to `480px` with `scrollWidth=565` and `overflow-x:auto`. Documents had document/body scroll widths of `768px`; its type-tab strip was bounded to `480px` with `scrollWidth=1862` and `overflow-x:auto`. The tablet matrix therefore passes with intentional bounded tab scrolling and no app-level horizontal overflow.
