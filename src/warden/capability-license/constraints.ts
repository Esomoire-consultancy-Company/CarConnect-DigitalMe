import type { ContextConstraint } from './licence'

export type RequestContext = Record<string, string | number | boolean | string[]>

export function validateContextConstraint(c: ContextConstraint): string[] {
	if ((c.operator === 'IN' || c.operator === 'NOT_IN') && !Array.isArray(c.value)) {
		return ['IN_REQUIRES_STRING_ARRAY']
	}
	if ((c.operator === 'GTE' || c.operator === 'LTE') && typeof c.value !== 'number') {
		return ['NUMERIC_OPERATOR_REQUIRES_NUMBER']
	}
	return []
}

export function evaluateContextConstraints(
	constraints: ContextConstraint[],
	context: RequestContext,
): { matched: boolean; reason?: 'CONTEXT_REQUIRED_MISSING' | 'CONTEXT_CONSTRAINT_FAILED' } {
	for (const c of constraints) {
		const exists = Object.prototype.hasOwnProperty.call(context, c.key)
		if (!exists && c.required) {
			return { matched: false, reason: 'CONTEXT_REQUIRED_MISSING' }
		}
		if (!exists) continue

		const actual = context[c.key]
		let ok = false
		switch (c.operator) {
			case 'EXISTS':
				ok = true
				break
			case 'EQ':
				ok = actual === c.value
				break
			case 'NEQ':
				ok = actual !== c.value
				break
			case 'IN':
				ok = typeof actual === 'string' && Array.isArray(c.value) && c.value.includes(actual)
				break
			case 'NOT_IN':
				ok = typeof actual === 'string' && Array.isArray(c.value) && !c.value.includes(actual)
				break
			case 'GTE':
				ok = typeof actual === 'number' && typeof c.value === 'number' && actual >= c.value
				break
			case 'LTE':
				ok = typeof actual === 'number' && typeof c.value === 'number' && actual <= c.value
				break
		}
		if (!ok) {
			return { matched: false, reason: 'CONTEXT_CONSTRAINT_FAILED' }
		}
	}

	return { matched: true }
}
