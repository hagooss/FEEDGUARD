import {
  SupplierRow,
  CatalogRow,
  ColumnMapping,
  ValidationResult,
  ValidationSummary,
} from '../types';

function parseNumeric(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') return NaN;
  const cleaned = String(value).trim().replace(/[$,\s]/g, '');
  if (!cleaned || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

function parseStock(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') return NaN;
  const cleaned = String(value).trim().replace(/,/g, '');
  if (!/^-?\d+$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

function money(value: number): string {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : '—';
}

export function runValidationEngine(
  supplierRows: SupplierRow[],
  catalogRows: CatalogRow[],
  mapping: ColumnMapping,
  markupPercent: number
): { results: ValidationResult[]; summary: ValidationSummary } {
  const results: ValidationResult[] = [];
  const safeMarkup = Number.isFinite(markupPercent) && markupPercent >= 0 && markupPercent <= 1000
    ? markupPercent
    : 0;

  const supplierSkuCounts = new Map<string, number>();
  for (const row of supplierRows) {
    const sku = (row[mapping.supplierSku] || '').trim();
    if (sku) supplierSkuCounts.set(sku, (supplierSkuCounts.get(sku) || 0) + 1);
  }

  const catalogSkuCounts = new Map<string, number>();
  const catalogMap = new Map<string, CatalogRow>();
  for (const row of catalogRows) {
    const sku = (row[mapping.masterSku] || '').trim();
    if (!sku) continue;
    catalogSkuCounts.set(sku, (catalogSkuCounts.get(sku) || 0) + 1);
    if (!catalogMap.has(sku)) catalogMap.set(sku, row);
  }

  const trackedCatalogSkus = new Set<string>();
  let errorCount = 0;
  let warningCount = 0;
  let passedCount = 0;

  supplierRows.forEach((sRow, idx) => {
    const rawSku = (sRow[mapping.supplierSku] || '').trim();
    const rawName = (sRow[mapping.supplierName] || `Item #${idx + 1}`).trim();
    const rawPriceStr = (sRow[mapping.supplierPrice] || '').trim();
    const rawStockStr = (sRow[mapping.supplierStock] || '').trim();
    const parsedPrice = parseNumeric(rawPriceStr);
    const parsedStock = parseStock(rawStockStr);
    const findings: string[] = [];
    let hasError = false;
    let hasWarning = false;

    if (!rawSku) {
      findings.push(`Supplier row ${idx + 1} is missing a SKU.`);
      hasError = true;
    } else if ((supplierSkuCounts.get(rawSku) || 0) > 1) {
      findings.push(`SKU ${rawSku} appears ${supplierSkuCounts.get(rawSku)} times in the supplier feed.`);
      hasError = true;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      findings.push('Supplier price is missing or invalid.');
      hasError = true;
    }

    if (!Number.isFinite(parsedStock)) {
      findings.push('Supplier stock quantity is missing or invalid. Use a whole number.');
      hasError = true;
    } else if (parsedStock < 0) {
      findings.push(`Supplier stock cannot be negative (${parsedStock}).`);
      hasError = true;
    }

    const adjustedPrice = Number.isFinite(parsedPrice)
      ? parsedPrice * (1 + safeMarkup / 100)
      : NaN;
    const adjustedPriceFormatted = money(adjustedPrice);

    let cRow: CatalogRow | undefined;
    if (rawSku && catalogMap.has(rawSku)) {
      cRow = catalogMap.get(rawSku);
      trackedCatalogSkus.add(rawSku);

      if ((catalogSkuCounts.get(rawSku) || 0) > 1) {
        findings.push(`SKU ${rawSku} appears more than once in the master catalog.`);
        hasError = true;
      }

      if (cRow) {
        const catalogPrice = parseNumeric(cRow[mapping.masterPrice] || '');
        if (Number.isFinite(parsedPrice) && Number.isFinite(catalogPrice) && catalogPrice > 0) {
          const diffPct = Math.abs((adjustedPrice - catalogPrice) / catalogPrice) * 100;
          if (diffPct > 20) {
            findings.push(`Adjusted price differs from catalog by ${diffPct.toFixed(1)}%.`);
            hasWarning = true;
          }
        } else if (!Number.isFinite(catalogPrice)) {
          findings.push('Catalog price is missing or invalid.');
          hasWarning = true;
        }

        const catalogStock = parseStock(cRow[mapping.masterStock] || '');
        if (Number.isFinite(parsedStock) && Number.isFinite(catalogStock) && catalogStock >= 0) {
          const difference = Math.abs(parsedStock - catalogStock);
          if (catalogStock > 0 && difference / catalogStock > 0.5 && difference >= 5) {
            findings.push(`Stock changed by ${difference} units (${Math.round(difference / catalogStock * 100)}%).`);
            hasWarning = true;
          }
        } else if (!Number.isFinite(catalogStock)) {
          findings.push('Catalog stock is missing or invalid.');
          hasWarning = true;
        }
      }
    } else if (rawSku) {
      findings.push(`SKU ${rawSku} is not present in the master catalog.`);
      hasWarning = true;
    }

    const status = hasError ? 'error' : hasWarning ? 'warning' : 'pass';
    if (status === 'error') errorCount++;
    else if (status === 'warning') warningCount++;
    else {
      passedCount++;
      findings.push('No issues');
    }

    const catalogPriceValue = cRow ? parseNumeric(cRow[mapping.masterPrice] || '') : NaN;
    results.push({
      id: `sup-${idx}`,
      sku: rawSku || '—',
      productName: rawName || 'Unspecified Item',
      supplierPrice: money(parsedPrice),
      masterPrice: money(catalogPriceValue),
      adjustedPrice: adjustedPriceFormatted,
      supplierStock: Number.isFinite(parsedStock) ? String(parsedStock) : '—',
      masterStock: cRow ? (cRow[mapping.masterStock] || '—') : '—',
      status,
      findings,
    });
  });

  let catalogOnlyCount = 0;
  catalogMap.forEach((row, sku) => {
    if (!trackedCatalogSkus.has(sku)) {
      catalogOnlyCount++;
      warningCount++;
      const price = parseNumeric(row[mapping.masterPrice] || '');
      results.push({
        id: `cat-${encodeURIComponent(sku)}`,
        sku,
        productName: (row[mapping.masterName] || 'Catalog Product').trim(),
        supplierPrice: '—',
        masterPrice: money(price),
        adjustedPrice: '—',
        supplierStock: '—',
        masterStock: row[mapping.masterStock] || '—',
        status: 'warning',
        findings: [`SKU ${sku} is in the master catalog but missing from the supplier feed.`],
        isCatalogOnly: true,
      });
    }
  });

  const summary: ValidationSummary = {
    supplierRowsCount: supplierRows.length,
    catalogOnlyCount,
    totalRecordsChecked: supplierRows.length + catalogOnlyCount,
    errorsCount: errorCount,
    warningsCount: warningCount,
    passedCount,
  };

  return { results, summary };
}