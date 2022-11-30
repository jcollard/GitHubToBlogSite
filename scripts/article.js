// Import the functions you need from the SDKs you need
import { getDoc, getDocs, collection, doc, setDoc, Timestamp, query, where, documentId, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js'
import { db } from "./firebase.js";
import { initLoginAndSettingsModal, USER_DATA } from "./user.js";
import { formatTimeStamp } from "./common.js";

let commentModal = undefined;

async function initArticle(articleId) {
    
    const docRef = doc(db, "articles", articleId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        display404();
        return;
    }

    loadArticle(docSnap);
    getComments(articleId);
    document.getElementById("comment-button").addEventListener("click", postComment);
    document.getElementById("show-comment-modal-button").addEventListener("click", showCommentModal);
    commentModal = new bootstrap.Modal(document.getElementById('comment-modal'), {});
}

// Loads the specified article from Firestore
async function loadArticle(docSnap) {

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

    const commentTemplate = document.getElementById("comment-template");
    const commentSection = document.getElementById("comments");
    const comments = [];
    const uids = new Set();

    const querySnapshot = await getDocs(collection(db, `articles/${name}/comments`));
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        uids.add(data.uid);
        comments.push(data);
    });
    let users = uids.size > 0 ? await getUserData(uids) : [];
    // TODO: If there are no comments, add a "Be the First to Comment!"
    for (let comment of comments) {
        if (!comment.uid || !users[comment.uid]) continue;
        comment.displayName = users[comment.uid].displayName;
    }
    comments.sort((c0, c1) => c0.timestamp.seconds - c1.timestamp.seconds);
    for (let comment of comments) {
        addComment(comment, commentTemplate, commentSection);
    }
}

async function getUserData(uids) {
    const userDataRef = collection(db, "userData");
    const docs = await getDocs(query(userDataRef, where(documentId(), "in", Array.from(uids))));
    const users = {};
    docs.forEach((doc) => {
        const path = doc.ref.path.split("/");
        const uid = path[path.length - 1];
        users[uid] = { displayName: doc.data().displayName };
    });
    return users;
}

function addComment(comment, commentTemplate, commentSection) {
    const converter = new showdown.Converter({
        ghCompatibleHeaderId: true,
        disableForced4SpacesIndentedSublists: true,
        simplifiedAutoLink: true,

    });
    const newNode = commentTemplate.cloneNode(true);
    newNode.id = "";
    newNode.querySelectorAll("commentBody")[0].innerHTML = converter.makeHtml(comment.body);
    newNode.querySelectorAll("commentTimeStamp")[0].innerHTML = formatTimeStamp(comment.timestamp);
    newNode.querySelectorAll("commentDisplayName")[0].innerHTML = comment.displayName ? comment.displayName : "**Deleted Account**";
    newNode.style.display = "";
    removeLinks(newNode);
    highlightCode(newNode);
    commentSection.appendChild(newNode);
}

function removeLinks(el) {
    // TODO: Consider better security measure
    const anchorTags = el.querySelectorAll("a");
    for (let tag of anchorTags) {
        tag.removeAttribute("href");
        tag.innerHTML = "<b>**LINK REMOVED**</b>";
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
    const data = { uid: USER_DATA.uid, body: body, timestamp: serverTimestamp() }
    const newCommentRef = doc(collection(db, `/articles/RefactoringAChessProgram/comments`));
    await setDoc(newCommentRef, data)
        .then(() => {
            const commentTemplate = document.getElementById("comment-template");
            const commentSection = document.getElementById("comments");
            data.displayName = USER_DATA.displayName;
            addComment(data, commentTemplate, commentSection);
            document.getElementById("comment-box").value = "";
            commentModal.hide();
        }).catch((error) => {
            // TODO: Show error message to user
            console.error(error);
            button.disabled = false;
        });

}

function isValidComment(body) {
    return body && body.length > 5 && body.length < 5000;
}

function showCommentModal() {
    const button = document.getElementById("comment-button");
    button.disabled = false;
    commentModal.show();
}

function display404() {
    document.getElementById("article").innerHTML =
        `<h1>404 Article Not Found</h1>
            <a href="index.html">All Articles</a>
            `;

    document.getElementById("post-comment").style.visibility = "hidden";
    document.getElementById("login").style.visibility = "hidden";
}

document.body.onload = () => {
    let articleId = new URLSearchParams(document.location.search).get("article-id");
    const path = document.location.pathname.split("/");
    articleId = articleId ? articleId : path[path.length - 1];

    initArticle(articleId);

    initLoginAndSettingsModal();

    
}