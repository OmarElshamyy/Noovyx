export type ProductCategory =
  | "IEMs"
  | "Wireless"
  | "Cables"
  | "Ear tips"
  | "Cases"
  | "DACs";

export type ProductVariant = {
  id: string;
  productId: string;
  sku?: string;
  title: string;
  options: Record<string, string>;
  priceOverride?: number | null;
  stockQuantity: number;
  inStock: boolean;
  isActive: boolean;
  position: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  imageUrl: string;
  imageUrls: string[];
  description: string;
  specs: string[];
  inStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isArchived?: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  featured: boolean;
};

export type CartItem = {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
};

export type OrderStatus = "new" | "confirmed" | "fulfilled" | "cancelled";

export type OrderInquiryInput = {
  customerName: string;
  contact: string;
  governorate?: string;
  address: string;
  notes: string;
  couponCode?: string;
  idempotencyKey?: string;
  items: {
    productId: string;
    variantId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  subtotal: number;
};

export type OrderSubmitResult = {
  orderId: string;
  orderNumber?: string;
  guestLookupToken?: string;
  subtotal: number;
  shippingFee?: number | null;
  codFee?: number | null;
  discountAmount?: number | null;
  grandTotal?: number | null;
  idempotentReplay?: boolean;
  items: OrderInquiryInput["items"];
};

export type AdminOrder = OrderInquiryInput & {
  id: string;
  orderNumber?: string;
  status: OrderStatus;
  shippingFee?: number | null;
  codFee?: number | null;
  discountAmount?: number | null;
  grandTotal?: number | null;
  isLegacyImport?: boolean;
  legacyUnrecoverableFields?: string[];
  createdAt: Date | null;
  items: {
    productId: string;
    variantId?: string;
    variantTitle?: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
};

export type GuestOrderTrackingResult = {
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  confirmedAt?: string | null;
  fulfilledAt?: string | null;
  cancelledAt?: string | null;
  customerMasked: string;
  contactMasked: string;
  governorate?: string | null;
  subtotal: number;
  shippingFee: number | null;
  codFee: number | null;
  discountAmount: number | null;
  grandTotal: number | null;
  isLegacyImport: boolean;
  items: {
    name: string;
    variantTitle?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  events: {
    status: OrderStatus;
    note?: string | null;
    createdAt: string;
  }[];
};

export type StockMovementRecord = {
  id: number;
  productId: string;
  variantId?: string | null;
  quantityDelta: number;
  balanceAfter: number;
  movementType:
    | "initial_seed"
    | "migration_import"
    | "order_reserved"
    | "order_restocked"
    | "admin_adjustment"
    | "return";
  referenceType?: string | null;
  referenceId?: string | null;
  actorLabel?: string | null;
  note?: string | null;
  createdAt: string;
};
