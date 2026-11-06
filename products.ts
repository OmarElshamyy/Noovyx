import type { Product, ProductCategory } from "./types";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "IEMs",
  "Wireless",
  "Cables",
  "Ear tips",
  "Cases",
  "DACs",
];

export const products: Product[] = [
  {
    "id": "kz-castor-bass",
    "slug": "kz-castor-bass",
    "name": "KZ Castor Bass Edition",
    "category": "IEMs",
    "price": 780,
    "image": "CB",
    "imageUrl": "/products/kz-castor-bass.png",
    "imageUrls": [
      "/products/kz-castor-bass.png",
      "/products/kz-castor-bass-2.png",
      "/products/kz-castor-bass-3.png"
    ],
    "description": "Dual dynamic driver monitor tuned for fast, textured sub-bass with 4-stage electronic switches.",
    "specs": [
      "Dual dynamic drivers",
      "4 tuning switches",
      "Bass acoustic profile",
      "0.75mm 2-pin"
    ],
    "inStock": true,
    "stockQuantity": 18,
    "lowStockThreshold": 4,
    "isActive": true,
    "featured": false
  },
  {
    "id": "kz-zsn-pro-x",
    "slug": "kz-zsn-pro-x",
    "name": "KZ ZSN Pro X",
    "category": "IEMs",
    "price": 890,
    "image": "ZX",
    "imageUrl": "/products/kz-zsn-pro-x.png",
    "imageUrls": [
      "/products/kz-zsn-pro-x.png",
      "/products/kz-zsn-pro-x-2.png"
    ],
    "description": "Acoustic hybrid dual-driver IEM with crisp high-frequency detail and zinc alloy faceplates.",
    "specs": [
      "1DD + 1BA hybrid",
      "Zinc alloy faceplate",
      "Detachable 0.75mm cable",
      "24 ohm impedance"
    ],
    "inStock": true,
    "stockQuantity": 24,
    "lowStockThreshold": 5,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-zs10-pro-2",
    "slug": "kz-zs10-pro-2",
    "name": "KZ ZS10 Pro 2",
    "category": "IEMs",
    "price": 1890,
    "image": "Z2",
    "imageUrl": "/products/kz-zs10-pro-2.png",
    "imageUrls": [
      "/products/kz-zs10-pro-2.png",
      "/products/kz-zs10-pro-2-2.png",
      "/products/kz-zs10-pro-2-3.png"
    ],
    "description": "Flagship 5-driver acoustic hybrid featuring refined 3-way crossover and holographic staging.",
    "specs": [
      "1DD + 4BA hybrid architecture",
      "3-way electronic crossover",
      "Stainless faceplate",
      "Detachable cable"
    ],
    "inStock": true,
    "stockQuantity": 14,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-krila",
    "slug": "kz-krila",
    "name": "KZ Krila",
    "category": "IEMs",
    "price": 950,
    "image": "KR",
    "imageUrl": "/products/kz-krila.png",
    "imageUrls": [
      "/products/kz-krila.png",
      "/products/kz-krila-2.png",
      "/products/kz-krila-3.png"
    ],
    "description": "Second-generation hybrid monitor engineered with balanced armature and precision DIP switch tuning.",
    "specs": [
      "2nd-gen magnetic DD + BA",
      "Custom acoustic dampers",
      "DIP tuning switches",
      "Ergonomic resin fit"
    ],
    "inStock": true,
    "stockQuantity": 16,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-pr3-planar",
    "slug": "kz-pr3-planar",
    "name": "KZ PR3 Planar",
    "category": "IEMs",
    "price": 2450,
    "image": "PR",
    "imageUrl": "/products/kz-pr3-planar.png",
    "imageUrls": [
      "/products/kz-pr3-planar.png",
      "/products/kz-pr3-planar-2.png",
      "/products/kz-pr3-planar-3.png"
    ],
    "description": "Full-range 13.2mm planar magnetic monitor delivering ultra-fast transients and high treble extension.",
    "specs": [
      "13.2mm planar magnetic driver",
      "Nano-scale silver diaphragm",
      "Open acoustic cavity",
      "3.5mm silver cable"
    ],
    "inStock": true,
    "stockQuantity": 8,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-edx-pro-x",
    "slug": "kz-edx-pro-x",
    "name": "KZ EDX Pro X",
    "category": "IEMs",
    "price": 520,
    "image": "ED",
    "imageUrl": "/products/kz-edx-pro-x.png",
    "imageUrls": [
      "/products/kz-edx-pro-x.png",
      "/products/kz-edx-pro-x-2.png",
      "/products/kz-edx-pro-x-3.png"
    ],
    "description": "High-energy 10mm dynamic driver monitor with linear magnetic circuit and punchy low-end response.",
    "specs": [
      "10mm dual-magnetic DD",
      "High-gloss optical resin",
      "0.75mm gold-plated pins",
      "Oxygen-free copper cable"
    ],
    "inStock": true,
    "stockQuantity": 30,
    "lowStockThreshold": 6,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-symphony",
    "slug": "kz-symphony",
    "name": "KZ Symphony",
    "category": "IEMs",
    "price": 3250,
    "image": "SY",
    "imageUrl": "/products/kz-symphony.png",
    "imageUrls": [
      "/products/kz-symphony.png",
      "/products/kz-symphony-2.png",
      "/products/kz-symphony-3.png"
    ],
    "description": "Hybrid monitor pairing a 13.2mm planar driver with a dedicated 6mm dynamic driver for visceral punch.",
    "specs": [
      "13.2mm planar + 6mm dynamic",
      "Dual-soundway acoustics",
      "Cast metal housing",
      "Detachable 2-pin"
    ],
    "inStock": true,
    "stockQuantity": 6,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-edcx",
    "slug": "kz-edcx",
    "name": "KZ EDCX",
    "category": "IEMs",
    "price": 420,
    "image": "EC",
    "imageUrl": "/products/kz-edcx.png",
    "imageUrls": [
      "/products/kz-edcx.png",
      "/products/kz-edcx-2.png",
      "/products/kz-edcx-3.png"
    ],
    "description": "Ultra-compact entry audiophile IEM engineered for balanced everyday playback and natural vocal timbre.",
    "specs": [
      "10mm micro-dynamic unit",
      "Embedded metal chamber",
      "OFC flat anti-tangle cable",
      "In-line HD mic"
    ],
    "inStock": true,
    "stockQuantity": 22,
    "lowStockThreshold": 5,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-gale",
    "slug": "kz-gale",
    "name": "KZ Gale",
    "category": "IEMs",
    "price": 690,
    "image": "GL",
    "imageUrl": "/products/kz-gale.png",
    "imageUrls": [
      "/products/kz-gale.png",
      "/products/kz-gale-2.png",
      "/products/kz-gale-3.png"
    ],
    "description": "Acoustic dynamic earphone tuned with dual internal damping for smooth, non-fatiguing gaming sessions.",
    "specs": [
      "Dual-cavity dynamic driver",
      "Zinc-alloy sound nozzle",
      "Low-impedance drive",
      "Lightweight build"
    ],
    "inStock": true,
    "stockQuantity": 12,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-as16-pro-x",
    "slug": "kz-as16-pro-x",
    "name": "KZ AS16 Pro X",
    "category": "IEMs",
    "price": 2950,
    "image": "AX",
    "imageUrl": "/products/kz-as16-pro-x.png",
    "imageUrls": [
      "/products/kz-as16-pro-x.png",
      "/products/kz-as16-pro-x-2.png",
      "/products/kz-as16-pro-x-3.png"
    ],
    "description": "Analytical 8 Balanced Armature flagship per channel delivering reference clarity and instrument separation.",
    "specs": [
      "16 balanced armatures total",
      "3-channel acoustic conduits",
      "Electronic crossover board",
      "Silver-plated cord"
    ],
    "inStock": true,
    "stockQuantity": 5,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-az09-wireless",
    "slug": "kz-az09-wireless",
    "name": "KZ AZ09 Wireless Earhooks",
    "category": "Wireless",
    "price": 890,
    "image": "AZ",
    "imageUrl": "/products/kz-az09-wireless.png",
    "imageUrls": [
      "/products/kz-az09-wireless.png",
      "/products/kz-az09-wireless-2.png",
      "/products/kz-az09-wireless-3.png"
    ],
    "description": "Bluetooth 5.2 earhook adapter turning 2-pin IEMs into high-performance true wireless earphones.",
    "specs": [
      "Bluetooth 5.2 chipset",
      "TWS+ dual transmission",
      "Magnetic charging case",
      "0.75mm 2-pin interface"
    ],
    "inStock": true,
    "stockQuantity": 20,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-carol-pro",
    "slug": "kz-carol-pro",
    "name": "KZ Carol Pro ANC TWS",
    "category": "Wireless",
    "price": 1450,
    "image": "CP",
    "imageUrl": "/products/kz-carol-pro.png",
    "imageUrls": [
      "/products/kz-carol-pro.png",
      "/products/kz-carol-pro-2.png",
      "/products/kz-carol-pro-3.png"
    ],
    "description": "Hybrid active noise cancellation wireless earbuds with 6-microphone array and dual-mode gaming audio.",
    "specs": [
      "-48dB hybrid active ANC",
      "6-mic ENC call filtering",
      "55ms low latency mode",
      "38h combined battery"
    ],
    "inStock": true,
    "stockQuantity": 15,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-carol",
    "slug": "kz-carol",
    "name": "KZ Carol True Wireless",
    "category": "Wireless",
    "price": 1190,
    "image": "CL",
    "imageUrl": "/products/kz-carol.png",
    "imageUrls": [
      "/products/kz-carol.png",
      "/products/kz-carol-2.png",
      "/products/kz-carol-3.png"
    ],
    "description": "Everyday wireless earbuds with broad-band noise cancellation and responsive touch gesture controls.",
    "specs": [
      "Broad-frequency ANC",
      "Bluetooth 5.3",
      "IPX4 splash protection",
      "Compact travel charging case"
    ],
    "inStock": true,
    "stockQuantity": 17,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-an01",
    "slug": "kz-an01",
    "name": "KZ AN01 Bluetooth Earhooks",
    "category": "Wireless",
    "price": 1850,
    "image": "AN",
    "imageUrl": "/products/kz-an01.png",
    "imageUrls": [
      "/products/kz-an01.png",
      "/products/kz-an01-2.png"
    ],
    "description": "Audiophile Bluetooth 5.4 earhooks supporting lossless LDAC decoding and independent power amplification.",
    "specs": [
      "Lossless LDAC support",
      "Bluetooth 5.4 processor",
      "Independent amp circuit",
      "Type-C quick charging"
    ],
    "inStock": true,
    "stockQuantity": 9,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-xz10",
    "slug": "kz-xz10",
    "name": "KZ XZ10 Wireless Earhooks",
    "category": "Wireless",
    "price": 1650,
    "image": "XZ",
    "imageUrl": "/products/kz-xz10.png",
    "imageUrls": [
      "/products/kz-xz10.png",
      "/products/kz-xz10-2.png",
      "/products/kz-xz10-3.png"
    ],
    "description": "High-definition wireless IEM converter with hardware DSP enhancement and ergonomic memory ear-guides.",
    "specs": [
      "Integrated DSP tuning",
      "AptX adaptive streaming",
      "Ultra-light 4.5g earhooks",
      "Fast magnetic dock"
    ],
    "inStock": true,
    "stockQuantity": 11,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-sora",
    "slug": "kz-sora",
    "name": "KZ Sora Gaming TWS",
    "category": "Wireless",
    "price": 980,
    "image": "SO",
    "imageUrl": "/products/kz-sora.png",
    "imageUrls": [
      "/products/kz-sora.png",
      "/products/kz-sora-2.png",
      "/products/kz-sora-3.png"
    ],
    "description": "Esports-oriented low latency true wireless earbuds with high-definition positional sound staging.",
    "specs": [
      "45ms gaming sync mode",
      "Custom 10mm dynamic driver",
      "Cyberpunk LED accents",
      "ENC vocal pickup"
    ],
    "inStock": true,
    "stockQuantity": 14,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "trn-bt20-pro",
    "slug": "trn-bt20-pro",
    "name": "TRN BT20 Pro Earhook System",
    "category": "Wireless",
    "price": 1250,
    "image": "TR",
    "imageUrl": "/products/trn-bt20-pro.png",
    "imageUrls": [
      "/products/trn-bt20-pro.png",
      "/products/trn-bt20-pro-2.png",
      "/products/trn-bt20-pro-3.png"
    ],
    "description": "Modular Bluetooth 5.3 earhook system featuring swappable pin connectors and 50 hours of case backup.",
    "specs": [
      "Bluetooth 5.3",
      "Interchangeable pin connectors",
      "50h total playback",
      "High-current amplifier chip"
    ],
    "inStock": true,
    "stockQuantity": 12,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "moondrop-space-travel-2-ultra",
    "slug": "moondrop-space-travel-2-ultra",
    "name": "Moondrop Space Travel 2 Ultra",
    "category": "Wireless",
    "price": 1390,
    "image": "ST",
    "imageUrl": "/products/moondrop-space-travel-2-ultra.png",
    "imageUrls": [
      "/products/moondrop-space-travel-2-ultra.png",
      "/products/moondrop-space-travel-2-ultra-2.png",
      "/products/moondrop-space-travel-2-ultra-3.png"
    ],
    "description": "Ultra-wideband active noise cancelling gaming TWS with 13mm titanium diaphragm and custom app EQ.",
    "specs": [
      "55dB wideband ANC",
      "13mm titanium diaphragm",
      "55ms gaming latency",
      "Clear open charging dock"
    ],
    "inStock": true,
    "stockQuantity": 18,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "moondrop-ultrasonic",
    "slug": "moondrop-ultrasonic",
    "name": "Moondrop Ultrasonic ANC TWS",
    "category": "Wireless",
    "price": 2750,
    "image": "US",
    "imageUrl": "/products/moondrop-ultrasonic.png",
    "imageUrls": [
      "/products/moondrop-ultrasonic.png",
      "/products/moondrop-ultrasonic-2.png",
      "/products/moondrop-ultrasonic-3.png"
    ],
    "description": "Flagship LDAC wireless in-ear monitor combining balanced armature and dynamic driver acoustic system.",
    "specs": [
      "LDAC Hi-Res certified",
      "Hybrid BA + DD system",
      "Custom tuned sound curve",
      "Active transparency mode"
    ],
    "inStock": true,
    "stockQuantity": 7,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "tanchjim-revo",
    "slug": "tanchjim-revo",
    "name": "Tanchjim REVO Spatial TWS",
    "category": "Wireless",
    "price": 2850,
    "image": "RV",
    "imageUrl": "/products/tanchjim-revo.png",
    "imageUrls": [
      "/products/tanchjim-revo.png",
      "/products/tanchjim-revo-2.png",
      "/products/tanchjim-revo-3.png"
    ],
    "description": "Reference wireless monitor equipped with spatial audio algorithms and diamond-like composite diaphragm.",
    "specs": [
      "Spatial audio tracking",
      "DLC composite diaphragm",
      "IP54 dust & splash proof",
      "Wireless fast charging"
    ],
    "inStock": true,
    "stockQuantity": 8,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-t8-silver-cable",
    "slug": "kz-t8-silver-cable",
    "name": "KZ T8 8-Core Silver Cable",
    "category": "Cables",
    "price": 390,
    "image": "T8",
    "imageUrl": "/products/kz-t8-silver-cable.png",
    "imageUrls": [
      "/products/kz-t8-silver-cable.png",
      "/products/kz-t8-silver-cable-2.png"
    ],
    "description": "High-purity 8-core silver-plated copper upgrade cable for standard 0.75mm 2-pin IEMs.",
    "specs": [
      "8-core silver-plated OFC",
      "0.75mm 2-pin connectors",
      "Gold-plated 3.5mm plug",
      "Supple braid jacket"
    ],
    "inStock": true,
    "stockQuantity": 28,
    "lowStockThreshold": 6,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kiwi-ears-s-link",
    "slug": "kiwi-ears-s-link",
    "name": "Kiwi Ears S-Link Type-C Cable",
    "category": "Cables",
    "price": 750,
    "image": "SL",
    "imageUrl": "/products/kiwi-ears-s-link.png",
    "imageUrls": [
      "/products/kiwi-ears-s-link.png",
      "/products/kiwi-ears-s-link-2.png",
      "/products/kiwi-ears-s-link-3.png"
    ],
    "description": "Audiophile Type-C IEM cable with integrated 32-bit DAC chip and inline high-clarity microphone.",
    "specs": [
      "Built-in Type-C DAC chip",
      "0.78mm 2-pin fit",
      "Inline MEMS microphone",
      "Tangle-resistant weave"
    ],
    "inStock": true,
    "stockQuantity": 19,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "thieaudio-elitenoir-v2",
    "slug": "thieaudio-elitenoir-v2",
    "name": "THIEAUDIO Elitenoir V2 Cable",
    "category": "Cables",
    "price": 1450,
    "image": "EN",
    "imageUrl": "/products/thieaudio-elitenoir-v2.png",
    "imageUrls": [
      "/products/thieaudio-elitenoir-v2.png",
      "/products/thieaudio-elitenoir-v2-2.png",
      "/products/thieaudio-elitenoir-v2-3.png"
    ],
    "description": "Premium monocrystalline copper Litz cable with interchangeable 3.5mm single-ended and 4.4mm balanced plugs.",
    "specs": [
      "Monocrystalline copper Litz",
      "Modular 3.5mm / 4.4mm plugs",
      "Reinforced metal splitters",
      "Zero microphonics"
    ],
    "inStock": true,
    "stockQuantity": 10,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "ddhifi-bc35gold",
    "slug": "ddhifi-bc35gold",
    "name": "DDHIFI BC35Gold Upgrade Cable",
    "category": "Cables",
    "price": 690,
    "image": "B3",
    "imageUrl": "/products/ddhifi-bc35gold.png",
    "imageUrls": [
      "/products/ddhifi-bc35gold.png",
      "/products/ddhifi-bc35gold-2.png",
      "/products/ddhifi-bc35gold-3.png"
    ],
    "description": "Audiophile interconnect cable built with gold-plated OFC wire and high-transparency medical-grade PVC.",
    "specs": [
      "Gold-plated OFC conductors",
      "3.5mm stereo termination",
      "Medical PVC exterior",
      "Precision CNC barrels"
    ],
    "inStock": true,
    "stockQuantity": 14,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "ddhifi-bc44gold",
    "slug": "ddhifi-bc44gold",
    "name": "DDHIFI BC44Gold Balanced Cable",
    "category": "Cables",
    "price": 790,
    "image": "B4",
    "imageUrl": "/products/ddhifi-bc44gold.png",
    "imageUrls": [
      "/products/ddhifi-bc44gold.png",
      "/products/ddhifi-bc44gold-2.png",
      "/products/ddhifi-bc44gold-3.png"
    ],
    "description": "Dedicated 4.4mm Pentaconn balanced interconnect engineered for low-crosstalk audiophile audio transfer.",
    "specs": [
      "4.4mm balanced Pentaconn",
      "Multi-layer gold plating",
      "Shielded geometry",
      "Durable strain relief"
    ],
    "inStock": true,
    "stockQuantity": 13,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "ddhifi-tc19bc-gold",
    "slug": "ddhifi-tc19bc-gold",
    "name": "DDHIFI TC19BC Gold DAC Cable",
    "category": "Cables",
    "price": 890,
    "image": "TC",
    "imageUrl": "/products/ddhifi-tc19bc-gold.png",
    "imageUrls": [
      "/products/ddhifi-tc19bc-gold.png",
      "/products/ddhifi-tc19bc-gold-2.png",
      "/products/ddhifi-tc19bc-gold-3.png"
    ],
    "description": "Type-C to 2-pin audio cable containing an integrated hardware decoding chipset for lossless direct phone playback.",
    "specs": [
      "Hardware USB-C decoding",
      "0.78mm 2-pin terminals",
      "Gold-plated OFC braid",
      "Ultra-low power drain"
    ],
    "inStock": true,
    "stockQuantity": 11,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "yanyin-ink-abyss",
    "slug": "yanyin-ink-abyss",
    "name": "Yanyin INK Abyss Upgrade Cable",
    "category": "Cables",
    "price": 1200,
    "image": "YA",
    "imageUrl": "/products/yanyin-ink-abyss.png",
    "imageUrls": [
      "/products/yanyin-ink-abyss.png",
      "/products/yanyin-ink-abyss-2.png",
      "/products/yanyin-ink-abyss-3.png"
    ],
    "description": "Handcrafted hybrid audio cable blending monocrystalline copper and silver strands for transparent sound.",
    "specs": [
      "Copper & silver hybrid",
      "Custom alloy Y-splitter",
      "Soft supple braiding",
      "0.78mm 2-pin fit"
    ],
    "inStock": true,
    "stockQuantity": 8,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kiwi-ears-terras",
    "slug": "kiwi-ears-terras",
    "name": "Kiwi Ears Terras Monitor Cable",
    "category": "Cables",
    "price": 950,
    "image": "KT",
    "imageUrl": "/products/kiwi-ears-terras.png",
    "imageUrls": [
      "/products/kiwi-ears-terras.png"
    ],
    "description": "Stage-tested replacement IEM cable designed for high electrical conductivity and long-term durability.",
    "specs": [
      "High-conductivity core",
      "Stage-grade reinforcement",
      "Ergonomic pre-formed ear loops",
      "3.5mm gold plug"
    ],
    "inStock": true,
    "stockQuantity": 15,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "ddhifi-eryx-occ",
    "slug": "ddhifi-eryx-occ",
    "name": "DDHIFI Eryx High-Purity OCC Cable",
    "category": "Cables",
    "price": 820,
    "image": "ER",
    "imageUrl": "/products/ddhifi-eryx-occ.png",
    "imageUrls": [
      "/products/ddhifi-eryx-occ.png"
    ],
    "description": "High-purity OCC copper earphone cable crafted with precision CNC connectors and flexible transparent jacket.",
    "specs": [
      "OCC high-purity copper",
      "Precision CNC metal parts",
      "Soft anti-kink sheath",
      "3.5mm single-ended"
    ],
    "inStock": true,
    "stockQuantity": 12,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "thieaudio-midnix",
    "slug": "thieaudio-midnix",
    "name": "THIEAUDIO Midnix Audiophile Cable",
    "category": "Cables",
    "price": 1350,
    "image": "MX",
    "imageUrl": "/products/thieaudio-midnix.png",
    "imageUrls": [
      "/products/thieaudio-midnix.png",
      "/products/thieaudio-midnix-2.png",
      "/products/thieaudio-midnix-3.png"
    ],
    "description": "Ultra-low resistance silver-copper hybrid cable with ergonomic molded pre-curved earhooks.",
    "specs": [
      "Silver-copper hybrid strands",
      "Universal 0.78mm 2-pin",
      "Low skin-effect resistance",
      "3.5mm stereo jack"
    ],
    "inStock": true,
    "stockQuantity": 9,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-ls01-tips",
    "slug": "kz-ls01-tips",
    "name": "KZ LS01 Acoustic Ear Tips Set",
    "category": "Ear tips",
    "price": 160,
    "image": "L1",
    "imageUrl": "/products/kz-ls01-tips.png",
    "imageUrls": [
      "/products/kz-ls01-tips.png"
    ],
    "description": "Comprehensive acoustic replacement pack featuring soft silicone and rebound memory foam in S/M/L.",
    "specs": [
      "S/M/L silicone pairs",
      "Rebound memory foam pair",
      "Wide sound bore",
      "Universal nozzle fit"
    ],
    "inStock": true,
    "stockQuantity": 35,
    "lowStockThreshold": 8,
    "isActive": false,
    "featured": false
  },
  {
    "id": "spinfit-neo",
    "slug": "spinfit-neo",
    "name": "SpinFit Neo Medical Silicone Tips",
    "category": "Ear tips",
    "price": 380,
    "image": "SN",
    "imageUrl": "/products/spinfit-neo.png",
    "imageUrls": [
      "/products/spinfit-neo.png",
      "/products/spinfit-neo-2.png",
      "/products/spinfit-neo-3.png"
    ],
    "description": "Medical-grade silicone tips equipped with SpinFit patented 3D cushion core for deep comfort and seal.",
    "specs": [
      "Patented 3D swivel core",
      "Medical-grade silicone",
      "Enhanced bass response",
      "Non-allergenic material"
    ],
    "inStock": true,
    "stockQuantity": 26,
    "lowStockThreshold": 5,
    "isActive": false,
    "featured": false
  },
  {
    "id": "tangzu-sancai-noble",
    "slug": "tangzu-sancai-noble",
    "name": "Tangzu Tang Sancai Noble Tips",
    "category": "Ear tips",
    "price": 420,
    "image": "TS",
    "imageUrl": "/products/tangzu-sancai-noble.png",
    "imageUrls": [
      "/products/tangzu-sancai-noble.png",
      "/products/tangzu-sancai-noble-2.png",
      "/products/tangzu-sancai-noble-3.png"
    ],
    "description": "Matte textured medical silicone tips designed with micro-texture surface for acoustic pressure relief.",
    "specs": [
      "Micro-textured finish",
      "Ear canal pressure relief",
      "Medical-grade purity",
      "S/M/L package"
    ],
    "inStock": true,
    "stockQuantity": 22,
    "lowStockThreshold": 5,
    "isActive": false,
    "featured": false
  },
  {
    "id": "moondrop-atf-tips",
    "slug": "moondrop-atf-tips",
    "name": "Moondrop ATF Acoustic Tuning Tips",
    "category": "Ear tips",
    "price": 340,
    "image": "AT",
    "imageUrl": "/products/moondrop-atf-tips.png",
    "imageUrls": [
      "/products/moondrop-atf-tips.png"
    ],
    "description": "Precision acoustic tuning tips engineered to reduce high-frequency resonance and stabilize ear seal.",
    "specs": [
      "Resonance reduction bore",
      "High-resiliency silicone",
      "Tapered outer flange",
      "Triple size pack"
    ],
    "inStock": true,
    "stockQuantity": 20,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kiwi-ears-flow-tips",
    "slug": "kiwi-ears-flow-tips",
    "name": "Kiwi Ears Flow Ergonomic Tips",
    "category": "Ear tips",
    "price": 280,
    "image": "KF",
    "imageUrl": "/products/kiwi-ears-flow-tips.png",
    "imageUrls": [
      "/products/kiwi-ears-flow-tips.png"
    ],
    "description": "Ergonomically contoured silicone ear tips promoting natural bass extension and fatigue-free listening.",
    "specs": [
      "Contoured dome profile",
      "Acoustic wave nozzle",
      "Soft-touch silicone",
      "3 pairs included"
    ],
    "inStock": true,
    "stockQuantity": 25,
    "lowStockThreshold": 5,
    "isActive": false,
    "featured": false
  },
  {
    "id": "azla-sednaearfit-max",
    "slug": "azla-sednaearfit-max",
    "name": "AZLA SednaEarfit MAX Tips",
    "category": "Ear tips",
    "price": 490,
    "image": "AM",
    "imageUrl": "/products/azla-sednaearfit-max.png",
    "imageUrls": [
      "/products/azla-sednaearfit-max.png",
      "/products/azla-sednaearfit-max-2.png",
      "/products/azla-sednaearfit-max-3.png"
    ],
    "description": "Premium medical silicone tips featuring built-in micro-hexagon wax filters and tapered ultra-soft edges.",
    "specs": [
      "100% medical grade silicone",
      "Integrated wax filter",
      "Tapered dome geometry",
      "Zero skin irritation"
    ],
    "inStock": true,
    "stockQuantity": 18,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "azla-sednaearfit-foamax",
    "slug": "azla-sednaearfit-foamax",
    "name": "AZLA SednaEarfit Foamax Memory Foam",
    "category": "Ear tips",
    "price": 450,
    "image": "AF",
    "imageUrl": "/products/azla-sednaearfit-foamax.png",
    "imageUrls": [
      "/products/azla-sednaearfit-foamax.png",
      "/products/azla-sednaearfit-foamax-2.png",
      "/products/azla-sednaearfit-foamax-3.png"
    ],
    "description": "High-density memory foam tips with an ultra-thin protective silicone skin for maximum passive noise blocking.",
    "specs": [
      "Protective silicone coating",
      "High-density memory foam",
      "Slow rebound recovery",
      "Maximum noise seal"
    ],
    "inStock": true,
    "stockQuantity": 15,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "azla-crystal-2",
    "slug": "azla-crystal-2",
    "name": "AZLA SednaEarfit Crystal 2 Tips",
    "category": "Ear tips",
    "price": 480,
    "image": "C2",
    "imageUrl": "/products/azla-crystal-2.png",
    "imageUrls": [
      "/products/azla-crystal-2.png",
      "/products/azla-crystal-2-2.png",
      "/products/azla-crystal-2-3.png"
    ],
    "description": "German liquid silicone rubber tips offering exceptional grip, transparent staging, and non-slip fit.",
    "specs": [
      "German premium LSR material",
      "High surface grip",
      "Acoustic stage expansion",
      "Long lifespan durability"
    ],
    "inStock": true,
    "stockQuantity": 16,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "azla-origin-tips",
    "slug": "azla-origin-tips",
    "name": "AZLA SednaEarfit ORIGIN Deep Fit",
    "category": "Ear tips",
    "price": 460,
    "image": "AO",
    "imageUrl": "/products/azla-origin-tips.png",
    "imageUrls": [
      "/products/azla-origin-tips.png",
      "/products/azla-origin-tips-2.png",
      "/products/azla-origin-tips-3.png"
    ],
    "description": "Extended core length silicone tips designed for deep ear canal insertion and uncolored sound reproduction.",
    "specs": [
      "Extended stem height",
      "Straight acoustic channel",
      "Linear sound delivery",
      "Reinforced inner core"
    ],
    "inStock": true,
    "stockQuantity": 14,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "pentaconn-coreir-al",
    "slug": "pentaconn-coreir-al",
    "name": "Pentaconn COREIR Aluminum Core Tips",
    "category": "Ear tips",
    "price": 520,
    "image": "PC",
    "imageUrl": "/products/pentaconn-coreir-al.png",
    "imageUrls": [
      "/products/pentaconn-coreir-al.png",
      "/products/pentaconn-coreir-al-2.png",
      "/products/pentaconn-coreir-al-3.png"
    ],
    "description": "Audiophile ear tips incorporating an internal CNC aluminum alloy metal core for precise treble focus.",
    "specs": [
      "CNC aluminum inner core",
      "Medical silicone exterior",
      "High transient speed",
      "Japanese engineering"
    ],
    "inStock": true,
    "stockQuantity": 10,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "linsoul-classic-case",
    "slug": "linsoul-classic-case",
    "name": "Linsoul Classic Compact IEM Case",
    "category": "Cases",
    "price": 190,
    "image": "LC",
    "imageUrl": "/products/linsoul-classic-case.png",
    "imageUrls": [
      "/products/linsoul-classic-case.png"
    ],
    "description": "Rigid shock-resistant EVA zipper case with interior mesh storage compartment for IEMs and adapters.",
    "specs": [
      "Shock-absorbent EVA shell",
      "Interior mesh net",
      "Smooth metal zipper",
      "Compact pocket profile"
    ],
    "inStock": true,
    "stockQuantity": 30,
    "lowStockThreshold": 6,
    "isActive": false,
    "featured": false
  },
  {
    "id": "linsoul-lc02-case",
    "slug": "linsoul-lc02-case",
    "name": "KZ Premium IEM Case",
    "category": "Cases",
    "price": 380,
    "image": "LC",
    "imageUrl": "/products/linsoul-lc02-case.png",
    "imageUrls": [
      "/products/linsoul-lc02-case.png",
      "/products/linsoul-lc02-case-2.png",
      "/products/linsoul-lc02-case-3.png"
    ],
    "description": "Handcrafted PU leather carrying case with magnetic flap latch and scratch-free microfiber velvet lining.",
    "specs": [
      "Handcrafted PU leather",
      "Magnetic flap closure",
      "Microfiber velvet lining",
      "Dual compartment slots"
    ],
    "inStock": true,
    "stockQuantity": 18,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "thieaudio-vault-case",
    "slug": "thieaudio-vault-case",
    "name": "THIEAUDIO Vault Storage Case",
    "category": "Cases",
    "price": 490,
    "image": "TV",
    "imageUrl": "/products/thieaudio-vault-case.png",
    "imageUrls": [
      "/products/thieaudio-vault-case.png"
    ],
    "description": "Heavy-duty weather-resistant hard shell case built for flagship stage in-ear monitors and cables.",
    "specs": [
      "Reinforced hardshell polymer",
      "High-density foam inserts",
      "Water-resistant seal",
      "Large storage volume"
    ],
    "inStock": true,
    "stockQuantity": 12,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "trn-mag-metal-case",
    "slug": "trn-mag-metal-case",
    "name": "TRN MAG Magnetic Metal Case",
    "category": "Cases",
    "price": 420,
    "image": "TM",
    "imageUrl": "/products/trn-mag-metal-case.png",
    "imageUrls": [
      "/products/trn-mag-metal-case.png"
    ],
    "description": "CNC machined aerospace aluminum round case with strong magnetic closure and protective silicone base.",
    "specs": [
      "Aerospace aluminum alloy",
      "Magnetic twist closure",
      "Silicone drop protection",
      "Anodized matte finish"
    ],
    "inStock": true,
    "stockQuantity": 15,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "tangzu-vintage-case",
    "slug": "tangzu-vintage-case",
    "name": "Tangzu Vintage Leather Case",
    "category": "Cases",
    "price": 450,
    "image": "TG",
    "imageUrl": "/products/tangzu-vintage-case.png",
    "imageUrls": [
      "/products/tangzu-vintage-case.png"
    ],
    "description": "Vintage distressed leather case featuring embossed oriental logo and cushioned internal divider.",
    "specs": [
      "Distressed leather texture",
      "Soft plush interior",
      "Embossed insignia",
      "Protective center divider"
    ],
    "inStock": true,
    "stockQuantity": 11,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "ziigaat-pellepod",
    "slug": "ziigaat-pellepod",
    "name": "ZiiGaat Pellepod Zipper Case",
    "category": "Cases",
    "price": 320,
    "image": "ZP",
    "imageUrl": "/products/ziigaat-pellepod.png",
    "imageUrls": [
      "/products/ziigaat-pellepod.png",
      "/products/ziigaat-pellepod-2.png",
      "/products/ziigaat-pellepod-3.png"
    ],
    "description": "Compact circular travel pod with textured carbon-weave exterior and elastic retention strap.",
    "specs": [
      "Textured weave exterior",
      "Elastic retention strap",
      "Water-resistant zipper",
      "Travel carabiner clip"
    ],
    "inStock": true,
    "stockQuantity": 20,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kiwi-ears-sonicap",
    "slug": "kiwi-ears-sonicap",
    "name": "Kiwi Ears Sonicap Travel Case",
    "category": "Cases",
    "price": 290,
    "image": "SC",
    "imageUrl": "/products/kiwi-ears-sonicap.png",
    "imageUrls": [
      "/products/kiwi-ears-sonicap.png",
      "/products/kiwi-ears-sonicap-2.png",
      "/products/kiwi-ears-sonicap-3.png"
    ],
    "description": "Molded semi-rigid earphone case designed to protect cables from bending and shells from scuffs.",
    "specs": [
      "Custom molded geometry",
      "Durable ballistic nylon",
      "Compact pocket friendly",
      "Internal cable pouch"
    ],
    "inStock": true,
    "stockQuantity": 22,
    "lowStockThreshold": 5,
    "isActive": false,
    "featured": false
  },
  {
    "id": "ddhifi-cz120",
    "slug": "ddhifi-cz120",
    "name": "DDHIFI CZ120 Canvas Field Bag",
    "category": "Cases",
    "price": 540,
    "image": "CZ",
    "imageUrl": "/products/ddhifi-cz120.png",
    "imageUrls": [
      "/products/ddhifi-cz120.png",
      "/products/ddhifi-cz120-2.png",
      "/products/ddhifi-cz120-3.png"
    ],
    "description": "High-density water-resistant canvas field case with segmented organizer slots for cables and dongles.",
    "specs": [
      "High-density canvas",
      "Water-resistant coating",
      "Segmented cable slots",
      "Dual zipper opening"
    ],
    "inStock": true,
    "stockQuantity": 9,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "ddhifi-cz120b",
    "slug": "ddhifi-cz120b",
    "name": "DDHIFI CZ120B Multi-IEM Case",
    "category": "Cases",
    "price": 580,
    "image": "CB",
    "imageUrl": "/products/ddhifi-cz120b.png",
    "imageUrls": [
      "/products/ddhifi-cz120b.png",
      "/products/ddhifi-cz120b-2.png",
      "/products/ddhifi-cz120b-3.png"
    ],
    "description": "Double-decker audio gear organizer with customizable velcro padded dividers for multiple earphone sets.",
    "specs": [
      "Double-layer storage",
      "Adjustable velcro dividers",
      "Protective padded walls",
      "Rugged metal hardware"
    ],
    "inStock": true,
    "stockQuantity": 8,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "twistura-lingxi-case",
    "slug": "twistura-lingxi-case",
    "name": "Twistura Lingxi Leather Case",
    "category": "Cases",
    "price": 360,
    "image": "LX",
    "imageUrl": "/products/twistura-lingxi-case.png",
    "imageUrls": [
      "/products/twistura-lingxi-case.png"
    ],
    "description": "Minimalist magnetic case crafted with refined fine-grain faux leather and soft microfiber bedding.",
    "specs": [
      "Fine-grain faux leather",
      "Magnetic snap lid",
      "Soft interior bedding",
      "Slim travel form factor"
    ],
    "inStock": true,
    "stockQuantity": 14,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kz-am02-dac",
    "slug": "kz-am02-dac",
    "name": "KZ AM02 Type-C DAC Amp",
    "category": "DACs",
    "price": 950,
    "image": "AM",
    "imageUrl": "/products/kz-am02-dac.png",
    "imageUrls": [
      "/products/kz-am02-dac.png",
      "/products/kz-am02-dac-2.png",
      "/products/kz-am02-dac-3.png"
    ],
    "description": "High-performance Type-C DAC equipped with Cirrus Logic CS43131 chip supporting 32-bit/384kHz PCM.",
    "specs": [
      "CS43131 DAC chip",
      "32-bit / 384kHz decoding",
      "DSD256 hardware support",
      "Type-C to 3.5mm jack"
    ],
    "inStock": true,
    "stockQuantity": 18,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kiwi-ears-allegro-bal",
    "slug": "kiwi-ears-allegro-bal",
    "name": "Kiwi Ears Allegro BAL Dual DAC",
    "category": "DACs",
    "price": 2650,
    "image": "AB",
    "imageUrl": "/products/kiwi-ears-allegro-bal.png",
    "imageUrls": [
      "/products/kiwi-ears-allegro-bal.png",
      "/products/kiwi-ears-allegro-bal-2.png",
      "/products/kiwi-ears-allegro-bal-3.png"
    ],
    "description": "Balanced portable DAC/Amp with dual ES9038Q2M architecture and 3.5mm SE / 4.4mm balanced dual jacks.",
    "specs": [
      "Dual ES9038Q2M DACs",
      "3.5mm & 4.4mm outputs",
      "Hardware volume buttons",
      "Retro controller styling"
    ],
    "inStock": true,
    "stockQuantity": 10,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "kiwi-ears-coda",
    "slug": "kiwi-ears-coda",
    "name": "Kiwi Ears Coda 32-bit HiFi Dongle",
    "category": "DACs",
    "price": 780,
    "image": "KC",
    "imageUrl": "/products/kiwi-ears-coda.png",
    "imageUrls": [
      "/products/kiwi-ears-coda.png",
      "/products/kiwi-ears-coda-2.png",
      "/products/kiwi-ears-coda-3.png"
    ],
    "description": "Ultra-lightweight Type-C audio dongle providing clean signal conversion and high signal-to-noise ratio.",
    "specs": [
      "32-bit / 384kHz decoding",
      "Integrated low-noise LDO",
      "Plug-and-play compatibility",
      "Aluminum casing"
    ],
    "inStock": true,
    "stockQuantity": 25,
    "lowStockThreshold": 5,
    "isActive": false,
    "featured": false
  },
  {
    "id": "jcally-jm20max",
    "slug": "jcally-jm20max",
    "name": "JCALLY JM20MAX Portable DAC",
    "category": "DACs",
    "price": 890,
    "image": "JM",
    "imageUrl": "/products/jcally-jm20max.png",
    "imageUrls": [
      "/products/jcally-jm20max.png",
      "/products/jcally-jm20max-2.png",
      "/products/jcally-jm20max-3.png"
    ],
    "description": "Audiophile CS43131 DAC dongle paired with high-purity silver-plated cable for clear mobile listening.",
    "specs": [
      "CS43131 flagship DAC",
      "120dB dynamic range",
      "Braided silver OFC cable",
      "PCM 384kHz / DSD256"
    ],
    "inStock": true,
    "stockQuantity": 20,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "tanchjim-space-2",
    "slug": "tanchjim-space-2",
    "name": "Tanchjim SPACE II Balanced DAC",
    "category": "DACs",
    "price": 2850,
    "image": "SP",
    "imageUrl": "/products/tanchjim-space-2.png",
    "imageUrls": [
      "/products/tanchjim-space-2.png",
      "/products/tanchjim-space-2-2.png",
      "/products/tanchjim-space-2-3.png"
    ],
    "description": "Reference dual-DAC portable amplifier featuring dual CS43131 chips and aircraft CNC aluminum enclosure.",
    "specs": [
      "Dual CS43131 DACs",
      "4.4mm balanced output",
      "Non-linear volume steps",
      "CNC aircraft aluminum"
    ],
    "inStock": true,
    "stockQuantity": 7,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "smsl-r3",
    "slug": "smsl-r3",
    "name": "SMSL R3 High-Res Headphone DAC",
    "category": "DACs",
    "price": 2950,
    "image": "R3",
    "imageUrl": "/products/smsl-r3.png",
    "imageUrls": [
      "/products/smsl-r3.png",
      "/products/smsl-r3-2.png",
      "/products/smsl-r3-3.png"
    ],
    "description": "High-power portable USB headphone amplifier delivering crystal clear resolution and MQA full decoding.",
    "specs": [
      "High-power headphone amp",
      "MQA hardware decoding",
      "Low-jitter master clock",
      "USB Audio Class 2.0"
    ],
    "inStock": true,
    "stockQuantity": 6,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "celest-cd-3",
    "slug": "celest-cd-3",
    "name": "Celest CD-3 HiFi Gaming Dongle",
    "category": "DACs",
    "price": 650,
    "image": "C3",
    "imageUrl": "/products/celest-cd-3.png",
    "imageUrls": [
      "/products/celest-cd-3.png",
      "/products/celest-cd-3-2.png",
      "/products/celest-cd-3-3.png"
    ],
    "description": "Gaming audio dongle tuned with low latency DSP for fast spatial acoustic cues and clear vocal comms.",
    "specs": [
      "Gaming DSP sound engine",
      "Dual mic comm support",
      "3.5mm stereo output",
      "Tangle-proof cable"
    ],
    "inStock": true,
    "stockQuantity": 18,
    "lowStockThreshold": 4,
    "isActive": false,
    "featured": false
  },
  {
    "id": "hiby-fd3-ii",
    "slug": "hiby-fd3-ii",
    "name": "HiBy FD3 II Dual ESS Sabre DAC",
    "category": "DACs",
    "price": 2450,
    "image": "F3",
    "imageUrl": "/products/hiby-fd3-ii.png",
    "imageUrls": [
      "/products/hiby-fd3-ii.png",
      "/products/hiby-fd3-ii-2.png",
      "/products/hiby-fd3-ii-3.png"
    ],
    "description": "High-resolution mobile USB DAC amplifier supporting 2.5mm, 3.5mm, and 4.4mm triple output interfaces.",
    "specs": [
      "Dual ESS Sabre DACs",
      "Triple output ports (2.5/3.5/4.4)",
      "Hardware gain switch",
      "All-metal chassis"
    ],
    "inStock": true,
    "stockQuantity": 8,
    "lowStockThreshold": 2,
    "isActive": false,
    "featured": false
  },
  {
    "id": "fangsound-nereus-mini",
    "slug": "fangsound-nereus-mini",
    "name": "FangSound NEREUS Mini CNC DAC",
    "category": "DACs",
    "price": 850,
    "image": "FS",
    "imageUrl": "/products/fangsound-nereus-mini.png",
    "imageUrls": [
      "/products/fangsound-nereus-mini.png",
      "/products/fangsound-nereus-mini-2.png",
      "/products/fangsound-nereus-mini-3.png"
    ],
    "description": "Precision machined aluminum portable DAC providing zero background hiss and transparent audio conversion.",
    "specs": [
      "Machined CNC alloy body",
      "384kHz / 32-bit PCM",
      "Zero noise floor",
      "Type-C universal input"
    ],
    "inStock": true,
    "stockQuantity": 16,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  },
  {
    "id": "crinear-protocol-micro",
    "slug": "crinear-protocol-micro",
    "name": "CrinEar Protocol Micro Studio DAC",
    "category": "DACs",
    "price": 1150,
    "image": "PM",
    "imageUrl": "/products/crinear-protocol-micro.png",
    "imageUrls": [
      "/products/crinear-protocol-micro.png",
      "/products/crinear-protocol-micro-2.png",
      "/products/crinear-protocol-micro-3.png"
    ],
    "description": "Studio-calibrated ultra-compact dongle DAC tuned for ruler-flat frequency response and uncolored output.",
    "specs": [
      "Ruler-flat studio response",
      "Ultra-compact form factor",
      "Low power drain architecture",
      "Plug-and-play"
    ],
    "inStock": true,
    "stockQuantity": 14,
    "lowStockThreshold": 3,
    "isActive": false,
    "featured": false
  }
];

export const featuredProducts = products.filter((product) => product.featured);

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}
