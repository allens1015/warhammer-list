import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore/lite'
import { db } from '../firebase.js'

// Where saved lists are kept. A store is { list(), put(saved), remove(id) },
// all async; a saved list is any object with an `id`.

// This browser's local storage
export function localStore(key) {
  const read = () => JSON.parse(localStorage.getItem(key)) ?? []
  const write = lists => localStorage.setItem(key, JSON.stringify(lists))
  return {
    async list() { return read() },
    async put(saved) { write([saved, ...read().filter(l => l.id !== saved.id)]) },
    async remove(id) { write(read().filter(l => l.id !== id)) },
  }
}

// A signed-in user's Firestore collection: users/<uid>/<name>/<id>
export function cloudStore(uid, name) {
  const lists = collection(db, 'users', uid, name)
  return {
    async list() { return (await getDocs(lists)).docs.map(d => d.data()) },
    async put(saved) { await setDoc(doc(lists, saved.id), saved) },
    async remove(id) { await deleteDoc(doc(lists, id)) },
  }
}
