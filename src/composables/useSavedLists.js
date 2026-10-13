import { ref, computed, watch } from 'vue'

// Saved lists. A saved list is { id, name, updatedAt, list }, where `list`
// is a useList snapshot. They live in `local` (this browser) while signed
// out and in `cloud(uid)` (the user's account) while signed in; signing in
// moves this browser's lists into the account.
export function useSavedLists({ snapshot, load, reset, user, local, cloud }) {
  const savedLists = ref([])
  const currentId = ref(null)
  const listName = ref('')
  const error = ref('')

  let store = local
  let connection = 0

  const current = computed(() => savedLists.value.find(l => l.id === currentId.value) ?? null)

  // Whether the list on screen differs from its saved copy
  const dirty = computed(() => current.value
    ? listName.value !== current.value.name ||
      JSON.stringify(snapshot()) !== JSON.stringify(current.value.list)
    : snapshot().entries.length > 0
  )

  const newestFirst = lists => [...lists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  async function connect(account) {
    const token = ++connection
    store = account ? cloud(account.uid) : local
    error.value = ''
    try {
      if (account) {
        for (const saved of await local.list()) {
          await store.put(saved)
          await local.remove(saved.id)
        }
      }
      const lists = await store.list()
      if (token !== connection) return
      savedLists.value = newestFirst(lists)
    } catch {
      if (token !== connection) return
      savedLists.value = []
      error.value = 'Couldn\'t load your saved lists.'
    }
    // A list that isn't in this store stays on screen, now unsaved
    if (!current.value) currentId.value = null
  }

  watch(() => user.value?.uid, () => connect(user.value), { immediate: true })

  // Overwrites the open list, or creates one when nothing is open
  async function save() {
    const saved = {
      id: currentId.value ?? crypto.randomUUID(),
      name: listName.value.trim() || 'Untitled list',
      updatedAt: new Date().toISOString(),
      list: snapshot(),
    }
    try {
      await store.put(saved)
    } catch {
      error.value = 'Couldn\'t save the list.'
      return
    }
    error.value = ''
    savedLists.value = [saved, ...savedLists.value.filter(l => l.id !== saved.id)]
    currentId.value = saved.id
    listName.value = saved.name
  }

  // A list that can't be loaded (saved in a format since changed) still
  // becomes the open one, so it can be deleted
  function open(id) {
    const saved = savedLists.value.find(l => l.id === id)
    if (!saved) return
    let loaded = false
    try {
      loaded = load(saved.list)
    } catch {
      // falls through to the error below
    }
    if (!loaded) reset()
    error.value = loaded ? '' : 'This list couldn\'t be opened.'
    currentId.value = saved.id
    listName.value = saved.name
  }

  function newList() {
    reset()
    currentId.value = null
    listName.value = ''
  }

  // Deletes the saved copy; the list on screen stays, now unsaved
  async function removeSaved() {
    const id = currentId.value
    try {
      await store.remove(id)
    } catch {
      error.value = 'Couldn\'t delete the list.'
      return
    }
    error.value = ''
    savedLists.value = savedLists.value.filter(l => l.id !== id)
    currentId.value = null
  }

  return { savedLists, currentId, listName, dirty, error, save, open, newList, removeSaved }
}
