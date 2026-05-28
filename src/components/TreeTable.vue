<template>
  <div class="tree-table-root">
    <div class="toolbar">
      <span class="mode-label">
        Режим:
        <span class="mode-name" :class="editMode ? 'mode-edit' : 'mode-view'">
          {{ editMode ? 'редактирование' : 'просмотр' }}
        </span>
      </span>
      <div class="toolbar-actions">
        <button v-if="editMode" class="btn btn-secondary" @click="expandAll">Развернуть все</button>
        <button v-if="editMode" class="btn btn-secondary" @click="collapseAll">Свернуть все</button>
      </div>
      <div class="mode-toggle">
        <button class="toggle-btn" :class="{ active: !editMode }" @click="setMode(false)">Просмотр</button>
        <button class="toggle-btn" :class="{ active: editMode }"  @click="setMode(true)">Редактирование</button>
      </div>
    </div>
    <div class="grid-wrapper ag-theme-alpine">
      <ag-grid-vue
        style="width: 100%; height: 100%"
        :columnDefs="columnDefs"
        :rowData="rowData"
        :gridOptions="gridOptions"
        @grid-ready="onGridReady"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, nextTick, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import type { ColDef, GridApi, GridReadyEvent, GridOptions, ICellRendererParams } from 'ag-grid-community'
import { TreeStore } from '../treeStore/TreeStore'

interface Props { store: TreeStore }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'update:store', store: TreeStore): void }>()

const gridApi = shallowRef<GridApi | null>(null)
const editMode = ref(false)
const expandedIds = ref<Set<string | number>>(new Set([1]))

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api }
const rowData = computed(() => props.store.getVisibleRows(expandedIds.value))

function toggleExpand(id: string | number) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  expandedIds.value = next
}
function expandAll() { expandedIds.value = new Set(props.store.getAll().map((i) => i.id)) }
function collapseAll() { expandedIds.value = new Set() }
function setMode(edit: boolean) { editMode.value = edit; nextTick(() => gridApi.value?.refreshCells({ force: true })) }
watch(editMode, () => nextTick(() => gridApi.value?.refreshCells({ force: true })))

function cloneStore() { return new TreeStore(props.store.getAll().map((i) => ({ ...i }))) }

function removeItem(id: string | number) {
  const newStore = cloneStore()
  newStore.removeItem(id)
  const next = new Set(expandedIds.value); next.delete(id); expandedIds.value = next
  emit('update:store', newStore)
}

function updateLabel(id: string | number, label: string) {
  const item = props.store.getItem(id); if (!item) return
  const newStore = cloneStore(); newStore.updateItem({ ...item, label }); emit('update:store', newStore)
}

function buildCategoryRenderer(params: ICellRendererParams) {
  const row = params.data
  const wrapper = document.createElement('div')
  wrapper.className = 'cell-category'
  wrapper.style.paddingLeft = `${row._depth * 18}px`
  if (row._hasChildren) {
    const chevron = document.createElement('button')
    chevron.className = 'chevron' + (row._expanded ? ' expanded' : '')
    chevron.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    chevron.addEventListener('click', (e) => { e.stopPropagation(); toggleExpand(row.id) })
    wrapper.appendChild(chevron)
  } else {
    const sp = document.createElement('span'); sp.style.cssText = 'display:inline-block;width:24px'; wrapper.appendChild(sp)
  }
  const lbl = document.createElement('span')
  lbl.className = row._hasChildren ? 'type-label type-group' : 'type-label type-item'
  lbl.textContent = row._hasChildren ? 'Группа' : 'Элемент'
  wrapper.appendChild(lbl)
  return wrapper
}

function buildNameRenderer(params: ICellRendererParams) {
  const row = params.data
  const wrapper = document.createElement('div')
  wrapper.className = 'cell-name'
  if (editMode.value) {
    const input = document.createElement('input')
    input.className = 'cell-input'; input.value = row.label
    let saved = row.label
    input.addEventListener('blur', () => { const v = input.value.trim(); if (v && v !== saved) { saved = v; updateLabel(row.id, v) } })
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = saved; input.blur() } })
    wrapper.appendChild(input)
    const del = document.createElement('button')
    del.className = 'cell-action-btn cell-delete-btn'; del.title = 'Удалить'
    del.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
    del.addEventListener('click', (e) => { e.stopPropagation(); if (confirm(`Удалить "${row.label}" и все дочерние элементы?`)) removeItem(row.id) })
    wrapper.appendChild(del)
  } else {
    const span = document.createElement('span'); span.textContent = row.label; wrapper.appendChild(span)
  }
  return wrapper
}

