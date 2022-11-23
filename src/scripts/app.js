// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getFirestore, getDoc, collection, doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js'

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBuJqxqbgZc_R1I0UeixBTF_0d0uLYo8Ok",
    authDomain: "githubblogsite.firebaseapp.com",
    projectId: "githubblogsite",
    storageBucket: "githubblogsite.appspot.com",
    messagingSenderId: "269929112809",
    appId: "1:269929112809:web:e473d0446402568ffafc78"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
// const citiesRef = collection(db, "articles");


async function loadArticle(name) {
    const docRef = doc(db, "articles", name);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        console.error(`Could not load article: ${name}`);
        return;
    }

    const data = docSnap.data();
    function onLoadArticle() {
        const converter = new showdown.Converter({ghCompatibleHeaderId: true, disableForced4SpacesIndentedSublists: true});
        const html      = converter.makeHtml(this.responseText);
        const articleDiv = document.getElementById("article");
        articleDiv.innerHTML = html;
        const imgs = articleDiv.getElementsByTagName("img");
        const ix = data.url.lastIndexOf("/");
        const baseURL = data.url.substring(0,ix+1);
        for (let i of imgs){
            i.src = `${baseURL}${i.getAttribute("src")}`;
        }
    }
    const req = new XMLHttpRequest();
    req.addEventListener("load", onLoadArticle);
    req.open("GET", data.url);
    req.send();

}


document.body.onload = () => {
    loadArticle("RefactoringAChessProgram");
}