// ============================================================
// Date Range Filtering — Unit Tests
// Tests the pure helper functions and filtering logic used by
// DataContext to slice income/expense data by date range.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { IncomeRecord, ExpenseRecord } from '@/lib/types';

// ── Inline the pure functions from DataContext for testing ────
// (They are module-private, so we replicate them here to test
//  the exact same logic without needing React rendering.)

type DateRange = 'all' | 'last-1' | 'last-3' | 'last-6' | string;

function resolveMonths(allMonths: string[], range: DateRange): string[] {
  if (range === 'all') return allMonths;

  // Specific month
  if (/^\d{4}-\d{2}$/.test(range)) {
    return allMonths.includes(range) ? [range] : allMonths;
  }

  // last-N pattern
  const match = range.match(/^last-(\d+)$/);
  if (match) {
    const n = parseInt(match[1], 10);
    return allMonths.slice(-n);
  }

  return allMonths;
}

function buildPeriodLabel(months: string[], range: DateRange): string {
  if (months.length === 0) return 'No data';

  const fmt = (m: string) => {
    // Use T12:00:00 to avoid timezone-induced day rollback
    const d = new Date(m + '-01T12:00:00');
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  if (range === 'all') {
    if (months.length === 1) return fmt(months[0]);
    return `${fmt(months[0])} — ${fmt(months[months.length - 1])}`;
  }

  if (/^\d{4}-\d{2}$/.test(range)) {
    return fmt(range);
  }

  if (range === 'last-1') {
    return fmt(months[months.length - 1]);
  }

  if (range === 'last-3' || range === 'last-6') {
    if (months.length === 1) return fmt(months[0]);
    return `${fmt(months[0])} — ${fmt(months[months.length - 1])}`;
  }

  return 'Custom period';
}

// ── Test data ────────────────────────────────────────────────
const ALL_MONTHS = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];

function makeIncomeRecords(months: string[]): IncomeRecord[] {
  return months.map((month, i) => ({
    id: `inc-${i}`,
    month,
    staNo: 'STA-001',
    propertyName: 'Test Property',
    incomeReceivable: 10000,
    deferredIncome: 500,
    propertyIncome: 9500,
    collectionRate: 0.95,
  }));
}

function makeExpenseRecords(months: string[]): ExpenseRecord[] {
  return months.map((month, i) => ({
    id: `exp-${i}`,
    month,
    staNo: 'STA-001',
    propertyName: 'Test Property',
    supplierName: 'Test Vendor',
    amount: 3000,
    category: 'Maintenance',
    status: 'paid' as const,
  }));
}

// ═══════════════════════════════════════════════════════════════
// resolveMonths
// ═══════════════════════════════════════════════════════════════
describe('resolveMonths', () => {
  it('returns all months for "all" range', () => {
    const result = resolveMonths(ALL_MONTHS, 'all');
    expect(result).toEqual(ALL_MONTHS);
  });

  it('returns the last month for "last-1"', () => {
    const result = resolveMonths(ALL_MONTHS, 'last-1');
    expect(result).toEqual(['2025-12']);
  });

  it('returns the last 3 months for "last-3"', () => {
    const result = resolveMonths(ALL_MONTHS, 'last-3');
    expect(result).toEqual(['2025-10', '2025-11', '2025-12']);
  });

  it('returns the last 6 months for "last-6" (full dataset)', () => {
    const result = resolveMonths(ALL_MONTHS, 'last-6');
    expect(result).toEqual(ALL_MONTHS);
  });

  it('returns a single month when given a specific YYYY-MM', () => {
    const result = resolveMonths(ALL_MONTHS, '2025-09');
    expect(result).toEqual(['2025-09']);
  });

  it('falls back to all months when specific month is not in dataset', () => {
    const result = resolveMonths(ALL_MONTHS, '2024-01');
    expect(result).toEqual(ALL_MONTHS);
  });

  it('handles last-N when N > available months', () => {
    const result = resolveMonths(['2025-11', '2025-12'], 'last-6');
    expect(result).toEqual(['2025-11', '2025-12']);
  });

  it('returns all months for unknown range patterns', () => {
    const result = resolveMonths(ALL_MONTHS, 'unknown');
    expect(result).toEqual(ALL_MONTHS);
  });
});

// ═══════════════════════════════════════════════════════════════
// buildPeriodLabel
// ═══════════════════════════════════════════════════════════════
describe('buildPeriodLabel', () => {
  it('returns "No data" for empty months array', () => {
    expect(buildPeriodLabel([], 'all')).toBe('No data');
  });

  it('returns a range label for "all" with multiple months', () => {
    const label = buildPeriodLabel(ALL_MONTHS, 'all');
    // Should contain both first and last month
    expect(label).toContain('Jul');
    expect(label).toContain('Dec');
    expect(label).toContain('2025');
    expect(label).toContain('—');
  });

  it('returns a single month label for "all" with one month', () => {
    const label = buildPeriodLabel(['2025-10'], 'all');
    expect(label).toContain('Oct');
    expect(label).toContain('2025');
    expect(label).not.toContain('—');
  });

  it('returns the latest month label for "last-1"', () => {
    const label = buildPeriodLabel(['2025-12'], 'last-1');
    expect(label).toContain('Dec');
    expect(label).toContain('2025');
  });

  it('returns a range label for "last-3"', () => {
    const months = ['2025-10', '2025-11', '2025-12'];
    const label = buildPeriodLabel(months, 'last-3');
    expect(label).toContain('Oct');
    expect(label).toContain('Dec');
    expect(label).toContain('—');
  });

  it('returns a specific month label for YYYY-MM range', () => {
    const label = buildPeriodLabel(['2025-09'], '2025-09');
    expect(label).toContain('Sept');
    expect(label).toContain('2025');
  });
});

