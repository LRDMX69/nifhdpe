import fs from "node:fs";

const source = JSON.parse(fs.readFileSync("/tmp/nigeria-lgas.json", "utf8"));
const grouped = {};
for (const row of source) {
  if (!grouped[row.state_name]) grouped[row.state_name] = [];
  grouped[row.state_name].push(row.name);
}
for (const names of Object.values(grouped)) names.sort((a, b) => a.localeCompare(b));
const output = `// Generated from the reviewed xosasx/nigerian-local-government-areas dataset.\n// Source: https://github.com/xosasx/nigerian-local-government-areas\n// The application uses this only for state/LGA consistency; it does not encode tax policy.\nexport const NIGERIAN_LGAS_BY_STATE = ${JSON.stringify(grouped, null, 2)} as const;\n\nexport const NIGERIAN_STATES = Object.keys(NIGERIAN_LGAS_BY_STATE);\n\nexport function lgasForState(state: string): readonly string[] {\n  return NIGERIAN_LGAS_BY_STATE[state as keyof typeof NIGERIAN_LGAS_BY_STATE] ?? [];\n}\n`;
fs.writeFileSync("src/lib/nigeriaLocations.ts", output);
const count = source.length;
console.log(JSON.stringify({ states: Object.keys(grouped).length, lgas: count }));
