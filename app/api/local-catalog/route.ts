import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Product } from "../../../types";

export const dynamic = "force-dynamic";

const STATE_FILE_PATH = path.join(process.cwd(), "local-catalog-state.json");
const PRODUCTS_TS_PATH = path.join(process.cwd(), "products.ts");
const STOREFRONT_CONFIG_TS_PATH = path.join(process.cwd(), "storefrontConfig.ts");

interface LocalServerState {
  catalogState?: {
    overrides: Record<string, Record<string, unknown>>;
    deletedIds: string[];
    updatedAt: number;
  };
  cmsConfig?: Record<string, unknown>;
  cmsUpdatedAt?: number;
  updatedAt?: number;
}

function readServerState(): LocalServerState {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, "utf8");
      return JSON.parse(raw) as LocalServerState;
    }
  } catch {
    // Ignore read errors
  }
  return {};
}

function writeProductsTsFile(productsList: Product[]) {
  try {
    const cleanList = productsList.filter(
      (p) => p.id !== "noovyx-cms-config-v2" && p.id !== "__noovyx_cms_config__",
    );
    const fileContent = `import type { Product, ProductCategory } from "./types";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "IEMs",
  "Wireless",
  "Cables",
  "Ear tips",
  "Cases",
  "DACs",
];

export const products: Product[] = ${JSON.stringify(cleanList, null, 2)};

export const featuredProducts = products.filter((product) => product.featured);

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}
`;
    fs.writeFileSync(PRODUCTS_TS_PATH, fileContent, "utf8");
  } catch {
    // Ignore on read-only serverless environments
  }
}

function writeStorefrontConfigTsDefault(cmsConfig: Record<string, unknown>) {
  try {
    if (!fs.existsSync(STOREFRONT_CONFIG_TS_PATH)) return;
    const src = fs.readFileSync(STOREFRONT_CONFIG_TS_PATH, "utf8");
    const startMarker = "export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = ";
    const endMarker = "export const STORAGE_KEY = ";
    const startIdx = src.indexOf(startMarker);
    const endIdx = src.indexOf(endMarker);
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return;

    const newDefaultBlock = `${startMarker}${JSON.stringify(cmsConfig, null, 2)};\n\n`;
    const updatedSrc = src.slice(0, startIdx) + newDefaultBlock + src.slice(endIdx);
    fs.writeFileSync(STOREFRONT_CONFIG_TS_PATH, updatedSrc, "utf8");
  } catch {
    // Ignore on read-only serverless environments
  }
}

export async function GET() {
  const state = readServerState();
  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      catalogState?: LocalServerState["catalogState"];
      fullCatalog?: Product[];
      cmsConfig?: Record<string, unknown>;
    };

    const current = readServerState();
    const now = Date.now();
    const nextState: LocalServerState = {
      ...current,
      updatedAt: now,
    };

    if (body.catalogState && typeof body.catalogState === "object") {
      nextState.catalogState = body.catalogState;
    }

    if (body.cmsConfig && typeof body.cmsConfig === "object") {
      nextState.cmsConfig = body.cmsConfig;
      nextState.cmsUpdatedAt = now;
      writeStorefrontConfigTsDefault(body.cmsConfig);
    }

    try {
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(nextState, null, 2), "utf8");
    } catch {
      // Ignore on read-only filesystem
    }

    if (Array.isArray(body.fullCatalog) && body.fullCatalog.length > 0) {
      writeProductsTsFile(body.fullCatalog);
    }

    return NextResponse.json({ ok: true, state: nextState });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid payload" },
      { status: 400 },
    );
  }
}
