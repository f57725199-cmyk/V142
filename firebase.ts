import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, getDocs, query, where } from "firebase/firestore";
import { getDatabase, ref, set, get, onValue, update } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// --- FIREBASE CONFIGURATION (Project: students-app-deae5) ---
const firebaseConfig = {
  apiKey: "AIzaSyC7N3IOa7GRETNRBo8P-QKVFzg2bLqoEco",
  authDomain: "students-app-deae5.firebaseapp.com",
  databaseURL: "https://students-app-deae5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "students-app-deae5",
  storageBucket: "students-app-deae5.firebasestorage.app",
  messagingSenderId: "128267767708",
  appId: "1:128267767708:web:08ed73b1563b2f3eb60259"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const auth = getAuth(app);

// --- 1. AUTH & CONNECTION ---
export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, (user) => callback(user));
};

// --- 2. USER MANAGEMENT (All Features Included) ---

// ईमेल से यूजर ढूंढना (Vercel Build Fix)
export const getUserByEmail = async (email) => {
    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty ? querySnapshot.docs[0].data() : null; 
    } catch (e) { return null; }
};

export const getUserData = async (userId) => {
    try {
        const docSnap = await getDoc(doc(db, "users", userId));
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) { return null; }
};

// नया यूजर सेव करना (Dual Write)
export const saveUserToLive = async (user) => {
  try {
    const uid = auth.currentUser?.uid || user.uid || user.id;
    if (!uid) return;
    const userData = { 
        ...user, 
        uid, 
        role: user.role || 'STUDENT',
        lastUpdated: new Date().toISOString() 
    };
    await Promise.all([
        set(ref(rtdb, `users/${uid}`), userData),
        setDoc(doc(db, "users", uid), userData)
    ]);
  } catch (error) { console.error("Save Error:", error); }
};

// एडमिन के लिए छात्रों की लिस्ट
export const subscribeToUsers = (callback) => {
  return onSnapshot(collection(db, "users"), (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data()));
  });
};

export const updateUserStatus = async (userId) => {
     try {
        await update(ref(rtdb, `users/${userId}`), { lastActiveTime: new Date().toISOString() });
    } catch (error) { }
};

// --- 3. SYSTEM SETTINGS ---
export const saveSystemSettings = async (settings) => {
    await Promise.all([
        set(ref(rtdb, 'system_settings'), settings),
        setDoc(doc(db, "config", "system_settings"), settings)
    ]);
};

export const subscribeToSettings = (callback) => {
  return onSnapshot(doc(db, "config", "system_settings"), (docSnap) => {
      if (docSnap.exists()) callback(docSnap.data());
  });
};

// --- 4. CONTENT & BULK UPLOAD ---
export const bulkSaveLinks = async (updates) => {
    await update(ref(rtdb, 'content_links'), updates);
    const promises = Object.entries(updates).map(([key, data]) => setDoc(doc(db, "content_data", key), data));
    await Promise.all(promises);
};

export const saveChapterData = async (key, data) => {
    await Promise.all([
        set(ref(rtdb, `content_data/${key}`), data),
        setDoc(doc(db, "content_data", key), data)
    ]);
};

export const subscribeToChapterData = (key, callback) => {
    return onValue(ref(rtdb, `content_data/${key}`), (snapshot) => {
        if (snapshot.exists()) callback(snapshot.val());
    });
};

// --- 5. TEST RESULTS ---
export const saveTestResult = async (userId, attempt) => {
    const docId = `${attempt.testId}_${Date.now()}`;
    await setDoc(doc(db, "users", userId, "test_results", docId), attempt);
};

export { app, db, rtdb, auth };

