import express from "express";
import StremioAddonSDK from "stremio-addon-sdk";
import fetch from "node-fetch";

const addonBuilder = StremioAddonSDK.default || StremioAddonSDK;

// ===== CACHE EM MEMÓRIA =====
let cache = {};
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

// ===== MANIFESTO DO ADDON =====
const manifest = {
    id: "org.gleyd.stremio-pt-universal",
    version: "2.0.0",
    name: "Stremio PT Universal",
    description: "Traduz automaticamente títulos, sinopses e gêneros de qualquer addon Stremio.",
    resources: ["meta", "catalog"],
    types: ["movie", "series", "episode"],
    idPrefixes: [""],
    catalogs: []
};

// ===== CRIAR ADDON =====
const addon = addonBuilder(manifest);

// ===== HANDLER DE META =====
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

// ===== HANDLER DE CATALOG =====
addon.defineCatalogHandler(async ({ type }) => {
    // Exemplos de conteúdo para teste
    const exemplos = [
        {
            id: "tt0111161",
            type: "movie",
            title: "The Shawshank Redemption",
            plot: "Two imprisoned men bond over a number of years.",
            poster: "https://m.media-amazon.com/images/M/MV5BMDFkYTc0MGEtZmRhMC00ZDJlLWFmNTEtODM1ZmRlZjYxZjVkXkEyXkFqcGdeQXVyNDYyMDk5MTU@._V1_SX300.jpg"
        },
        {
            id: "tt0068646",
            type: "movie",
            title: "The Godfather",
            plot: "The aging patriarch of an organized crime dynasty transfers control to his reluctant son.",
            poster: "https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmYtYTAwZi00ZjQ5LWI2NzMtY2NhZWM0Y2ExZWRlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg"
        }
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

// ===== EXPRESS SERVER =====
const app = express();

// Servir o manifest.json corretamente
app.get("/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(manifest));
});

// Interface do addon
app.use(async (req, res) => {
    const iface = await addon.interface(req.query);
    res.json(iface);
});

// ===== RODAR SERVIDOR =====
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Addon Stremio PT Universal rodando em http://localhost:${PORT}/manifest.json`);
});
