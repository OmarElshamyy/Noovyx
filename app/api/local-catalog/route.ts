import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ADMIN_GATE_COOKIE, verifyAdminGateToken } from "../../../adminGate";
import type { Product } from "../../../types";

export const dynamic = "force-dynamic";

const STATE_FILE_PATH = path.join(process.cwd(), "local-catalog-state.json");
const PRODUCTS_TS_PATH = path.join(process.cwd(), "products.ts");

interface LocalServerState {
  catalogState?: {
    overrides: Record<string, Record<string, unknown>>;
    deletedIds: string[];
    updatedAt: number;
  };
  cmsConfig?: Record<string, unknown>;
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
    const fileContent = `import type { Product, ProductCategory } from "./types";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "IEMs",
  "Wireless",
  "Cables",
  "Ear tips",
  "Cases",
  "DACs",
];

export const products: Product[] = ${JSON.stringify(productsList, null, 2)};

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
    // Ignore on read-only serverless environments (like Vercel runtime)
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
  // If ADMIN_ACCESS_KEY is configured, check the admin gate cookie when present
  const gateCookie = req.cookies.get(ADMIN_GATE_COOKIE)?.value;
  if (process.env.ADMIN_ACCESS_KEY && gateCookie) {
    const valid = await verifyAdminGateToken(gateCookie);
    if (!valid && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = (await req.json()) as {
      catalogState?: LocalServerState["catalogState"];
      fullCatalog?: Product[];
      cmsConfig?: Record<string, unknown>;
    };

    const current = readServerState();
    const nextState: LocalServerState = {
      ...current,
      updatedAt: Date.now(),
    };

    if (body.catalogState && typeof body.catalogState === "object") {
      nextState.catalogState = body.catalogState;
    }

    if (body.cmsConfig && typeof body.cmsConfig === "object") {
      nextState.cmsConfig = body.cmsConfig;
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
