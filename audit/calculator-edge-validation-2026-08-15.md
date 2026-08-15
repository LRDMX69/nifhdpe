# Pipe Calculator edge validation — 15 August 2026

## Live reproduction

Production `/calculator` was tested with HDPE, 110 mm, length `0.01` m, and flow `0.1` L/s. The calculation accepted the valid positive decimal inputs and returned finite values: velocity `0.02 m/s`, head loss `0.00 m`, and total weight `0 kg`.

## Finding and fix

The underlying weight was `0.0314 kg`, so displaying `0 kg` was technically rounded but not clear for a valid small quantity. The result now displays two decimal places for sub-kilogram weights (`0.03 kg`) while retaining whole kilograms for normal industrial quantities. Zero and invalid inputs remain rejected by the existing validation.

## Independent normal-case verification

For HDPE 110 mm, 100 m, 5 L/s, the live result was `0.79 m/s`, `0.68 m`, and `314 kg`. The saved independent calculation produced `0.785950`, `0.675110`, and `314.00`, matching the displayed rounded values.

## Local gates

| Check | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — existing 26-test suite |
| `pnpm build` | PASS — Vite production build completed in 5.82s |

Production retest of the merged display correction is pending.
