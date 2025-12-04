// js/products-data.js
// Single source of truth for all product metadata + images.
// This version assumes your site is served at https://nihilgt.github.io/edelhart/
// and your images live in /edelhart/img/...
// If your repo name is different, replace "/edelhart" with "/YOUR_REPO_NAME".

const BASE = "/edelhart";

window.EDELHART_PRODUCTS = [
    // 1. sss-gold — 11 images
    {
        slug: "sss-gold",
        view: `${BASE}/products/sss-pendant-gold.html`,
        title: "SSS pendant — gold",
        price: 125,
        images: Array.from({ length: 11 }, (_, i) =>
            `${BASE}/img/products/sss-gold/sss-gold-${i + 1}.jpeg`
        ),
    },

    // 2. sss-silver — 11 images
    {
        slug: "sss-silver",
        view: `${BASE}/products/sss-pendant-silver.html`,
        title: "SSS pendant — silver",
        price: 125,
        images: Array.from({ length: 11 }, (_, i) =>
            `${BASE}/img/products/sss-silver/sss-silver-${i + 1}.jpeg`
        ),
    },

    // 3. squid — 4 images
    {
        slug: "squid",
        view: `${BASE}/products/squid.html`,
        title: "Squid",
        price: 0,
        images: Array.from({ length: 4 }, (_, i) =>
            `${BASE}/img/products/squid/squid-${i + 1}.jpeg`
        ),
    },

    // 4. LEGS-pendant — 7 images
    {
        slug: "LEGS-pendant",
        view: `${BASE}/products/legs-pendant.html`,
        title: "LEGS pendant",
        price: 375,
        images: Array.from({ length: 7 }, (_, i) =>
            `${BASE}/img/products/LEGS-pendant/LEGS-pendant-${i + 1}.jpeg`
        ),
    },

    // 5. EE-male-ring-BR-trap — 5 images
    {
        slug: "EE-male-ring-BR-trap",
        view: `${BASE}/products/ee-male-ring-black-rhodium-stone.html`,
        title: "EE male ring — black rhodium (Stone trapping)",
        price: 190,
        images: Array.from({ length: 5 }, (_, i) =>
            `${BASE}/img/products/EE-male-ring-BR-trap/EE-male-ring-BR-trap-${i + 1}.jpeg`
        ),
    },

    // 6. EE-female-ring-gold — 5 images
    {
        slug: "EE-female-ring-gold",
        view: `${BASE}/products/ee-female-ring-gold.html`,
        title: "EE female ring — gold",
        price: 140,
        images: Array.from({ length: 5 }, (_, i) =>
            `${BASE}/img/products/EE-female-ring-gold/EE-female-ring-gold-${i + 1}.jpeg`
        ),
    },

    // 7. EE-female-ring-silver — 5 images
    {
        slug: "EE-female-ring-silver",
        view: `${BASE}/products/ee-female-ring-silver.html`,
        title: "EE female ring — silver",
        price: 140,
        images: Array.from({ length: 5 }, (_, i) =>
            `${BASE}/img/products/EE-female-ring-silver/EE-female-ring-silver-${i + 1}.jpeg`
        ),
    },

    // 8. EE-female-ring-BR — 4 images
    {
        slug: "EE-female-ring-BR",
        view: `${BASE}/products/ee-female-ring-black-rhodium.html`,
        title: "EE female ring — black rhodium",
        price: 140,
        images: Array.from({ length: 4 }, (_, i) =>
            `${BASE}/img/products/EE-female-ring-BR/EE-female-ring-BR-${i + 1}.jpeg`
        ),
    },

    // 9. EE-male-ring-silver — 4 images
    {
        slug: "EE-male-ring-silver",
        view: `${BASE}/products/ee-male-ring-silver.html`,
        title: "EE male ring — silver",
        price: 200,
        images: Array.from({ length: 4 }, (_, i) =>
            `${BASE}/img/products/EE-male-ring-silver/EE-male-ring-silver-${i + 1}.jpeg`
        ),
    },

    // 10. EE-male-ring-BR — 5 images
    {
        slug: "EE-male-ring-BR",
        view: `${BASE}/products/ee-male-ring-black-rhodium.html`,
        title: "EE male ring — black rhodium",
        price: 200,
        images: Array.from({ length: 5 }, (_, i) =>
            `${BASE}/img/products/EE-male-ring-BR/EE-male-ring-BR-${i + 1}.jpeg`
        ),
    },

    // 11. EE-male-ring-BR-trap — 5 images (duplicate entry)
    {
        slug: "EE-male-ring-BR-trap",
        view: `${BASE}/products/ee-male-ring-black-rhodium-stone.html`,
        title: "EE male ring — black rhodium (Stone trapping)",
        price: 190,
        images: Array.from({ length: 5 }, (_, i) =>
            `${BASE}/img/products/EE-male-ring-BR-trap/EE-male-ring-BR-trap-${i + 1}.jpeg`
        ),
    },

    // 12. 11 — 0 images
    {
        slug: "11",
        view: `${BASE}/products/11.html`,
        title: "Coming soon",
        price: 0,
        images: [],
    },

    // 13. EE-female-earring-br — 2 images
    {
        slug: "EE-female-earring-br",
        view: `${BASE}/products/ee-female-earring-br.html`,
        title: "EE female earring — black rhodium",
        price: 0,
        images: Array.from({ length: 2 }, (_, i) =>
            `${BASE}/img/products/EE-female-earring-br/EE-female-earring-br-${i + 1}.jpeg`
        ),
    },

    // 14. Earring-shell — 2 images
    {
        slug: "Earring-shell",
        view: `${BASE}/products/earring-shell.html`,
        title: "Shell earring",
        price: 0,
        images: Array.from({ length: 2 }, (_, i) =>
            `${BASE}/img/products/Earring-shell/Earring-shell-${i + 1}.jpeg`
        ),
    },

    // 15. earring-blue-gem — 5 images
    {
        slug: "earring-blue-gem",
        view: `${BASE}/products/earring-blue-gem.html`,
        title: "Blue gemstone earring",
        price: 0,
        images: Array.from({ length: 5 }, (_, i) =>
            `${BASE}/img/products/earring-blue-gem/earring-blue-gem-${i + 1}.jpeg`
        ),
    },

    // 16. ring-blue-gem — 4 images
    {
        slug: "ring-blue-gem",
        view: `${BASE}/products/ring-blue-gem.html`,
        title: "Blue gemstone ring",
        price: 0,
        images: Array.from({ length: 4 }, (_, i) =>
            `${BASE}/img/products/ring-blue-gem/ring-blue-gem-${i + 1}.jpeg`
        ),
    },

    // 17. necklace-blue-gem — 7 images
    {
        slug: "necklace-blue-gem",
        view: `${BASE}/products/necklace-blue-gem.html`,
        title: "Blue gemstone necklace",
        price: 0,
        images: Array.from({ length: 7 }, (_, i) =>
            `${BASE}/img/products/necklace-blue-gem/necklace-blue-gem-${i + 1}.jpeg`
        ),
    },

    // 18. stingray-gold — 4 images
    {
        slug: "stingray-gold",
        view: `${BASE}/products/stingray-gold.html`,
        title: "Stingray — gold",
        price: 0,
        images: Array.from({ length: 4 }, (_, i) =>
            `${BASE}/img/products/stingray-gold/stingray-gold-${i + 1}.jpeg`
        ),
    },

    // 19. ring-gold-multi-gems — 4 images
    {
        slug: "ring-gold-multi-gems",
        view: `${BASE}/products/ring-gold-multi-gems.html`,
        title: "Gold ring — multicolor gemstones",
        price: 0,
        images: Array.from({ length: 4 }, (_, i) =>
            `${BASE}/img/products/ring-gold-multi-gems/ring-gold-multi-gems-${i + 1}.jpeg`
        ),
    },

    // 20. ring-chameleon — 2 images
    {
        slug: "ring-chameleon",
        view: `${BASE}/products/ring-chameleon.html`,
        title: "Chameleon ring",
        price: 0,
        images: Array.from({ length: 2 }, (_, i) =>
            `${BASE}/img/products/ring-chameleon/ring-chameleon-${i + 1}.jpeg`
        ),
    },

    // 21. necklace-ants — 6 images
    {
        slug: "necklace-ants",
        view: `${BASE}/products/necklace-ants.html`,
        title: "Ants necklace",
        price: 0,
        images: Array.from({ length: 6 }, (_, i) =>
            `${BASE}/img/products/necklace-ants/necklace-ants-${i + 1}.jpeg`
        ),
    },
];