<script setup lang="ts">
import { ref, computed, shallowRef, nextTick, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import type { ColDef, GridApi, GridReadyEvent, GridOptions, ICellRendererParams } from 'ag-grid-community'
import { TreeStore } from '../treeStore/TreeStore'

const props = defineProps<{
  store: TreeStore
}>()

const emit = defineEmits<{
  (e: 'update:store', store: TreeStore): void
}>()

const classes = {
  root: 'tree-table',
  toolbar: 'tree-table__toolbar',
  modeLabel: 'tree-table__mode-label',
  modeName: {
    base: 'tree-table__mode-name',
    view: 'tree-table__mode-name--view',
    edit: 'tree-table__mode-name--edit',
  },
  toolbarActions: 'tree-table__toolbar-actions',
  modeToggle: 'tree-table__mode-toggle',
  toggleBtn: {
    base: 'tree-table__toggle-btn',
    active: 'tree-table__toggle-btn--active',
  },
  btn: {
    base: 'tree-table__btn',
    primary: 'tree-table__btn--primary',
    secondary: 'tree-table__btn--secondary',
  },
  grid: 'tree-table__grid ag-theme-alpine',
  dialogOverlay: 'tree-table__dialog-overlay',
  dialog: 'tree-table__dialog',
  dialogParent: 'tree-table__dialog-parent',
  dialogInput: 'tree-table__dialog-input',
  dialogActions: 'tree-table__dialog-actions',
  // cell renderer classes (used both in template and DOM API)
  cell: {
    category: 'tree-table__cell-category',
    name: 'tree-table__cell-name',
    num: 'tree-table__cell-num',
    input: 'tree-table__cell-input',
  },
  chevron: {
    base: 'tree-table__chevron',
    open: 'tree-table__chevron--open',
  },
  typeLabel: {
    base: 'tree-table__type-label',
    group: 'tree-table__type-label--group',
    item: 'tree-table__type-label--item',
  },
  actionBtn: {
    base: 'tree-table__action-btn',
    delete: 'tree-table__action-btn--delete',
  },
}

const gridApi = shallowRef<GridApi | null>(null)
const editMode = ref(false)
const expandedIds = ref<Set<string | number>>(new Set([1]))
const addingChildFor = ref<string | number | null>(null)
const newItemLabel = ref('')
const dialogInput = ref<HTMLInputElement | null>(null)

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api }

const rowData = computed(() => props.store.getVisibleRows(expandedIds.value))

function toggleExpand(id: string | number) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function expandAll() { expandedIds.value = new Set(props.store.getAll().map((i) => i.id)) }
function collapseAll() { expandedIds.value = new Set() }

function setMode(edit: boolean) {
  editMode.value = edit
  void nextTick(() => gridApi.value?.refreshCells({ force: true }))
}

watch(editMode, () => void nextTick(() => gridApi.value?.refreshCells({ force: true })))

function cloneStore() { return new TreeStore(props.store.getAll().map((i) => ({ ...i }))) }

function addRootItem() {
  const id = props.store.generateId()
  const s = cloneStore()
  s.addItem({ id, parent: null, label: `Новый элемент ${id}` })
  emit('update:store', s)
}

function startAddChild(parentId: string | number) {
  addingChildFor.value = parentId
  newItemLabel.value = ''
  void nextTick(() => dialogInput.value?.focus())
}

function confirmAdd() {
  if (addingChildFor.value === null) return
  const id = props.store.generateId()
  const s = cloneStore()
  s.addItem({ id, parent: addingChildFor.value, label: newItemLabel.value.trim() || 'Новый элемент' })
  const next = new Set(expandedIds.value)
  next.add(addingChildFor.value)
  expandedIds.value = next
  emit('update:store', s)
  addingChildFor.value = null
  newItemLabel.value = ''
}

function cancelAdd() {
  addingChildFor.value = null
  newItemLabel.value = ''
}

function removeItem(id: string | number) {
  const s = cloneStore()
  s.removeItem(id)
  const next = new Set(expandedIds.value)
  next.delete(id)
  expandedIds.value = next
  emit('update:store', s)
}

function updateLabel(id: string | number, label: string) {
  const item = props.store.getItem(id)
  if (!item) return
  const s = cloneStore()
  s.updateItem({ ...item, label })
  emit('update:store', s)
}

