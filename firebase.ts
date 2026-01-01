import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, setDoc, getDoc, collection, updateDoc, deleteDoc, onSnapshot, getDocs, query, where } from "firebase/firestore";
import { getDatabase, ref, set, get, onValue, update, remove } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// --- NEW FIREBASE CONFIGURATION (Project: students-app-deae5) ---
const firebaseConfig = {
  apiKey: "AIzaSyC7N3IOa7GRETNRBo8P-QKVFzg2bLqoEco",
  authDomain: "students-app-deae5.firebaseapp.com",
  databaseURL: "https://students-app-deae5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "students-app-deae5",
  storageBucket: "students-app-deae5.firebasestorage.app",
  messagingSenderId: "128267767708",
  appId: "1:128267767708:web:08ed73b1563b2f3eb60259"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const auth = getAuth(app);

// --- 1. INTERNAL HELPER: ADMIN VERIFICATION ---
const verifyAdmin = async (uid) => {
    if (!uid) return false;
    const userSnap = await getDoc(doc(db, "users", uid));
    return userSnap.exists() && userSnap.data().role === 'ADMIN';
};

// --- 2. AUTH & CONNECTION HELPERS ---
export const checkFirebaseConnection = () => true;

export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
        const isAdmin = await verifyAdmin(user.uid);
        callback({ ...user, isAdmin });
    } else {
        callback(null);
    }
  });
};

// --- 3. USER DATA MANAGEMENT (Dual Write) ---
export const saveUserToLive = async (user) => {
  try {
    // हमेशा Authentication वाली लंबी UID का उपयोग करें
    const realUID = auth.currentUser?.uid || user.uid || user.id; 
    if (!realUID) return;

    const userData = {
        ...user,
        uid: realUID,
        role: user.role || 'STUDENT',
        displayId: user.displayId || user.id || "IIC-NEW",
        lastUpdated: new Date().toISOString()
    };

    // Firestore और RTDB दोनों में एक साथ सेव
    await Promise.all([
        set(ref(rtdb, `users/${realUID}`), userData),
        setDoc(doc(db, "users", realUID), userData)
    ]);
  } catch (error) {
    console.error("Error saving user:", error);
  }
};

// एडमिन के लिए सभी छात्रों की लिस्ट
export const subscribeToUsers = (callback) => {
  const q = collection(db, "users");
  return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data());
      if (users.length > 0) callback(users);
      else {
          onValue(ref(rtdb, 'users'), (snap) => {
             const data = snap.val();
             callback(data ? Object.values(data) : []);
          }, { onlyOnce: true });
      }
  });
};

export const getUserData = async (userId) => {
    const snap = await get(ref(rtdb, `users/${userId}`));
    if (snap.exists()) return snap.val();
    const docSnap = await getDoc(doc(db, "users", userId));
    return docSnap.exists() ? docSnap.data() : null;
};

// --- 4. SYSTEM SETTINGS & CONFIG ---
export const saveSystemSettings = async (settings) => {
  try {
    await Promise.all([
        set(ref(rtdb, 'system_settings'), settings),
        setDoc(doc(db, "config", "system_settings"), settings)
    ]);
  } catch (error) { console.error("Settings Error:", error); }
};

export const subscribeToSettings = (callback) => {
  return onSnapshot(doc(db, "config", "system_settings"), (docSnap) => {
      if (docSnap.exists()) callback(docSnap.data());
      else {
           onValue(ref(rtdb, 'system_settings'), (snap) => {
               if (snap.val()) callback(snap.val());
           }, { onlyOnce: true });
      }
  });
};

// --- 5. CONTENT & BULK SAVING (Admin Features) ---
export const bulkSaveLinks = async (updates) => {
  try {
    await update(ref(rtdb, 'content_links'), updates);
    const promises = Object.entries(updates).map(([key, data]) => 
        setDoc(doc(db, "content_data", key), data)
    );
    await Promise.all(promises);
  } catch (error) { console.error("Bulk upload error:", error); }
};

export const saveChapterData = async (key, data) => {
  try {
    await Promise.all([
        set(ref(rtdb, `content_data/${key}`), data),
        setDoc(doc(db, "content_data", key), data)
    ]);
  } catch (error) { console.error("Chapter Save Error:", error); }
};

// --- 6. STUDENT SPECIFIC: TESTS & STATUS ---
export const saveTestResult = async (userId, attempt) => {
    try {
        const docId = `${attempt.testId}_${Date.now()}`;
        await setDoc(doc(db, "users", userId, "test_results", docId), attempt);
    } catch(e) { console.error("Test result failed:", e); }
};

export const updateUserStatus = async (userId) => {
     try {
        const userRef = ref(rtdb, `users/${userId}`);
        await update(userRef, { lastActiveTime: new Date().toISOString() });
    } catch (error) { }
};

// --- 7. READ HELPERS (For Students) ---
export const getChapterData = async (key) => {
    const snapshot = await get(ref(rtdb, `content_data/${key}`));
    if (snapshot.exists()) return snapshot.val();
    const docSnap = await getDoc(doc(db, "content_data", key));
    return docSnap.exists() ? docSnap.data() : null;
};

export const subscribeToChapterData = (key, callback) => {
    return onValue(ref(rtdb, `content_data/${key}`), (snapshot) => {
        if (snapshot.exists()) callback(snapshot.val());
        else {
            getDoc(doc(db, "content_data", key)).then(snap => {
                if (snap.exists()) callback(snap.data());
            });
        }
    });
};

export { app, db, rtdb, auth };
