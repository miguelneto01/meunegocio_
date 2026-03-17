import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import firebaseConfig from '../firebase-applet-config.json';

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// @ts-ignore
export const db = firebase.app().firestore(firebaseConfig.firestoreDatabaseId);
export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

// Test connection to diagnose "client is offline"
db.collection('_connection_test').doc('ping').get({ source: 'server' })
  .then(() => console.log("Firestore connected successfully"))
  .catch((err) => {
    // Silent catch - the app will handle errors naturally
    if (err.message && !err.message.includes('offline')) {
      console.warn("Firestore connectivity check:", err.message);
    }
  });

export default firebase;