function buildCategoryRenderer(params: ICellRendererParams) {
  const row = params.data
  const isEdit = editMode.value

  const wrapper = document.createElement('div')
  wrapper.className = classes.cell.category
  wrapper.style.paddingLeft = `${row._depth * 18}px`

  if (row._hasChildren) {
    const chevron = document.createElement('button')
    chevron.className = row._expanded
      ? `${classes.chevron.base} ${classes.chevron.open}`
      : classes.chevron.base
    chevron.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
    chevron.addEventListener('click', (e) => { e.stopPropagation(); toggleExpand(row.id) })
    wrapper.appendChild(chevron)
  } else {
    const sp = document.createElement('span')
    sp.style.cssText = 'display:inline-block;width:24px'
    wrapper.appendChild(sp)
  }

  const lbl = document.createElement('span')
  lbl.className = row._hasChildren
    ? `${classes.typeLabel.base} ${classes.typeLabel.group}`
    : `${classes.typeLabel.base} ${classes.typeLabel.item}`
  lbl.textContent = row._hasChildren ? 'Группа' : 'Элемент'
  wrapper.appendChild(lbl)

  if (isEdit) {
    const addBtn = document.createElement('button')
    addBtn.className = classes.actionBtn.base
    addBtn.title = 'Добавить дочерний'
    addBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2V10M2 6H10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`
    addBtn.addEventListener('click', (e) => { e.stopPropagation(); startAddChild(row.id) })
    wrapper.appendChild(addBtn)
  }

  return wrapper
}

function buildNameRenderer(params: ICellRendererParams) {
  const row = params.data
  const wrapper = document.createElement('div')
  wrapper.className = classes.cell.name

  if (editMode.value) {
    const input = document.createElement('input')
    input.className = classes.cell.input
    input.value = row.label
    let saved = row.label

    input.addEventListener('blur', () => {
      const v = input.value.trim()
      if (v && v !== saved) { saved = v; updateLabel(row.id, v) }
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur()
      if (e.key === 'Escape') { input.value = saved; input.blur() }
    })
    wrapper.appendChild(input)

    const del = document.createElement('button')
    del.className = `${classes.actionBtn.base} ${classes.actionBtn.delete}`
    del.title = 'Удалить'
    del.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`
    del.addEventListener('click', (e) => {
      e.stopPropagation()
      if (confirm(`Удалить "${row.label}"?`)) removeItem(row.id)
    })
    wrapper.appendChild(del)
  } else {
    const span = document.createElement('span')
    span.textContent = row.label
    wrapper.appendChild(span)
  }

  return wrapper
}

const columnDefs = computed<ColDef[]>(() => [
  {
    headerName: '№ п/п',
    width: 80,
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    cellClass: classes.cell.num,
    sortable: false,
    resizable: false,
  },
  {
    headerName: 'Категория',
    flex: 1,
    minWidth: 160,
    cellRenderer: buildCategoryRenderer,
    sortable: false,
  },
  {
    headerName: 'Наименование',
    flex: 2,
    minWidth: 200,
    cellRenderer: buildNameRenderer,
    sortable: false,
  },
])

const gridOptions: GridOptions = {
  animateRows: true,
  suppressMovableColumns: true,
  suppressCellFocus: true,
  rowHeight: 48,
  headerHeight: 48,
  getRowId: (p) => String(p.data.id),
  onRowClicked: (e) => { if (e.data._hasChildren) toggleExpand(e.data.id) },
  rowStyle: { cursor: 'pointer' },
}
</script>

<template>
  <div :class="classes.root">
    <div :class="classes.toolbar">
      <span :class="classes.modeLabel">
        Режим:
        <span :class="[classes.modeName.base, editMode ? classes.modeName.edit : classes.modeName.view]">
          {{ editMode ? 'редактирование' : 'просмотр' }}
        </span>
      </span>

      <div :class="classes.toolbarActions">
        <button v-if="editMode" :class="[classes.btn.base, classes.btn.secondary]" @click="expandAll">Развернуть все</button>
        <button v-if="editMode" :class="[classes.btn.base, classes.btn.secondary]" @click="collapseAll">Свернуть все</button>
        <button v-if="editMode" :class="[classes.btn.base, classes.btn.primary]" @click="addRootItem">+ Добавить элемент</button>
      </div>

      <div :class="classes.modeToggle">
        <button :class="[classes.toggleBtn.base, { [classes.toggleBtn.active]: !editMode }]" @click="setMode(false)">Просмотр</button>
        <button :class="[classes.toggleBtn.base, { [classes.toggleBtn.active]: editMode }]" @click="setMode(true)">Редактирование</button>
      </div>
    </div>

    <div :class="classes.grid">
      <ag-grid-vue
        style="width: 100%; height: 100%"
        :columnDefs="columnDefs"
        :rowData="rowData"
        :gridOptions="gridOptions"
        @grid-ready="onGridReady"
      />
    </div>

    <Transition name="tree-table__dialog-fade">
      <div v-if="addingChildFor !== null" :class="classes.dialogOverlay" @click.self="cancelAdd">
        <div :class="classes.dialog">
          <h3>Добавить дочерний элемент</h3>
          <p :class="classes.dialogParent">
            Родитель: <strong>{{ store.getItem(addingChildFor)?.label }}</strong>
          </p>
          <input
            ref="dialogInput"
            v-model="newItemLabel"
            :class="classes.dialogInput"
            placeholder="Наименование..."
            @keyup.enter="confirmAdd"
            @keyup.escape="cancelAdd"
          />
          <div :class="classes.dialogActions">
            <button :class="[classes.btn.base, classes.btn.secondary]" @click="cancelAdd">Отмена</button>
            <button :class="[classes.btn.base, classes.btn.primary]" @click="confirmAdd">Добавить</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tree-table {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tree-table__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e8ed;
  flex-wrap: wrap;
}

