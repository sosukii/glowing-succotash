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
  root: 'flex flex-col h-full',
  toolbar: 'flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 flex-wrap',
  modeLabel: 'text-[13px] text-gray-500 font-medium',
  modeName: {
    base: 'font-semibold transition-colors duration-200',
    view: 'text-blue-600',
    edit: 'text-amber-600',
  },
  toolbarActions: 'flex gap-2 flex-1',
  modeToggle: 'flex border border-gray-300 rounded-lg overflow-hidden ml-auto',
  toggleBtn: {
    base: 'px-4 py-1.5 text-[13px] font-medium bg-transparent border-0 cursor-pointer text-gray-500 transition-all duration-200 whitespace-nowrap hover:bg-gray-100',
    active: 'bg-blue-600 text-white hover:bg-blue-600',
  },
  btn: {
    base: 'px-3.5 py-1.5 text-[13px] font-medium rounded-md border border-transparent cursor-pointer transition-all duration-150',
    primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
    secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
  },
  grid: 'flex-1 min-h-0 overflow-hidden ag-theme-alpine',
  dialogOverlay: 'fixed inset-0 bg-black/35 flex items-center justify-center z-[1000]',
  dialogInner: 'dialog-inner bg-white rounded-xl p-7 w-96 max-w-[90vw] shadow-[0_20px_40px_rgba(0,0,0,0.15)]',
  dialogTitle: 'mt-0 mb-2 text-base font-bold text-gray-900',
  dialogParent: 'mb-4 text-[13px] text-gray-500',
  dialogInput: 'w-full box-border h-10 px-3 border-[1.5px] border-gray-300 rounded-lg text-sm font-[inherit] text-gray-900 outline-none mb-4 transition-colors duration-150 focus:border-blue-600',
  dialogActions: 'flex gap-2.5 justify-end',
  // cell renderer classes — used both in template and DOM API
  cell: {
    category: 'flex items-center gap-1.5 h-full',
    name: 'flex items-center gap-2 h-full w-full',
    numCol: '!text-gray-400 !text-xs !font-medium',
    input: 'flex-1 min-w-0 h-8 px-2.5 border-[1.5px] border-gray-300 rounded-md text-[13px] font-[inherit] text-gray-900 bg-white outline-none transition-colors duration-150 focus:border-blue-600',
  },
  chevron: {
    base: 'tree-chevron inline-flex items-center justify-center w-6 h-6 border-0 bg-transparent cursor-pointer rounded text-gray-500 p-0 flex-shrink-0 transition-colors duration-150 hover:bg-gray-100',
    open: 'tree-chevron--open',
  },
  typeLabel: {
    base: 'text-[13px]',
    group: 'font-bold text-gray-900',
    item: 'font-normal text-gray-700',
  },
  actionBtn: {
    base: 'tree-action-btn inline-flex items-center justify-center w-6 h-6 border-0 bg-transparent cursor-pointer rounded text-gray-500 p-0 flex-shrink-0 opacity-0 transition-all duration-150 hover:bg-gray-100',
    delete: 'hover:!bg-red-100 hover:!text-red-600',
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
    span.className = 'text-[13px] text-gray-700'
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
    cellClass: classes.cell.numCol,
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

    <Transition name="dialog-fade">
      <div v-if="addingChildFor !== null" :class="classes.dialogOverlay" @click.self="cancelAdd">
        <div :class="classes.dialogInner">
          <h3 :class="classes.dialogTitle">Добавить дочерний элемент</h3>
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
