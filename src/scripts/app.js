// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getFirestore, getDoc, getDocs, collection, doc, setDoc, Timestamp, arrayUnion, updateDoc } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js'
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-auth.js'


let USER_DATA = undefined;

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

// Initialize Firebase Authentication
const auth = getAuth(app);

// Loads the specified article from Firestore
async function loadArticle(name) {
    const docRef = doc(db, "articles", name);
    const docSnap = await getDoc(docRef);
    console.log(docSnap);
    if (!docSnap.exists()) {
        console.error(`Could not load article: ${name}`);
        return;
    }

    const data = docSnap.data();
    function onLoadArticle() {
        const converter = new showdown.Converter({ ghCompatibleHeaderId: true, disableForced4SpacesIndentedSublists: true });
        const html = converter.makeHtml(this.responseText);
        const articleDiv = document.getElementById("article");
        articleDiv.innerHTML = html;
        fixImages(articleDiv, data);
        highlightCode(articleDiv);
    }
    const req = new XMLHttpRequest();
    req.addEventListener("load", onLoadArticle);
    req.open("GET", data.url);
    req.send();
}

// Highlights codeblocks within the specified element
function highlightCode(el) {
    const codeBlocks = el.querySelectorAll("code");
    for (let block of codeBlocks) {
        hljs.highlightElement(block);
    }
}

// Fixes images to point to correct URL
function fixImages(el, data) {
    const imgs = el.getElementsByTagName("img");
    const ix = data.url.lastIndexOf("/");
    const baseURL = data.url.substring(0, ix + 1);
    for (let i of imgs) {
        i.src = `${baseURL}${i.getAttribute("src")}`;
    }
}

// Given an article name, load the comments section for the article
async function getComments(name) {
    const querySnapshot = await getDocs(collection(db, `articles/${name}/comments`));
    const commentTemplate = document.getElementById("comment-template");
    const commentSection = document.getElementById("comments");
    const comments = [];
    querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        comments.push(...doc.data().comments);
    });
    // TODO: Sort comments by date
    for (let comment of comments) {
        addComment(comment, commentTemplate, commentSection);
    }
}

function addComment(comment, commentTemplate, commentSection) {
    const newNode = commentTemplate.cloneNode(true);
    newNode.id = "";
    commentSection.appendChild(newNode);
    newNode.querySelectorAll("commentBody")[0].innerHTML = comment.body;
    newNode.querySelectorAll("commentTimeStamp")[0].innerHTML = formatTimeStamp(comment.timestamp);
    newNode.style.display = "";
}

function formatTimeStamp(timestamp) {
    // Nov. 25th 2022 at HH:MM:SS
    const options = { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" };
    return timestamp.toDate().toLocaleDateString('en-us', options);
}

function onAuth(user) {
    if (user) {
        USER_DATA = user;
        toggleLoggedInElements(true);

    } else {
        onDeAuth();
    }
}

function updateDisplayName(name) {
    const blocks = document.querySelectorAll("displayName");
    for (let block of blocks) {
        block.innerHTML = name;
    }
}

function onDeAuth() {
    USER_DATA = undefined;
    toggleLoggedInElements(false);
}

function toggleLoggedInElements(isLoggedIn) {
    if (isLoggedIn) {
        swapCssClass("visible-if-logged-in", "visible-if-logged-in-true");
        swapCssClass("visible-if-not-logged-in", "visible-if-not-logged-in-true");
        updateDisplayName(USER_DATA.displayName);
    }
    else {
        swapCssClass("visible-if-logged-in-true", "visible-if-logged-in");
        swapCssClass("visible-if-not-logged-in-true", "visible-if-not-logged-in");
        updateDisplayName("Not logged in!");
    }
}

function swapCssClass(cls0, cls1) {
    const loggedInBlocks = document.querySelectorAll(`.${cls0}`);
    for (let block of loggedInBlocks) {
        block.classList.replace(cls0, cls1);
    }
}

async function postComment(articleName) {
    const body = document.getElementById("comment-box").value;
    if (!isValidComment(body)) {
        console.error("Comment was not valid");
        return;
    }
    const button = document.getElementById("comment-button");
    button.disabled = true;
    const data = { body: body, timestamp: Timestamp.now() }
    const commentsRef = doc(db, `/articles/RefactoringAChessProgram/comments/${USER_DATA.uid}`);
    await getDoc(commentsRef).then((docSnap) => {
        const writeDoc = docSnap.exists() ? updateDoc : setDoc;
        writeDoc(commentsRef, {
            comments: arrayUnion(data)
        }).then(() => {
            const commentTemplate = document.getElementById("comment-template");
            const commentSection = document.getElementById("comments");
            addComment(data, commentTemplate, commentSection);
            document.getElementById("post-comment").style.display = "none";
        }).catch((error) => {
            console.error(error);
            button.disabled = false;
        });
    }).catch((error) => {
        console.error(error);
        button.disabled = false;
    });
}

function isValidComment(body) {
    return body && body.length > 5;
}

function logout() {
    signOut(auth).then(() => {
        onDeAuth();
    }).catch((error) => {
        console.error(error);
        onDeAuth();
    });
}

function googleAuth() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            const user = result.user;

        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            const credential = GoogleAuthProvider.credentialFromError(error);
            console.error(errorCode);
            console.error(errorMessage);
            console.error(credential);
            onDeAuth();
        });
}

document.body.onload = () => {
    loadArticle("RefactoringAChessProgram");
    getComments("RefactoringAChessProgram");

    onAuthStateChanged(auth, onAuth);

    window.googleAuth = googleAuth;
    window.logout = logout;

    document.getElementById("comment-button").addEventListener("click", postComment);
}