// ═══════════════════════════════════════════════════════════════
// Data filtering logic (simulates what DataContext does)
// ═══════════════════════════════════════════════════════════════
describe('date range data filtering', () => {
  const allIncome = makeIncomeRecords(ALL_MONTHS);
  const allExpenses = makeExpenseRecords(ALL_MONTHS);

  function filterByRange(range: DateRange) {
    const activeMonths = resolveMonths(ALL_MONTHS, range);
    const monthSet = new Set(activeMonths);
    return {
      income: allIncome.filter(r => monthSet.has(r.month)),
      expenses: allExpenses.filter(r => monthSet.has(r.month)),
      activeMonths,
    };
  }

  it('returns all records for "all" range', () => {
    const { income, expenses } = filterByRange('all');
    expect(income).toHaveLength(6);
    expect(expenses).toHaveLength(6);
  });

  it('returns 1 record for "last-1" range', () => {
    const { income, expenses, activeMonths } = filterByRange('last-1');
    expect(income).toHaveLength(1);
    expect(expenses).toHaveLength(1);
    expect(income[0].month).toBe('2025-12');
    expect(activeMonths).toEqual(['2025-12']);
  });

  it('returns 3 records for "last-3" range', () => {
    const { income, expenses, activeMonths } = filterByRange('last-3');
    expect(income).toHaveLength(3);
    expect(expenses).toHaveLength(3);
    expect(activeMonths).toEqual(['2025-10', '2025-11', '2025-12']);
  });

  it('returns 1 record for specific month "2025-09"', () => {
    const { income, expenses } = filterByRange('2025-09');
    expect(income).toHaveLength(1);
    expect(expenses).toHaveLength(1);
    expect(income[0].month).toBe('2025-09');
  });

  it('returns all records when specific month is not in dataset', () => {
    const { income, expenses } = filterByRange('2024-01');
    expect(income).toHaveLength(6);
    expect(expenses).toHaveLength(6);
  });

  it('filtered income totals are less than or equal to all-time totals', () => {
    const allTotal = allIncome.reduce((s, r) => s + r.propertyIncome, 0);
    const { income: q3Income } = filterByRange('last-3');
    const q3Total = q3Income.reduce((s, r) => s + r.propertyIncome, 0);
    expect(q3Total).toBeLessThanOrEqual(allTotal);
    expect(q3Total).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Date range options builder (simulates DataContext logic)
// ═══════════════════════════════════════════════════════════════
describe('dateRangeOptions builder', () => {
  function buildOptions(availableMonths: string[]) {
    const options: { value: string; label: string }[] = [
      { value: 'all', label: 'All Time' },
    ];

    if (availableMonths.length > 1) {
      options.push({ value: 'last-1', label: 'Latest Month' });
    }
    if (availableMonths.length >= 3) {
      options.push({ value: 'last-3', label: 'Last 3 Months' });
    }
    if (availableMonths.length >= 6) {
      options.push({ value: 'last-6', label: 'Last 6 Months' });
    }

    const monthFmt = (m: string) => {
      const d = new Date(m + '-01T12:00:00');
      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    };
    for (const m of [...availableMonths].reverse()) {
      options.push({ value: m, label: monthFmt(m) });
    }

    return options;
  }

  it('includes all preset options for 6 months of data', () => {
    const options = buildOptions(ALL_MONTHS);
    const values = options.map(o => o.value);
    expect(values).toContain('all');
    expect(values).toContain('last-1');
    expect(values).toContain('last-3');
    expect(values).toContain('last-6');
  });

  it('includes individual months in reverse order', () => {
    const options = buildOptions(ALL_MONTHS);
    const monthOptions = options.filter(o => /^\d{4}-\d{2}$/.test(o.value));
    expect(monthOptions).toHaveLength(6);
    // First individual month should be the most recent
    expect(monthOptions[0].value).toBe('2025-12');
    expect(monthOptions[5].value).toBe('2025-07');
  });

  it('omits last-3 and last-6 for 2 months of data', () => {
    const options = buildOptions(['2025-11', '2025-12']);
    const values = options.map(o => o.value);
    expect(values).toContain('all');
    expect(values).toContain('last-1');
    expect(values).not.toContain('last-3');
    expect(values).not.toContain('last-6');
  });

  it('omits last-1 for single month of data', () => {
    const options = buildOptions(['2025-12']);
    const values = options.map(o => o.value);
    expect(values).toContain('all');
    expect(values).not.toContain('last-1');
    // Still includes the single month as individual option
    expect(values).toContain('2025-12');
  });
});
