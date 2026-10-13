import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore/lite'

// Web config for the rpgbookshelf Firebase project. These values are public
// by design; access is controlled by the Firestore rules (firestore.rules)
// and the project's authorised domains.
const firebaseConfig = {
  apiKey: 'AIzaSyDi8AH5WHYr6DyrRxse1nG43SfaWuvCXS0',
  authDomain: 'rpgbookshelf-dc8f8.firebaseapp.com',
  projectId: 'rpgbookshelf-dc8f8',
  storageBucket: 'rpgbookshelf-dc8f8.firebasestorage.app',
  messagingSenderId: '940350556722',
  appId: '1:940350556722:web:73ffe915ce0d30e78d4a2b',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
