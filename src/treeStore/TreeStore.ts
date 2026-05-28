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

  getAll(): TreeItem[] {
    return Array.from(this.itemMap.values())
  }

  getItem(id: string | number): TreeItem | undefined {
    return this.itemMap.get(id)
  }

  getChildren(id: string | number): TreeItem[] {
    return (this.childrenMap.get(id) ?? [])
      .map((cid) => this.itemMap.get(cid)!)
      .filter(Boolean)
  }

  getAllChildren(id: string | number): TreeItem[] {
    const result: TreeItem[] = []
    const queue: Array<string | number> = [...(this.childrenMap.get(id) ?? [])]
    while (queue.length > 0) {
      const cid = queue.shift()!
      const item = this.itemMap.get(cid)
      if (!item) continue
      result.push(item)
      queue.push(...(this.childrenMap.get(cid) ?? []))
    }
    return result
  }

  getAllParents(id: string | number): TreeItem[] {
    const result: TreeItem[] = []
    let current = this.itemMap.get(id)
    while (current?.parent !== null && current?.parent !== undefined) {
      const parent = this.itemMap.get(current.parent)
      if (!parent) break
      result.push(parent)
      current = parent
    }
    return result
  }

  hasChildren(id: string | number): boolean {
    return (this.childrenMap.get(id)?.length ?? 0) > 0
  }

  getRoots(): TreeItem[] {
    return (this.childrenMap.get(ROOT) ?? [])
      .map((id) => this.itemMap.get(id)!)
      .filter(Boolean)
  }

  addItem(item: TreeItem): void {
    if (this.itemMap.has(item.id)) {
      throw new Error(`TreeStore: item with id "${item.id}" already exists`)
    }
    this._register(item)
  }

  removeItem(id: string | number): Array<string | number> {
    const item = this.itemMap.get(id)
    if (!item) return []
    const descendants = this.getAllChildren(id)
    const toRemove: TreeItem[] = [item, ...descendants]
    for (const r of toRemove) {
      this._unlink(r.id, r.parent)
      this.childrenMap.delete(r.id)
      this.itemMap.delete(r.id)
    }
    return toRemove.map((r) => r.id)
  }

  updateItem(item: TreeItem): void {
    const existing = this.itemMap.get(item.id)
    if (!existing) {
      throw new Error(`TreeStore: item with id "${item.id}" not found`)
    }
    if (existing.parent !== item.parent) {
      this._unlink(item.id, existing.parent)
      const newPk = item.parent ?? ROOT
      if (!this.childrenMap.has(newPk)) this.childrenMap.set(newPk, [])
      this.childrenMap.get(newPk)!.push(item.id)
    }
    this.itemMap.set(item.id, { ...item })
  }

  generateId(): number {
    let id = this.itemMap.size + 1
    while (this.itemMap.has(id)) id++
    return id
  }
}
