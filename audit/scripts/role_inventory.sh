#!/usr/bin/env bash
set -u
cd /home/ubuntu/nifhdpe
printf '%s\n' '---ROLE REFERENCES---'
grep -RInE 'administrator|finance|hr|engineering|technician|warehouse|procurement|reception|sales|managing_director|director|role' src/contexts src/pages src/components/layout src/components/dashboards 2>/dev/null | head -240 || true
printf '%s\n' '---AUTH FILES---'
find src -maxdepth 3 -type f \( -iname '*auth*' -o -iname '*role*' -o -iname '*permission*' \) -print
printf '%s\n' '---ROUTE FILES---'
find src/pages -maxdepth 1 -type f -name '*.tsx' -printf '%f\n' | sort
