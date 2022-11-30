import { initLoginAndSettingsModal } from "./user.js";
import { db } from "./firebase.js";
import { getDocs, collection } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js';
import { formatTimeStamp } from "./common.js";

async function loadAllArticles() {
    const querySnapshot = await getDocs(collection(db, `articles`));
    querySnapshot.forEach((doc) => {
        displayArticle(doc);
    });
}

function displayArticle(articleRef) {
    const article = articleRef.data();
    const parent = document.getElementById("articles");
    const newCard = document.getElementById("article-template").cloneNode(true);
    parent.appendChild(newCard);
    newCard.querySelectorAll("#article-title")[0].innerHTML = article.name;
    newCard.querySelectorAll("#article-published-at")[0].innerHTML = formatTimeStamp(article.publishedAt);
    newCard.querySelectorAll("#article-description")[0].innerHTML = article.description;
    newCard.querySelectorAll("#article-link")[0].href = `${articleRef.ref.id}`;
    newCard.style.display = "";
}

document.body.onload = () => {
    initLoginAndSettingsModal();
    loadAllArticles();
}