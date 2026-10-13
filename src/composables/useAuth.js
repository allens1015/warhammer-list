import { ref } from 'vue'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../firebase.js'

// Google sign-in. `user` is null when signed out.
const user = ref(null)
const authError = ref('')

onAuthStateChanged(auth, u => {
  user.value = u ? { uid: u.uid, name: u.displayName ?? u.email } : null
})

// Closing the popup isn't an error worth showing
const DISMISSED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

async function signIn() {
  authError.value = ''
  try {
    await signInWithPopup(auth, new GoogleAuthProvider())
  } catch (e) {
    if (DISMISSED.includes(e.code)) return
    authError.value = e.code === 'auth/unauthorized-domain'
      ? 'Sign-in isn\'t enabled for this site address.'
      : 'Sign-in failed. Please try again.'
  }
}

function signOut() {
  authError.value = ''
  return firebaseSignOut(auth)
}

export function useAuth() {
  return { user, authError, signIn, signOut }
}
