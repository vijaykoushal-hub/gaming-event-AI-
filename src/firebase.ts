import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase using the configuration loaded from firebase-applet-config.json
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

// Connectivity check as requested in Skill.md
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase initialized successfully.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.error("Please check your Firebase configuration or network status.", error);
    }
  }
}
testConnection();

export { app, db, auth };
