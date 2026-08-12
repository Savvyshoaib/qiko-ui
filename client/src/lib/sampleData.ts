// ============================================================
// Sample Data Generator — Realistic Property Management Financials
// Catalog (properties, vendors, categories) comes from mock-data.json.
// ============================================================

import type { IncomeRecord, ExpenseRecord } from "./types";
import { getFinancialMock } from "@/data/services";

type PropertyRef = { staNo: string; name: string };
type VendorRef = { name: string; category: string };

function getCatalog() {
  const financial = getFinancialMock() as {
    properties: PropertyRef[];
    vendors?: VendorRef[];
    expenseCategories?: string[];
    incomeCategories?: string[];
    months?: string[];
  };
  return {
    properties: financial.properties,
    vendors: financial.vendors ?? [],
    expenseCategories: financial.expenseCategories ?? [],
    incomeCategories: financial.incomeCategories ?? ["Rent"],
    months: financial.months ?? ["2026-01"],
  };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateSampleIncome(): IncomeRecord[] {
  const { properties, incomeCategories, months } = getCatalog();
  const rand = seededRandom(42);
  const records: IncomeRecord[] = [];
  let id = 1;

  const tenantNames = [
    "Mr J. Thompson",
    "Ms A. Chen",
    "Dr R. Patel",
    "Mrs S. Williams",
    "Mr K. Okonkwo",
    "Ms L. Martinez",
    "Mr D. Kim",
    "Mrs F. Ahmed",
    "Mr T. Brown",
    "Ms N. Ivanova",
    "Dr P. Singh",
    "Mr M. Taylor",
    "Ms E. Johnson",
    "Mr H. Nakamura",
    "Mrs C. O'Brien",
    "Mr A. Rossi",
  ];

  for (const month of months) {
    for (const prop of properties) {
      const propIndex = properties.indexOf(prop);
      const baseReceivable = 40000 + propIndex * 8000 + rand() * 25000;
      const monthIndex = months.indexOf(month);
      const seasonal = 1 + (monthIndex % 3 === 0 ? 0.05 : monthIndex % 3 === 1 ? -0.02 : 0.03);

      for (const cat of incomeCategories) {
        const catWeight =
          cat === "Rent"
            ? 0.65
            : cat === "Service Charges"
              ? 0.2
              : cat === "Parking"
                ? 0.08
                : cat === "Storage"
                  ? 0.05
                  : 0.02;
        const receivable = Math.round(baseReceivable * catWeight * seasonal);
        const collectionBase =
          prop.staNo === "ELR0209" ? 0.72 : prop.staNo === "ELR0213" ? 0.78 : 0.88 + rand() * 0.12;
        const collected = Math.round(receivable * collectionBase);
        const deferred = Math.round(receivable * (0.03 + rand() * 0.08));
        const tenantName =
          tenantNames[(propIndex + incomeCategories.indexOf(cat)) % tenantNames.length];

        records.push({
          id: `INC-${String(id++).padStart(5, "0")}`,
          month,
          staNo: prop.staNo,
          propertyName: prop.name,
          tenantName,
          unitRef: `${prop.staNo}-${String(1 + (id % 8)).padStart(3, "0")}`,
          incomeReceivable: receivable,
          deferredIncome: deferred,
          propertyIncome: collected,
          collectionRate: collected / receivable,
          periodFrom: `${month}-01`,
          periodTo: `${month}-28`,
          category: cat,
        });
      }
    }
  }
  return records;
}

export function generateSampleExpenses(): ExpenseRecord[] {
  const { properties, vendors, expenseCategories, months } = getCatalog();
  const rand = seededRandom(99);
  const records: ExpenseRecord[] = [];
  let id = 1;

  if (vendors.length === 0 || expenseCategories.length === 0) return records;

  for (const month of months) {
    for (const prop of properties) {
      const vendorCount = 3 + Math.floor(rand() * 4);
      const usedVendors = new Set<number>();

      for (let v = 0; v < vendorCount; v++) {
        let vendorIdx: number;
        do {
          vendorIdx = Math.floor(rand() * vendors.length);
        } while (usedVendors.has(vendorIdx));
        usedVendors.add(vendorIdx);

        const vendor = vendors[vendorIdx];
        const propIndex = properties.indexOf(prop);
        const baseAmount = 150 + propIndex * 50 + rand() * 2000;
        const monthIndex = months.indexOf(month);
        const seasonal =
          vendor.category.includes("Heating") || vendor.category.includes("Heat")
            ? monthIndex >= 3
              ? 1.4
              : 1.0
            : 1.0;
        const nett = Math.round(baseAmount * seasonal * 100) / 100;
        const vatRate = vendor.category.startsWith("03") ? 0.05 : 0.2;
        const vat = Math.round(nett * vatRate * 100) / 100;
        const gross = Math.round((nett + vat) * 100) / 100;

        const statusRoll = rand();
        const status: "paid" | "pending" | "overdue" =
          statusRoll < 0.8 ? "paid" : statusRoll < 0.92 ? "pending" : "overdue";
        const settled = status === "paid";

        const day = 1 + Math.floor(rand() * 28);
        const invoiceDate = `${month}-${String(day).padStart(2, "0")}`;
        const category =
          rand() < 0.7
            ? vendor.category
            : expenseCategories[Math.floor(rand() * expenseCategories.length)];

        records.push({
          id: `EXP-${String(id++).padStart(5, "0")}`,
          month,
          staNo: prop.staNo,
          propertyName: prop.name,
          supplierName: vendor.name,
          supplierRef: `SUP-${String(vendorIdx + 1).padStart(3, "0")}`,
          invoiceNumber: `INV-${month.replace("-", "")}-${String(id).padStart(4, "0")}`,
          invoiceDate,
          expDate: invoiceDate,
          nett,
          vat,
          gross,
          amount: gross,
          category,
          description: `${category} — ${prop.name}`,
          status,
          settled,
        });
      }
    }
  }
  return records;
}

export function getAvailableMonths(): string[] {
  return getCatalog().months;
}
