import { writeFileSync } from "node:fs";
const config = {};
const api = process.env.TRADER_API_URL?.trim();
if (api) {
  const url = new URL(api);
  if (
    url.protocol !== "https:" &&
    !(
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.protocol === "http:"
    )
  )
    throw new Error(
      "TRADER_API_URL debe usar HTTPS, excepto en el servidor local.",
    );
  if (url.username || url.password || url.search || url.hash)
    throw new Error(
      "La dirección del servidor no puede incluir credenciales, parámetros ni fragmentos.",
    );
  config.marketApi = api.replace(/\/$/, "");
}
if (process.env.TRADER_FIREBASE_CONFIG?.trim()) {
  const value = JSON.parse(process.env.TRADER_FIREBASE_CONFIG);
  for (const key of ["apiKey", "authDomain", "projectId", "appId"])
    if (typeof value[key] !== "string" || !value[key])
      throw new Error(`Falta ${key} en la configuración pública de Firebase.`);
  config.firebase = Object.fromEntries(
    [
      "apiKey",
      "authDomain",
      "projectId",
      "appId",
      "storageBucket",
      "messagingSenderId",
    ]
      .filter((key) => typeof value[key] === "string")
      .map((key) => [key, value[key]]),
  );
}
writeFileSync(
  new URL("../public/app-config.json", import.meta.url),
  JSON.stringify(config, null, 2) + "\n",
);
