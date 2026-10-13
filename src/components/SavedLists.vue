<script setup>
defineProps({
  savedLists: Array,
  currentId: String,
  name: String,
  dirty: Boolean,
  user: Object,
  error: String,
})

const emit = defineEmits(['update:name', 'open', 'new', 'save', 'delete', 'sign-in', 'sign-out'])

function select(id) {
  if (id) emit('open', id)
  else emit('new')
}

function confirmDelete() {
  if (window.confirm('Delete this saved list?')) emit('delete')
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <select
      :value="currentId ?? ''"
      aria-label="Saved lists"
      class="px-3 py-1.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      @change="select($event.target.value)"
    >
      <option value="">New list</option>
      <option v-for="saved in savedLists" :key="saved.id" :value="saved.id">{{ saved.name }}</option>
    </select>

    <input
      type="text"
      :value="name"
      placeholder="List name"
      maxlength="100"
      aria-label="List name"
      class="w-64 px-3 py-1.5 rounded-md border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      @input="emit('update:name', $event.target.value)"
    />

    <button
      class="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
      @click="emit('save')"
    >
      Save
    </button>

    <button
      v-if="currentId"
      class="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
      @click="confirmDelete"
    >
      Delete
    </button>

    <span v-if="error" class="text-sm text-destructive">{{ error }}</span>
    <span v-else-if="dirty" class="text-sm text-muted-foreground">Unsaved changes</span>

    <div class="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
      <template v-if="user">
        <span>{{ user.name }}</span>
        <button
          class="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
          @click="emit('sign-out')"
        >
          Sign out
        </button>
      </template>
      <template v-else>
        <span>Lists are saved in this browser only</span>
        <button
          class="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
          @click="emit('sign-in')"
        >
          Sign in with Google
        </button>
      </template>
    </div>
  </div>
</template>
