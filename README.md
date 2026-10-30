# Noovyx (noovyx.com)

Next.js storefront for Noovyx (https://noovyx.com) — Egypt's pro audio, IEM, and portable Hi-Fi accessories store. The first version uses a manual order inquiry flow: customers build a cart, submit contact details, and the inquiry is saved to Firebase Firestore.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Firebase Setup

Create a Firebase project, enable Firestore, and add a web app. Copy the web app config into `.env.local` using the keys from `.env.local.example`.

Required variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Order inquiries are written to the `orders` collection with customer contact fields, cart items, subtotal, `status: "new"`, and a Firestore server timestamp.

## Security Setup

The Firebase web config values are public by design. Protect the database with Firestore rules and Firebase App Check rather than trying to hide `NEXT_PUBLIC_FIREBASE_*` values.

Use the included `firestore.rules` as the starting rule set. Public visitors can read active products, create order inquiries, and cannot read/update/delete orders. Product and order management require an admin Firebase Auth user.

Recommended Firebase hardening:

- Enable Firebase App Check for the web app.
- Keep Firestore public reads disabled unless a collection is intentionally public.
- Review new `orders` documents from the Firebase console or a private admin tool, not from the storefront.
- Keep `.env.local` out of git. Only commit `.env.local.example`.
- Grant admin access with either an `admin: true` custom claim or a Firestore document at `admins/{your-auth-uid}`.

The Next.js app also sends security headers for CSP, clickjacking protection, MIME sniff protection, referrer policy, permissions policy, and HSTS.

## Product Images

Product images use Vercel static assets for a zero-cost workflow. Put images in:

```text
public/products/
```

Then set the product `Image path` in `/admin` to the public path:

```text
/products/KZ ZSN Pro-1.png
```

For multiple images, add one path per line in the admin `Gallery image paths` field:

```text
/products/KZ ZSN Pro-1.png
/products/KZ ZSN Pro-2.png
/products/KZ ZSN Pro-3.png
```

The first gallery path becomes the main product image. Product cards use the main image, and product details show the full gallery.

In `/admin`, you can also paste just the file name into `Add product image`, for example:

```text
KZ ZSN Pro-3 - Copy.png
```

The dashboard converts it to:

```text
/products/KZ ZSN Pro-3 - Copy.png
```

Do not use Firebase Storage for product images in this version. Firestore stores only the image path string, and Vercel serves the file from `public/products`.

## Currency

Prices display in Egyptian pounds using the `EGP` currency formatter. Enter product prices as plain numbers in `/admin`.

## Admin Portal

Visit `/admin` and sign in with a Firebase Auth email/password account. The admin portal can:

- Create, edit, and delete products.
- Manage product category, price, description, specs, active status, and featured status.
- Manage stock quantity and low-stock threshold.
- Manage image paths for files stored in `public/products`.
- View customer order inquiries.
- Change order status to `new`, `confirmed`, `fulfilled`, or `cancelled`.
- Delete test or spam order inquiries.

Product records are stored in the Firestore `products` collection. Product images are committed as static files under `public/products`, and Firestore stores only the public path.

Order inquiries are stored in the Firestore `orders` collection. Public customers can create orders, but only admins can read, update, or delete them.

To create your admin user:

1. Enable Email/Password sign-in in Firebase Auth.
2. Create your admin user.
3. Copy the user UID from Firebase Auth.
4. In Firestore, create a document at `admins/{UID}`. It can contain `{ "role": "admin" }`.
5. Deploy `firestore.rules`.
6. Sign out of `/admin`, sign in again, and check that the admin header says admin access is detected.

You can also use a custom claim instead of the `admins/{UID}` document if you prefer:

```js
admin.auth().setCustomUserClaims(uid, { admin: true })
```

## Vercel Deployment

Import the repository into Vercel as a Next.js project. Add the same `NEXT_PUBLIC_FIREBASE_*` variables in Project Settings, then deploy.

## Checkout & Order Flow

The storefront features an advanced, responsive checkout flow adhering to UX-CONTRACT.md and inspired by modern e-commerce usability principles:

1. **Order Loadout / Summary**: Real-time line items with high-res product thumbnails, item category badges, inline quantity steppers, unit prices, and item totals.
2. **Customer Information**: Full name and Phone / WhatsApp number with inline real-time validation.
3. **Delivery Information**: Governorate / City selection (with Egyptian governorate autocompletion) and detailed street address, saved cleanly to the existing `address` backend field.
4. **Order Notes & Preferences (Optional)**: Optional customer notes for cable termination, ear-tip size preferences, or delivery instructions.
5. **Pricing Breakdown**: Subtotal, transparent delivery fee notice (confirmed upon review), and total order value in Egyptian Pounds (EGP).
6. **Cash on Delivery Guarantee & CTA**: Clear `PLACE ORDER REQUEST` action with double-submit protection, loading spinner, and explicit reassurance that payment is Cash on Delivery (no online card payment required).
7. **Order Success & Confirmation**: Dedicated confirmation view with a 1-click Copy Order ID button, complete loadout receipt, a 3-step fulfillment timeline, direct WhatsApp chat shortcut, and a `Continue Shopping` action.
