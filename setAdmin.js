const fs = require("fs");
const admin = require("firebase-admin");

const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const uid = (process.env.ADMIN_UID || process.argv[2] || "").trim();

if (!keyPath || !fs.existsSync(keyPath)) {
  console.error(
    "❌ Missing service account key path. Set GOOGLE_APPLICATION_CREDENTIALS=/secure/path/to/key.json outside the web root.",
  );
  process.exit(1);
}

if (!uid || uid === "PASTE_YOUR_USER_UID_HERE") {
  console.error("❌ Usage: ADMIN_UID=<firebase-uid> node setAdmin.js");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

admin
  .auth()
  .setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log("✅ Admin claim set successfully for UID:", uid);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error setting claim:", error.message || error);
    process.exit(1);
  });