.tree-table__mode-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.tree-table__mode-name {
  font-weight: 600;
  transition: color 0.25s;
}
.tree-table__mode-name--view { color: #2563eb; }
.tree-table__mode-name--edit { color: #d97706; }

.tree-table__toolbar-actions {
  display: flex;
  gap: 8px;
  flex: 1;
}

.tree-table__mode-toggle {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  margin-left: auto;
}

.tree-table__toggle-btn {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #6b7280;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}
.tree-table__toggle-btn--active { background: #2563eb; color: #fff; }
.tree-table__toggle-btn:hover:not(.tree-table__toggle-btn--active) { background: #f3f4f6; }

.tree-table__btn {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.tree-table__btn--primary { background: #2563eb; color: #fff; border-color: #2563eb; }
.tree-table__btn--primary:hover { background: #1d4ed8; }
.tree-table__btn--secondary { background: #fff; color: #374151; border-color: #d1d5db; }
.tree-table__btn--secondary:hover { background: #f9fafb; }

.tree-table__grid {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tree-table__dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.tree-table__dialog {
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  width: 380px;
  max-width: 90vw;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.tree-table__dialog h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.tree-table__dialog-parent {
  margin: 0 0 16px;
  font-size: 13px;
  color: #6b7280;
}

.tree-table__dialog-input {
  width: 100%;
  box-sizing: border-box;
  height: 40px;
  padding: 0 12px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #111827;
  outline: none;
  margin-bottom: 16px;
  transition: border-color 0.15s;
}
.tree-table__dialog-input:focus { border-color: #2563eb; }

.tree-table__dialog-actions { display: flex; gap: 10px; justify-content: flex-end; }

.tree-table__dialog-fade-enter-active,
.tree-table__dialog-fade-leave-active { transition: opacity 0.2s; }
.tree-table__dialog-fade-enter-from,
.tree-table__dialog-fade-leave-to { opacity: 0; }
.tree-table__dialog-fade-enter-active .tree-table__dialog,
.tree-table__dialog-fade-leave-active .tree-table__dialog { transition: transform 0.2s; }
.tree-table__dialog-fade-enter-from .tree-table__dialog,
.tree-table__dialog-fade-leave-to .tree-table__dialog { transform: scale(0.95) translateY(8px); }
</style>

<style>
.tree-table__cell-category { display: flex; align-items: center; gap: 6px; height: 100%; }
.tree-table__cell-name { display: flex; align-items: center; gap: 8px; height: 100%; width: 100%; }
.tree-table__cell-name span { font-size: 13px; color: #374151; }

.tree-table__chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: #6b7280;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.15s;
}
.tree-table__chevron:hover { background: #f3f4f6; }
.tree-table__chevron svg { transition: transform 0.2s; transform: rotate(-90deg); }
.tree-table__chevron--open svg { transform: rotate(0deg); }

.tree-table__type-label { font-size: 13px; }
.tree-table__type-label--group { font-weight: 700; color: #111827; }
.tree-table__type-label--item { font-weight: 400; color: #374151; }

.tree-table__cell-num { color: #9ca3af !important; font-size: 12px !important; font-weight: 500 !important; }

.tree-table__cell-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border: 1.5px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: #111827;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}
.tree-table__cell-input:focus { border-color: #2563eb; }

.tree-table__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: #6b7280;
  padding: 0;
  flex-shrink: 0;
  opacity: 0;
  transition: background 0.15s, opacity 0.15s;
}
.ag-row:hover .tree-table__action-btn,
.tree-table__action-btn:focus { opacity: 1; }
.tree-table__action-btn:hover { background: #f3f4f6; }
.tree-table__action-btn--delete:hover { background: #fee2e2; color: #dc2626; }

.ag-theme-alpine {
  --ag-font-family: inherit;
  --ag-font-size: 13px;
  --ag-row-border-color: #f3f4f6;
  --ag-header-background-color: #f9fafb;
  --ag-header-foreground-color: #374151;
  --ag-border-color: #e5e8ed;
  --ag-cell-horizontal-padding: 16px;
  --ag-row-hover-color: #f8faff;
}
.ag-theme-alpine .ag-header-cell-label {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
