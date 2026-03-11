import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDuAtUAw8X_oYKpsODAfsAwkQElYjZI2Do",
  authDomain: "certitrack-bb43f.firebaseapp.com",
  databaseURL: "https://certitrack-bb43f-default-rtdb.firebaseio.com",
  projectId: "certitrack-bb43f",
  storageBucket: "certitrack-bb43f.firebasestorage.app",
  messagingSenderId: "166633830515",
  appId: "1:166633830515:web:8640ae82027cc887991206"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export for use in other files
// Note: Firebase Storage removed — file uploads now handled by Cloudinary (js/cloudinary.js)
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseCollection = collection;
window.firebaseGetDocs = getDocs;
window.firebaseAddDoc = addDoc;
window.firebaseSignInWithEmailAndPassword = signInWithEmailAndPassword;
window.firebaseSignOut = signOut;
window.firebaseOnAuthStateChanged = onAuthStateChanged;
window.firebaseOnSnapshot = onSnapshot;
window.firebaseQuery = query;
window.firebaseOrderBy = orderBy;
