import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import firebaseConfig from '../firebase-applet-config.json';

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// @ts-ignore
export const db = firebase.app().firestore(firebaseConfig.firestoreDatabaseId);

// Force long polling to avoid WebSocket issues in iframes
db.settings({ experimentalForceLongPolling: true });

export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

// Test connection to diagnose "client is offline"
db.collection('_connection_test').doc('ping').get({ source: 'server' })
  .then(() => console.log("Firestore connected successfully"))
  .catch((err) => {
    if (err.message.includes('offline')) {
      console.error("Firestore Error: The client is offline. Please check if the Firestore API is enabled in the Google Cloud Console and that the database is provisioned.");
    }
  });

export default firebase;
