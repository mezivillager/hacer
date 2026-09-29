import type { Snapshot } from './snapshot'

export interface Series { key: string; label: string }
export interface Item { href: string; text: string }
export interface Point { key: string; label: string; values: Record<string, number> | null; items: Item[] }
export interface ChartData { series: Series[]; points: Point[] }

export const OTHER = '(other)'

export const ratchetChart = (_snapshot: Snapshot): ChartData => ({ series: [], points: [] })
export const mergesChart = (_snapshot: Snapshot): ChartData => ({ series: [], points: [] })
export const coverageChart = (_snapshot: Snapshot): ChartData => ({ series: [], points: [] })
export const openTasksChart = (_snapshot: Snapshot): ChartData => ({ series: [], points: [] })
