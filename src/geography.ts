import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import codes from "i18n-iso-countries/codes.json";
const countryCodes = new Map(codes.map((row) => [row[2], row[0]]));
const names = new Intl.DisplayNames(["es"], { type: "region" });
const aliases: Record<string, string> = {
  HK: "Hong Kong",
  US: "Estados Unidos",
  GB: "Reino Unido",
};
export const geography = (
  feature(world as never, (world as any).objects.countries) as any
).features
  .filter((country: any) => country.properties.name !== "Antarctica")
  .map((country: any) => {
    const code = countryCodes.get(String(country.id).padStart(3, "0"));
    return {
      ...country,
      country:
        (code && (aliases[code] || names.of(code))) || country.properties.name,
    };
  });
export const WORLD_COUNTRIES: string[] = [
  ...new Set<string>(geography.map((c: any) => c.country)),
].sort((a, b) => a.localeCompare(b, "es"));
