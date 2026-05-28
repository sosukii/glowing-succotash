<template>
  <div class="app">
    <header class="app-header">
      <div class="app-header-inner">
        <svg class="logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L3 8.5V15.5L12 21L21 15.5V8.5L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M12 3V21M3 8.5L21 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <h1>TreeStore</h1>
      </div>
    </header>
    <main class="app-main">
      <TreeTable :store="store" @update:store="onStoreUpdate" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
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

const store = shallowRef(new TreeStore(initialItems))
function onStoreUpdate(newStore: TreeStore) { store.value = newStore }
</script>

<style>
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f0f2f6; color: #111827; -webkit-font-smoothing: antialiased; }
#app { height: 100%; }
button { font-family: inherit; }
</style>
<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; }
.app-header { background: #fff; border-bottom: 1px solid #e5e8ed; padding: 0 24px; height: 56px; display: flex; align-items: center; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.app-header-inner { display: flex; align-items: center; gap: 10px; }
.logo { width: 28px; height: 28px; color: #2563eb; }
h1 { margin: 0; font-size: 18px; font-weight: 700; color: #111827; letter-spacing: -0.02em; }
.app-main { flex: 1; min-height: 0; padding: 20px; display: flex; flex-direction: column; }
.app-main :deep(.tree-table-root) { background: #fff; border-radius: 12px; border: 1px solid #e5e8ed; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); height: 100%; }
</style>
