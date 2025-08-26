import express from "express";
import StremioAddonSDK from "stremio-addon-sdk";
import fetch from "node-fetch";

const addonBuilder = StremioAddonSDK.default || StremioAddonSDK;

// ===== CACHE EM MEMÓRIA =====
let cache = {};
function salvarCache() {} // noop para Vercel, sem arquivo físico

// ===== FUNÇÃO DE TRADUÇÃO =====
async function traduzir(texto) {
  if (!texto) return "";
  if (cache[texto]) return cache[texto];

  try {
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texto, source: "en", target: "pt", format: "text" })
    });
    const data = await res.json();
    cache[texto] = data.translatedText;
    return data.translatedText;
  } catch (err) {
    console.error("Erro na tradução:", err);
    return texto;
  }
}

// ===== MANIFESTO =====
const manifest = {
  id: "org.gleydson.stremio-pt-universal",
  version: "2.0.0",
  name: "Stremio PT Universal",
  description: "Traduz automaticamente todos os textos de addons Stremio (títulos, sinopses, gêneros)",
  resources: ["meta","catalog"],
  types: ["movie","series","episode"],
  idPrefixes: [""],
  catalogs: []
};

// ===== CRIA ADDON =====
const addon = addonBuilder(manifest);

// ===== META HANDLER =====
addon.defineMetaHandler(async ({ id, type }) => {
  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=f1fb8189`);
    const data = await res.json();

    return {
      id: data.imdbID || id,
      type: data.Type || type || "movie",
      name: await traduzir(data.Title || id),
      description: await traduzir(data.Plot || ""),
      releaseInfo: data.Year || "",
      genres: data.Genre ? await traduzir(data.Genre) : "",
      poster: data.Poster || ""
    };
  } catch {
    return { id, type: type || "movie", name: id, description: "" };
  }
});

// ===== CATALOG HANDLER =====
addon.defineCatalogHandler(async ({ type, id }) => {
  const exemplos = [
    { id: "tt0111161", type: "movie", title: "The Shawshank Redemption", plot: "Two imprisoned men bond over a number of years.", poster: "https://m.media-amazon.com/images/M/MV5BMDFkYTc0MGEtZmRhMC00ZDJlLWFmNTEtODM1ZmRlZjYxZjVkXkEyXkFqcGdeQXVyNDYyMDk5MTU@._V1_SX300.jpg" },
    { id: "tt0068646", type: "movie", title: "The Godfather", plot: "The aging patriarch of an organized crime dynasty transfers control to his reluctant son.", poster: "https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmYtYTAwZi00ZjQ5LWI2NzMtY2NhZWM0Y2ExZWRlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg" }
  ];

  const metas = [];
  for (const item of exemplos) {
    metas.push({
      id: item.id,
      type: item.type,
      name: await traduzir(item.title),
      description: await traduzir(item.plot),
      poster: item.poster
    });
  }
  return { metas };
});

// ===== SERVIDOR EXPRESS =====
const app = express();
app.get("/manifest.json", (req,res) => res.json(manifest));
app.use("/", async (req,res) => {
  const addonInterface = await addon.interface(req.query);
  res.json(addonInterface);
});

// ===== RODA SERVIDOR =====
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => console.log(`Addon Stremio PT Universal rodando em http://localhost:${PORT}/manifest.json`));
