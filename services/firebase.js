import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';

// Initialize Firebase if not already initialized
// Note: React Native Firebase automatically initializes the native app
// This file mainly serves to centralize the exports

const db = firestore();

// Enable offline persistence
db.settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});

export { firebase, db };
export default db;
