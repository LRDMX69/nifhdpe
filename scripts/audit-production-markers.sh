#!/usr/bin/env bash
set -euo pipefail

matches="$(grep -RInE 'TODO|FIXME|PLACEHOLDER|REPLACE_WITH|coming soon|not implemented|mock|dummy' src supabase --exclude='*.map' || true)"
filtered="$(printf '%s\n' "$matches" | grep -vE 'CheckInWidget\.tsx:.*samples|AppSettings\.tsx:.*samples|ai-assistant/index\.ts:.*NOT mocked' || true)"

if [[ -n "${filtered//[[:space:]]/}" ]]; then
  echo "Production marker audit failed. Review these matches:"
  printf '%s\n' "$filtered"
  exit 1
fi

echo "No prohibited production markers found outside the documented benign allowlist."
