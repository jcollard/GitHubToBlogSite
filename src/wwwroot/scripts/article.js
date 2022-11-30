// Import the functions you need from the SDKs you need
import { collection, doc, documentId, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js';
import { formatTimeStamp } from "./common.js";
import { db } from "./firebase.js";
import { initLoginAndSettingsModal, USER_DATA } from "./user.js";

let commentModal = undefined;

/**
 * Given an articleId, attempts to load the article as well as the articles
 * comments and render them to the DOM. If no article with this ID is found,
 * displays a 404 error.
 * @param {*} articleId 
 */
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

/**
 * Given a document snapshot of an Article, attempts to load it and render it to
 * the DOM.
 * @param {*} docSnap 
 */
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

/**
 * Given an HTMLElement, finds all code blocks and attempts
 * to provide syntax highlighting.
 * @param {*} el 
 */
function highlightCode(el) {
    const codeBlocks = el.querySelectorAll("code");
    for (let block of codeBlocks) {
        hljs.highlightElement(block);
    }
}

// Fixes images to point to correct URL
/**
 * Helper function which fixes img tags loaded from
 * Markdown on a different server.
 * @param {*} el 
 * @param {*} data 
 */
function fixImages(el, data) {
    const imgs = el.getElementsByTagName("img");
    const ix = data.url.lastIndexOf("/");
    const baseURL = data.url.substring(0, ix + 1);
    for (let i of imgs) {
        i.src = `${baseURL}${i.getAttribute("src")}`;
    }
}

/**
 * Given an articleId, loads all comments associated with it from the database
 * and adds them to the DOM
 * @param {*} articleId 
 */
async function getComments(articleId) {

    const commentTemplate = document.getElementById("comment-template");
    const commentSection = document.getElementById("comments");
    const comments = [];
    const uids = new Set();

    const querySnapshot = await getDocs(collection(db, `articles/${articleId}/comments`));
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

/**
 * Given a set of uids, attempts to create a mapping from
 * each uid to the associated displayName in the database.
 * 
 * @param {*} uids 
 * @returns A dictionary from uids to { displayNames: string }
 */
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

/**
 * Helper function which adds a comment to the DOM.
 * @param {*} comment 
 * @param {*} commentTemplate 
 * @param {*} commentSection 
 */
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

/**
 * Given an element, finds all anchor tags, removes their href and onclick
 * attributes and replaces the innerHTML with a message saying the link was
 * removed.
 * @param {*} el 
 */
function removeLinks(el) {
    // TODO: Consider better security measure
    const anchorTags = el.querySelectorAll("a");
    for (let tag of anchorTags) {
        tag.removeAttribute("href");
        tag.removeAttribute("onclick");
        tag.innerHTML = "<b>**LINK REMOVED**</b>";
    }
}

/**
 * Call back function which attempts to post the user's comment.
 * If successful, the new comment is added to the screen and the comment
 * modal is closed. Otherwise, an error message is displayed.
 */
async function postComment() {
    const body = document.getElementById("comment-box").value;
    if (!isValidComment(body)) {
        // TODO: Display error message to user
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

/**
 * A comment is valid if it is at least 5 characters and less than 5000
 * characters
 * @param {*} body @returns true if the comment is valid and false otherwise
 */
function isValidComment(body) {
    return body && body.length > 5 && body.length < 5000;
}

/**
 * Displays a modal that allows the user to leave a comment.
 */
function showCommentModal() {
    const button = document.getElementById("comment-button");
    button.disabled = false;
    commentModal.show();
}

/**
 * Used to display a 404 message to the screen
 */
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