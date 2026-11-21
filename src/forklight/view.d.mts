import type { NotebookAdapter } from './types'
export function mount(root: HTMLElement, adapter: NotebookAdapter): { refresh(): Promise<void>; destroy(): void }
