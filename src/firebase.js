import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Replace this with your actual Firebase config
// You can find this in the Firebase Console under Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyDby38MLSr5GYGRxVF-STnMjQFyRxE6pOo",
  authDomain: "poll-app-eb33f.firebaseapp.com",
  projectId: "poll-app-eb33f",
  storageBucket: "poll-app-eb33f.firebasestorage.app",
  messagingSenderId: "422271397418",
  appId: "1:422271397418:web:06f31a3b57248de3ef9d53"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, app };
