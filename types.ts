export interface SupplierRow {
  [key: string]: string;
}

export interface CatalogRow {
  [key: string]: string;
}

export interface ColumnMapping {
  supplierSku: string;
  masterSku: string;
  supplierName: string;
  masterName: string;
  supplierPrice: string;
  masterPrice: string;
  supplierStock: string;
  masterStock: string;
}

export type IssueSeverity = 'error' | 'warning' | 'pass';

export interface ValidationResult {
  id: string;
  sku: string;
  productName: string;
  supplierPrice: string;
  masterPrice: string;
  adjustedPrice: string;
  supplierStock: string;
  masterStock: string;
  status: IssueSeverity;
  findings: string[];
  isCatalogOnly?: boolean;
}

export interface ValidationSummary {
  supplierRowsCount: number;
  catalogOnlyCount: number;
  totalRecordsChecked: number;
  errorsCount: number;
  warningsCount: number;
  passedCount: number;
}