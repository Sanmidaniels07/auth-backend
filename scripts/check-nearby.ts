// Checks the "Shop near you" location data and matching (no database):
//   npx tsx scripts/check-nearby.ts
// Fails if a city lists an area its state doesn't have, or if a common
// place resolves wrongly.
import { CITIES, NIGERIA_LOCATIONS } from "../src/data/nigeria-locations";
import { cityAreas, findArea, placeLabel, resolvePlace } from "../src/utils/serviceAreas";

let failures = 0;
const fail = (message: string) => {
  failures += 1;
  console.error("FAIL", message);
};

// 1. Every city area is a known area of its state.
for (const [state, cities] of Object.entries(CITIES)) {
  if (!NIGERIA_LOCATIONS.some((s) => s.name === state)) fail(`unknown state "${state}" in CITIES`);
  for (const city of cities) {
    for (const area of city.areas) {
      if (!findArea(state, area)) fail(`${city.name}, ${state}: "${area}" is not a known area`);
    }
    if (cityAreas(state, city.name).size === 0) fail(`${city.name}, ${state} has no areas`);
  }
}

// 2. Typical buyer input resolves to the right place.
const cases: [Parameters<typeof resolvePlace>[0], string | null][] = [
  [{ state: "Lagos", area: "Festac" }, "Festac, Lagos"],
  [{ state: "Lagos State", city: "festac" }, "Festac, Lagos"],
  [{ area: "Festac" }, "Festac, Lagos"],
  [{ state: "Lagos" }, "Lagos State"],
  [{ city: "Lagos" }, "Lagos State"],
  [{ city: "Abuja" }, "Abuja (FCT)"],
  [{ state: "FCT", area: "Wuse" }, "Wuse, Abuja"],
  [{ state: "Rivers", city: "PH" }, "Port Harcourt, Rivers"],
  [{ city: "Port Harcourt" }, "Port Harcourt, Rivers"],
  [{ state: "Rivers", area: "Rumuola" }, "Rumuola, Port Harcourt, Rivers"],
  [{ state: "Oyo", city: "Ibadan", area: "Bodija" }, "Bodija, Ibadan, Oyo"],
  [{ city: "Bodija" }, "Bodija, Ibadan, Oyo"],
  [{ state: "Oyo State", city: "Ibadan" }, "Ibadan, Oyo"],
  [{ state: "Edo", city: "Benin" }, "Benin City, Edo"],
  [{ state: "Lagos", city: "Ikeja" }, "Ikeja, Lagos"],
  [{ state: "Lagos", city: "Somewhere Unknown" }, "Lagos State"],
  [{ city: "Atlantis" }, null],
  [{ state: "Narnia" }, null],
];
for (const [input, expected] of cases) {
  const place = resolvePlace(input);
  const got = place ? placeLabel(place) : null;
  if (got !== expected) fail(`${JSON.stringify(input)} -> ${got} (expected ${expected})`);
}

const cityCount = Object.values(CITIES).reduce((sum, cities) => sum + cities.length, 0);
console.log(failures === 0 ? `OK - ${cityCount} cities, ${cases.length} place checks` : `${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
