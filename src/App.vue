<template>
  <div class="app">
    <header class="app-header">
      <div class="app-header-inner"><h1>TreeStore</h1></div>
    </header>
    <main class="app-main">
      <TreeTable :store="store" @update:store="onStoreUpdate" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TreeTable from './components/TreeTable.vue'
import { TreeStore, type TreeItem } from './treeStore/TreeStore'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

const initialItems: TreeItem[] = [
  { id: 1, parent: null, label: 'Айтем 1' },
  { id: 2, parent: 1,    label: 'Айтем 2' },
  { id: 3, parent: 1,    label: 'Айтем 3' },
  { id: 4, parent: 2,    label: 'Айтем 4' },
  { id: 5, parent: 2,    label: 'Айтем 5' },
  { id: 6, parent: 2,    label: 'Айтем 6' },
  { id: 7, parent: 4,    label: 'Айтем 7' },
  { id: 8, parent: 4,    label: 'Айтем 8' },
]

const store = ref(new TreeStore(initialItems))
function onStoreUpdate(newStore: TreeStore) { store.value = newStore }
</script>

<style>
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; height: 100%;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #f0f2f6; -webkit-font-smoothing: antialiased;
}
#app { height: 100%; }
button { font-family: inherit; }
</style>

<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; }
.app-header {
  background: #fff; border-bottom: 1px solid #e5e8ed;
  padding: 0 24px; height: 56px; display: flex; align-items: center; flex-shrink: 0;
}
h1 { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }
.app-main { flex: 1; min-height: 0; padding: 20px; display: flex; flex-direction: column; }
.app-main :deep(.tree-table-root) {
  background: #fff; border-radius: 12px; border: 1px solid #e5e8ed;
  overflow: hidden; height: 100%;
}
</style>
