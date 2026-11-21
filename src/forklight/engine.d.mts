import type { Decision } from './types'
export function example(): Decision
export function blank(): Decision
export function validate(document: unknown): string[]
export function rank(document: Decision): { complete: boolean; errors: string[]; missing: number; rows: { id: string; name: string; numerator: number; score: number }[]; winners: string[] }
export function sensitivity(document: Decision, criterionId: string): { weight: number; winners: string[]; rows: { id: string; name: string; numerator: number; score: number }[] }[]
export function recordDecision(document: Decision, now?: string): Decision
export function duplicate(document: Decision): Decision
