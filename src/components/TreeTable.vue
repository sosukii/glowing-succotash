<template>
  <div class="tree-table-root">
    <div class="toolbar">
      <span class="mode-label">Режим: <span class="mode-view">просмотр</span></span>
    </div>
    <div class="grid-wrapper ag-theme-alpine">
      <ag-grid-vue
        style="width: 100%; height: 100%"
        :columnDefs="columnDefs"
        :rowData="rowData"
        :gridOptions="gridOptions"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import type { ColDef, GridOptions } from 'ag-grid-community'
import { TreeStore } from '../treeStore/TreeStore'

interface Props { store: TreeStore }
const props = defineProps<Props>()

const rowData = computed(() => props.store.getVisibleRows(new Set([1, 2, 4])))

const columnDefs: ColDef[] = [
  { headerName: '№ п/п', width: 80, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, sortable: false },
  { headerName: 'Категория', flex: 1, valueGetter: (p) => p.data._hasChildren ? 'Группа' : 'Элемент', sortable: false },
  { headerName: 'Наименование', flex: 2, field: 'label', sortable: false },
]

const gridOptions: GridOptions = {
  animateRows: true, suppressMovableColumns: true,
  rowHeight: 48, headerHeight: 48,
  getRowId: (p) => String(p.data.id),
}
</script>

<style scoped>
.tree-table-root { display: flex; flex-direction: column; height: 100%; }
.toolbar {
  display: flex; align-items: center; padding: 12px 20px;
  background: #fff; border-bottom: 1px solid #e5e8ed;
}
.mode-label { font-size: 13px; color: #6b7280; font-weight: 500; }
.mode-view { font-weight: 600; color: #2563eb; }
.grid-wrapper { flex: 1; min-height: 0; overflow: hidden; }
</style>

<style>
.ag-theme-alpine {
  --ag-font-family: inherit; --ag-font-size: 13px;
  --ag-row-border-color: #f3f4f6; --ag-header-background-color: #f9fafb;
  --ag-header-foreground-color: #374151; --ag-border-color: #e5e8ed;
  --ag-cell-horizontal-padding: 16px;
}
.ag-theme-alpine .ag-header-cell-label {
  font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em;
}
</style>
