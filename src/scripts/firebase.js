// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBuJqxqbgZc_R1I0UeixBTF_0d0uLYo8Ok",
    authDomain: "githubblogsite.firebaseapp.com",
    projectId: "githubblogsite",
    storageBucket: "githubblogsite.appspot.com",
    messagingSenderId: "269929112809",
    appId: "1:269929112809:web:e473d0446402568ffafc78"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);