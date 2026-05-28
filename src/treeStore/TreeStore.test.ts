import { describe, it, expect, beforeEach } from 'vitest'
import { TreeStore } from './TreeStore'

const sampleItems = [
  { id: 1, parent: null, label: 'Айтем 1' },
  { id: 2, parent: 1,    label: 'Айтем 2' },
  { id: 3, parent: 1,    label: 'Айтем 3' },
  { id: 4, parent: 2,    label: 'Айтем 4' },
  { id: 5, parent: 2,    label: 'Айтем 5' },
  { id: 6, parent: 2,    label: 'Айтем 6' },
  { id: 7, parent: 4,    label: 'Айтем 7' },
  { id: 8, parent: 4,    label: 'Айтем 8' },
]

describe('TreeStore', () => {
  let store: TreeStore
  beforeEach(() => { store = new TreeStore(sampleItems.map((i) => ({ ...i }))) })

  describe('getAll()', () => {
    it('returns all 8 items', () => { expect(store.getAll()).toHaveLength(8) })
    it('contains every original id', () => { expect(store.getAll().map((i) => i.id)).toEqual(expect.arrayContaining([1,2,3,4,5,6,7,8])) })
  })

  describe('getItem(id)', () => {
    it('returns the correct item', () => { expect(store.getItem(4)?.label).toBe('Айтем 4') })
    it('returns undefined for unknown id', () => { expect(store.getItem(999)).toBeUndefined() })
  })

  describe('getChildren(id)', () => {
    it('returns direct children of root', () => { expect(store.getChildren(1)).toHaveLength(2) })
    it('returns direct children of id=2', () => { expect(store.getChildren(2)).toHaveLength(3) })
    it('returns empty array for a leaf', () => { expect(store.getChildren(7)).toHaveLength(0) })
    it('returns empty array for unknown id', () => { expect(store.getChildren(999)).toHaveLength(0) })
  })

  describe('getAllChildren(id)', () => {
    it('returns all 7 descendants of root', () => { expect(store.getAllChildren(1)).toHaveLength(7) })
    it('returns all 5 descendants of id=2', () => { expect(store.getAllChildren(2)).toHaveLength(5) })
    it('returns 2 descendants of id=4', () => { expect(store.getAllChildren(4)).toHaveLength(2) })
    it('returns empty for a leaf', () => { expect(store.getAllChildren(8)).toHaveLength(0) })
  })

  describe('getAllParents(id)', () => {
    it('returns [4,2,1] for id=7', () => { expect(store.getAllParents(7).map((p) => p.id)).toEqual([4,2,1]) })
    it('returns [1] for id=2', () => { expect(store.getAllParents(2).map((p) => p.id)).toEqual([1]) })
    it('returns [] for root', () => { expect(store.getAllParents(1)).toHaveLength(0) })
    it('returns [] for unknown id', () => { expect(store.getAllParents(999)).toHaveLength(0) })
  })

  describe('addItem(item)', () => {
    it('increases total count', () => { store.addItem({ id: 99, parent: 1, label: 'New' }); expect(store.getAll()).toHaveLength(9) })
    it('appears as child of parent', () => { store.addItem({ id: 99, parent: 2, label: 'New' }); expect(store.getChildren(2).map((c) => c.id)).toContain(99) })
    it('root item listed as root', () => { store.addItem({ id: 100, parent: null, label: 'R' }); expect(store.getRoots().map((r) => r.id)).toContain(100) })
    it('throws on duplicate id', () => { expect(() => store.addItem({ id: 1, parent: null, label: 'D' })).toThrow() })
  })

  describe('removeItem(id)', () => {
    it('removes a leaf', () => { store.removeItem(7); expect(store.getItem(7)).toBeUndefined(); expect(store.getAll()).toHaveLength(7) })
    it('removes group and descendants', () => { store.removeItem(4); expect(store.getAll()).toHaveLength(5) })
    it('removing id=2 leaves only 1 and 3', () => { store.removeItem(2); expect(store.getAll()).toHaveLength(2) })
    it('removed item gone from parent children', () => { store.removeItem(5); expect(store.getChildren(2).map((c) => c.id)).not.toContain(5) })
    it('unknown id does not throw', () => { expect(() => store.removeItem(999)).not.toThrow() })
  })

  describe('updateItem(item)', () => {
    it('updates label', () => { store.updateItem({ id: 3, parent: 1, label: 'Updated' }); expect(store.getItem(3)?.label).toBe('Updated') })
    it('re-parents item', () => { store.updateItem({ id: 3, parent: 2, label: 'Айтем 3' }); expect(store.getChildren(2).map((c) => c.id)).toContain(3) })
    it('throws on unknown id', () => { expect(() => store.updateItem({ id: 999, parent: null, label: 'X' })).toThrow() })
  })

  describe('getVisibleRows(expanded)', () => {
    it('shows only root when nothing expanded', () => { expect(store.getVisibleRows(new Set()).map((r) => r.id)).toEqual([1]) })
    it('shows correct rows when id=1 expanded', () => { expect(store.getVisibleRows(new Set([1])).map((r) => r.id)).toEqual([1,2,3]) })
    it('shows all 8 rows when fully expanded', () => { expect(store.getVisibleRows(new Set([1,2,4])).map((r) => r.id)).toEqual([1,2,4,7,8,5,6,3]) })
    it('attaches correct _depth', () => {
      const rows = store.getVisibleRows(new Set([1,2,4]))
      const dm = Object.fromEntries(rows.map((r) => [r.id, r._depth]))
      expect(dm[1]).toBe(0); expect(dm[2]).toBe(1); expect(dm[4]).toBe(2); expect(dm[7]).toBe(3)
    })
  })
})
