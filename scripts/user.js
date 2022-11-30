import { GithubAuthProvider, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js';
import { auth, db } from './firebase.js';

export let loginModal = undefined;
export let settingsModal = undefined;
export let USER_DATA = undefined;

function logout() {
    signOut(auth).then(() => {
        onDeAuth();
    }).catch((error) => {
        console.error(error);
        onDeAuth();
    });

    USER_DATA = undefined;
    toggleLoggedInElements(false);
}

/**
 * Callback used when the user authenticates
 * @param {*} user
 */
function onAuth(user) {
    if (user) {
        // Set the display name to default display name.
        USER_DATA = user;
        setDisplayName();
        toggleLoggedInElements(true);
        loginModal.hide();
    } else {
        onDeAuth();
    }
}

/**
 * Helper function used when authorizing that enforces a user to select a
 * DisplayName the first time they authenticate.
 */
async function setDisplayName() {
    const displayName = USER_DATA.displayName ? USER_DATA.displayName : "No Display Name";
    const userInfoRef = doc(db, `/userData/${USER_DATA.uid}`);
    await getDoc(userInfoRef).then((docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            USER_DATA.displayName = data.displayName;
            document.getElementById("display-name").value = USER_DATA.displayName;
            document.getElementById("user-settings").innerHTML = USER_DATA.displayName;
        }
        else {
            document.getElementById("display-name").value = USER_DATA.displayName;
            document.getElementById("user-settings").innerHTML = USER_DATA.displayName;
            settingsModal.show();
        }
    });
}

/**
 * Toggles elements on the screen that should be visible (or not visible) based
 * on the user being logged in.
 * @param {*} isLoggedIn
 */
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

/**
 * Updates all <displayName> tags throughout the document with the
 * provided name.
 * @param {*} name
 */
function updateDisplayName(name) {
    const blocks = document.querySelectorAll("displayName");
    for (let block of blocks) {
        block.innerHTML = name;
    }
}

/**
 * Helper method which swaps two classes throughout the document
 * @param {*} cls0
 * @param {*} cls1
 */
function swapCssClass(cls0, cls1) {
    const loggedInBlocks = document.querySelectorAll(`.${cls0}`);
    for (let block of loggedInBlocks) {
        block.classList.replace(cls0, cls1);
    }
}

/**
 * Calls performAuth with Firebase's GoogleAuthProvider
 */
function googleAuth() {
    const provider = new GoogleAuthProvider();
    performAuth(provider);
}

/**
 * Calls performAuth with Firebase's GithubAuthProvider
 */
function githubAuth() {
    const provider = new GithubAuthProvider();
    performAuth(provider);
}

/**
 * Given an Firebase Authorization provider, creates a popup
 * window for the user to authenticate.
 * @param {*} provider
 */
function performAuth(provider) {
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

/**
 * Callback triggered by submitting the users new Display Name.
 * Attempts to write the name to the database.
 */
function setUsersDisplayName(event) {

    const newDisplayName = document.getElementById("display-name").value;
    const displayNameFeedback = document.getElementById("display-name-feedback");
    if (!validateDisplayName(newDisplayName)) {
        event.preventDefault();
        event.stopPropagation();
        displayNameFeedback.style.display = "block";
        return;
    }
    event.preventDefault();
    displayNameFeedback.style.display = "";
    const userInfoRef = doc(db, `/userData/${USER_DATA.uid}`);
    setDoc(userInfoRef, {
        displayName: newDisplayName
    }).then(() => {
        USER_DATA.displayName = newDisplayName;
        document.getElementById("user-settings").innerHTML = USER_DATA.displayName;
        settingsModal.hide();
    }).catch((error) => {
        console.error("Could not update Display Name");
        alert("Could not update Display Name");
    });
}

/**
 * Given a Display Name, validates that it is at least 5 characters
 * in length, starts with a letter, and contains only letters and numbers.
 * @param {*} name
 * @returns true if the display name is valid and false otherwise
 */
function validateDisplayName(name) {
    return name.match(/^[a-zA-Z][a-zA-Z0-9]{4,}$/);
}

/**
 * Initializes the Login and Settings Modals
 */
export function initLoginAndSettingsModal() {
    onAuthStateChanged(auth, onAuth);
    loginModal = new bootstrap.Modal(document.getElementById('login-modal'), {});
    settingsModal = new bootstrap.Modal(document.getElementById('settings-modal'), {});
    window.showLogin = () => loginModal.show();
    window.logout = logout;
    window.googleAuth = googleAuth;
    window.githubAuth = githubAuth;
    document.getElementById("display-name-form").addEventListener("submit", setUsersDisplayName);
    document.getElementById("user-settings").addEventListener("click", () => settingsModal.show());
    document.getElementById("user-settings-close").addEventListener("click", setUsersDisplayName);
}