const columnDefs = computed<ColDef[]>(() => [
  { headerName: '№ п/п', width: 80, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, cellClass: 'cell-num', sortable: false, resizable: false },
  { headerName: 'Категория', flex: 1, minWidth: 160, cellRenderer: buildCategoryRenderer, sortable: false },
  { headerName: 'Наименование', flex: 2, minWidth: 200, cellRenderer: buildNameRenderer, sortable: false },
])

const gridOptions: GridOptions = {
  animateRows: true, suppressMovableColumns: true, suppressCellFocus: true,
  rowHeight: 48, headerHeight: 48, getRowId: (p) => String(p.data.id),
}
</script>

<style scoped>
.tree-table-root { display: flex; flex-direction: column; height: 100%; }
.toolbar { display: flex; align-items: center; gap: 12px; padding: 12px 20px; background: #fff; border-bottom: 1px solid #e5e8ed; flex-wrap: wrap; }
.mode-label { font-size: 13px; color: #6b7280; font-weight: 500; }
.mode-name { font-weight: 600; transition: color 0.25s ease; }
.mode-view { color: #2563eb; } .mode-edit { color: #d97706; }
.toolbar-actions { display: flex; gap: 8px; flex: 1; }
.mode-toggle { display: flex; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; margin-left: auto; }
.toggle-btn { padding: 6px 16px; font-size: 13px; font-weight: 500; background: transparent; border: none; cursor: pointer; color: #6b7280; transition: background 0.2s, color 0.2s; white-space: nowrap; }
.toggle-btn.active { background: #2563eb; color: #fff; }
.toggle-btn:hover:not(.active) { background: #f3f4f6; }
.btn { padding: 6px 14px; font-size: 13px; font-weight: 500; border-radius: 6px; border: 1px solid transparent; cursor: pointer; transition: all 0.15s; }
.btn-secondary { background: #fff; color: #374151; border-color: #d1d5db; }
.btn-secondary:hover { background: #f9fafb; }
.grid-wrapper { flex: 1; min-height: 0; overflow: hidden; }
</style>

<style>
.cell-category { display: flex; align-items: center; gap: 6px; height: 100%; }
.cell-name { display: flex; align-items: center; gap: 8px; height: 100%; width: 100%; }
.cell-name span { font-size: 13px; color: #374151; }
.chevron { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: none; background: transparent; cursor: pointer; border-radius: 4px; color: #6b7280; padding: 0; flex-shrink: 0; transition: background 0.15s; }
.chevron:hover { background: #f3f4f6; }
.chevron svg { transition: transform 0.2s; transform: rotate(-90deg); }
.chevron.expanded svg { transform: rotate(0deg); }
.type-label { font-size: 13px; } .type-group { font-weight: 700; color: #111827; } .type-item { font-weight: 400; color: #374151; }
.cell-num { color: #9ca3af !important; font-size: 12px !important; font-weight: 500 !important; }
.cell-input { flex: 1; min-width: 0; height: 32px; padding: 0 10px; border: 1.5px solid #d1d5db; border-radius: 6px; font-size: 13px; font-family: inherit; color: #111827; background: #fff; outline: none; transition: border-color 0.15s; }
.cell-input:focus { border-color: #2563eb; }
.cell-action-btn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: none; background: transparent; cursor: pointer; border-radius: 4px; color: #6b7280; padding: 0; flex-shrink: 0; opacity: 0; transition: background 0.15s, opacity 0.15s; }
.ag-row:hover .cell-action-btn, .cell-action-btn:focus { opacity: 1; }
.cell-action-btn:hover { background: #f3f4f6; }
.cell-delete-btn:hover { background: #fee2e2; color: #dc2626; }
.ag-theme-alpine { --ag-font-family: inherit; --ag-font-size: 13px; --ag-row-border-color: #f3f4f6; --ag-header-background-color: #f9fafb; --ag-header-foreground-color: #374151; --ag-border-color: #e5e8ed; --ag-cell-horizontal-padding: 16px; --ag-row-hover-color: #f8faff; }
.ag-theme-alpine .ag-header-cell-label { font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
</style>
