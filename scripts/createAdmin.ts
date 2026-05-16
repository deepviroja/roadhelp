import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = process.argv[2] || "admin@roadhelp.com";
const ADMIN_PASSWORD = process.argv[3] || "Admin@123";

async function createAdmin() {
  // console.log(`Setting up Admin account for: ${ADMIN_EMAIL}...`);
  try {
    const credential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      fullName: "System Admin",
      email: ADMIN_EMAIL,
      phone: "+10000000000",
      role: "admin",
      createdAt: serverTimestamp(),
    });

    // console.log("==================================================");
    // console.log("✅ Admin account created successfully!");
    // console.log(`🔑 Email: ${ADMIN_EMAIL}`);
    // console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
    // console.log("==================================================");
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      // console.log("==================================================");
      // console.log("⚠️ Admin account already exists in Firebase Auth.");
      // console.log("Ensure the 'admin' role is set in the 'users' Firestore collection.");
      // console.log(`🔑 Email: ${ADMIN_EMAIL}`);
      // console.log(`🔑 Password: ${ADMIN_PASSWORD} (or previously set password)`);
      // console.log("==================================================");
      process.exit(0);
    } else {
      console.error("❌ Error creating admin:", error.message);
      process.exit(1);
    }
  }
}

createAdmin();
