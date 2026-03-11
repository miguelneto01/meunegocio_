import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBayEQj4CaBj60DV7vsZ15Bl3hPa7yyG1w",
    authDomain: "meunegocio-43af7.firebaseapp.com",
    projectId: "meunegocio-43af7",
    storageBucket: "meunegocio-43af7.firebasestorage.app",
    messagingSenderId: "993491133200",
    appId: "1:993491133200:web:9810fad2e7ace327c8fb95"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    firebase.firestore().enablePersistence().catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.warn('Persistence not supported by browser');
        }
    });
}

export const db = firebase.firestore();
export default firebase;
