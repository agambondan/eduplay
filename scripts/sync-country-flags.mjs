#!/usr/bin/env node

import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const apiURL =
  "https://restcountries.com/v3.1/all?fields=name,cca2,capital,region,subregion,independent,unMember,translations";
const flagSourceDir = path.join(
  repoRoot,
  "apps/web/node_modules/country-flag-icons/3x2",
);
const detailedFlagSourceDir = path.join(
  repoRoot,
  "apps/web/node_modules/flag-icons/flags/4x3",
);
const flagPackagePath = path.join(repoRoot, "apps/web/node_modules/country-flag-icons/package.json");
const flagTargetDir = path.join(repoRoot, "apps/web/public/flags");
const generatedSeederPath = path.join(
  repoRoot,
  "services/api/internal/seeder/countries_generated.go",
);

const includedNonUNCodes = new Set(["GW", "PS", "VA"]);
const excludedCodes = new Set(["XK"]);
const detailedFlagOverrides = new Set(["FJ"]);

const regionOverrides = {
  CY: "asia",
};

function toGameRegion(country) {
  if (regionOverrides[country.cca2]) {
    return regionOverrides[country.cca2];
  }
  switch (country.region) {
    case "Africa":
      return "africa";
    case "Americas":
      return "americas";
    case "Asia":
      return "asia";
    case "Europe":
      return "europe";
    case "Oceania":
      return "oceania";
    default:
      return "world";
  }
}

function countryEmoji(cca2) {
  return cca2
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function goString(value) {
  return JSON.stringify(value ?? "");
}

function withIntrinsicSize(svg, width, height) {
  return svg.replace(
    /<svg\b([^>]*)>/,
    (_match, attrs) => {
      const cleanedAttrs = attrs
        .replace(/\swidth="[^"]*"/, "")
        .replace(/\sheight="[^"]*"/, "");
      return `<svg width="${width}" height="${height}"${cleanedAttrs}>`;
    },
  );
}

function countryName(country) {
  return country.translations?.ind?.common || country.name?.common || country.cca2;
}

async function main() {
  if (!existsSync(flagSourceDir)) {
    throw new Error(
      `country-flag-icons assets not found at ${flagSourceDir}. Run npm install in apps/web first.`,
    );
  }
  if (!existsSync(detailedFlagSourceDir)) {
    throw new Error(
      `flag-icons detail assets not found at ${detailedFlagSourceDir}. Run npm install in apps/web first.`,
    );
  }

  const response = await fetch(apiURL);
  if (!response.ok) {
    throw new Error(`REST Countries request failed: ${response.status} ${response.statusText}`);
  }

  const countries = (await response.json())
    .filter(
      (country) =>
        country.cca2 &&
        !excludedCodes.has(country.cca2) &&
        (country.unMember || includedNonUNCodes.has(country.cca2)),
    )
    .map((country) => ({
      name: countryName(country),
      capital: country.capital?.[0] || "",
      flagCode: country.cca2.toUpperCase(),
      flagEmoji: countryEmoji(country.cca2),
      region: toGameRegion(country),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));

  await mkdir(flagTargetDir, { recursive: true });
  for (const entry of await readdir(flagTargetDir)) {
    if (entry.endsWith(".svg")) {
      await unlink(path.join(flagTargetDir, entry));
    }
  }

  const missingFlags = [];
  for (const country of countries) {
    const code = country.flagCode.toLowerCase();
    const source = detailedFlagOverrides.has(country.flagCode)
      ? path.join(detailedFlagSourceDir, `${code}.svg`)
      : path.join(flagSourceDir, `${code.toUpperCase()}.svg`);
    if (!existsSync(source)) {
      missingFlags.push(code);
      continue;
    }
    const svg = await readFile(source, "utf8");
    const normalized = detailedFlagOverrides.has(country.flagCode)
      ? withIntrinsicSize(svg, 640, 480)
      : withIntrinsicSize(svg, 513, 342);
    await writeFile(path.join(flagTargetDir, `${code}.svg`), normalized, "utf8");
  }

  if (missingFlags.length > 0) {
    throw new Error(`Missing flag SVGs for: ${missingFlags.join(", ")}`);
  }

  const flagPackage = JSON.parse(await readFile(flagPackagePath, "utf8"));
  await writeFile(
    path.join(flagTargetDir, "LICENSE.country-flag-icons.txt"),
    [
      `${flagPackage.name} ${flagPackage.version}`,
      `License: ${flagPackage.license}`,
      `Repository: ${flagPackage.repository?.url || ""}`,
      "Detail overrides: flag-icons 4x3 MIT assets for selected emblem-heavy flags.",
      "",
      "Generated flag assets for EduPlay Phase 7.",
      "Regenerate with: node scripts/sync-country-flags.mjs",
      "",
    ].join("\n"),
    "utf8",
  );

  const lines = [
    "package seeder",
    "",
    'import "github.com/agambondan/eduplay/services/api/internal/model"',
    "",
    "// generatedCountries returns the Phase 7 flag quiz country dataset.",
    "// Source metadata: REST Countries v3.1 all endpoint.",
    "// Source SVG flags: country-flag-icons 3x2 assets with selected flag-icons detail overrides.",
    "// Regenerate with: node scripts/sync-country-flags.mjs",
    "func generatedCountries() []model.Country {",
    "\treturn []model.Country{",
    ...countries.map(
      (country) =>
        `\t\t{Name: ${goString(country.name)}, Capital: ${goString(country.capital)}, FlagEmoji: ${goString(country.flagEmoji)}, FlagCode: ${goString(country.flagCode)}, Region: ${goString(country.region)}},`,
    ),
    "\t}",
    "}",
    "",
  ];
  await writeFile(generatedSeederPath, lines.join("\n"), "utf8");

  const byRegion = countries.reduce((acc, country) => {
    acc[country.region] = (acc[country.region] || 0) + 1;
    return acc;
  }, {});

  console.log(
    JSON.stringify(
      {
        countries: countries.length,
        flagsCopied: countries.length,
        regions: byRegion,
        generatedSeederPath: path.relative(repoRoot, generatedSeederPath),
        flagTargetDir: path.relative(repoRoot, flagTargetDir),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
