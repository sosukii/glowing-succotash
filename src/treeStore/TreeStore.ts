export interface TreeItem {
  id: string | number
  parent: string | number | null
  label: string
  [key: string]: unknown
}

const ROOT = '__root__' as const

export class TreeStore {
  private itemMap: Map<string | number, TreeItem> = new Map()
  private childrenMap: Map<string | number | typeof ROOT, Array<string | number>> = new Map()

  constructor(items: TreeItem[]) {
    for (const item of items) {
      this._register(item)
    }
  }

  private _register(item: TreeItem): void {
    this.itemMap.set(item.id, { ...item })
    const pk = item.parent ?? ROOT
    if (!this.childrenMap.has(pk)) this.childrenMap.set(pk, [])
    this.childrenMap.get(pk)!.push(item.id)
  }

  private _unlink(id: string | number, parent: string | number | null): void {
    const pk = parent ?? ROOT
    const siblings = this.childrenMap.get(pk) ?? []
    const next = siblings.filter((s) => s !== id)
    if (next.length > 0) this.childrenMap.set(pk, next)
    else this.childrenMap.delete(pk)
  }
}
