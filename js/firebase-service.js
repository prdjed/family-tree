import { appCheckSiteKey, firebaseConfig } from "./firebase-config.js";

const FIREBASE_VERSION = "12.0.0";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isFirebaseConfigured() {
  return ["apiKey", "projectId", "storageBucket", "appId"].every(
    (key) => typeof firebaseConfig[key] === "string" && firebaseConfig[key].trim(),
  );
}

export function validateImage(image) {
  if (!image) {
    return;
  }
  if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
    throw new Error("Фотографија мора бити JPG, PNG, WEBP или GIF.");
  }
  if (image.size > MAX_IMAGE_BYTES) {
    throw new Error("Фотографија не смије бити већа од 5 MB.");
  }
}

export async function submitProposal({
  personId,
  message,
  image,
}) {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase још није подешен. Попуните js/firebase-config.js прије тестирања слања.",
    );
  }

  validateImage(image);

  const [{ initializeApp }, firestore, storage, appCheck] = await Promise.all([
    import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`
    ),
    import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`
    ),
    import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-storage.js`
    ),
    import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-check.js`
    ),
  ]);

  const app = initializeApp(firebaseConfig);
  if (appCheckSiteKey.trim()) {
    appCheck.initializeAppCheck(app, {
      provider: new appCheck.ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  const database = firestore.getFirestore(app);
  const fileStorage = storage.getStorage(app);
  const proposalReference = firestore.doc(
    firestore.collection(database, "proposals"),
  );

  let imagePath = "";
  if (image) {
    const safeFileName = sanitizeFileName(image.name);
    imagePath = `proposals/${proposalReference.id}/${safeFileName}`;
    await storage.uploadBytes(storage.ref(fileStorage, imagePath), image, {
      contentType: image.type,
    });
  }

  await firestore.setDoc(proposalReference, {
    personId,
    message,
    imagePath,
    status: "pending",
    schemaVersion: 1,
    submittedAt: firestore.serverTimestamp(),
  });

  return proposalReference.id;
}

function sanitizeFileName(fileName) {
  const extension = fileName.includes(".")
    ? `.${fileName.split(".").pop().toLowerCase()}`
    : "";
  return `image-${Date.now()}${extension.replace(/[^a-z0-9.]/g, "")}`;
}
