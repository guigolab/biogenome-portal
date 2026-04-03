import type { FlatTreeNode } from '@/lib/taxonomy/treeTableTypes'

export type NodeClickEvent = {
   taxid: string
   node: FlatTreeNode
   screenX: number
   screenY: number
}

export type TreeRankOption = 'all' | string
