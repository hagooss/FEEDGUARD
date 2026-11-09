import { useState } from 'react';
import Papa from 'papaparse';
import {
  ShieldCheck, ClipboardCheck, FileCheck2, Database, LockKeyhole,
  Sparkles, RotateCcw, FolderOpen, FileSpreadsheet, Upload, ArrowRight,
  PackageCheck, ArrowDownToLine, Search,
} from 'lucide-react';
import {
  SupplierRow, CatalogRow, ColumnMapping, ValidationResult, ValidationSummary,
} from './types';
import { runValidationEngine } from './utils/validation';

const emptyMapping: ColumnMapping = {
  supplierSku: '', masterSku: '', supplierName: '', masterName: '',
  supplierPrice: '', masterPrice: '', supplierStock: '', masterStock: '',
};

export default function App() {
  const [supplierRows, setSupplierRows] = useState<SupplierRow[]>([]);
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([]);
  const [supplierFileName, setSupplierFileName] = useState('');
  const [catalogFileName, setCatalogFileName] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);
  const [markupPercent, setMarkupPercent] = useState(48);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'error' | 'warning' | 'pass'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFileUpload = (file: File, type: 'supplier' | 'catalog') => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (parsed) => {
        if (parsed.errors.length) {
          showToast(`CSV parsed with ${parsed.errors.length} issue(s). Check the file format.`);
        }
        const headers = parsed.meta.fields || [];
        const data = (parsed.data || []).filter(row => Object.values(row).some(value => String(value ?? '').trim() !== ''));
        if (!headers.length || !data.length) {
          showToast('This CSV appears empty or has no readable header row.');
          return;
        }
        if (type === 'supplier') {
          setSupplierFileName(file.name);
          setSupplierRows(data);
          setMapping(prev => ({
            ...prev,
            supplierSku: headers.find(h => /sku|code|item/i.test(h)) || headers[0] || '',
            supplierName: headers.find(h => /name|desc|title/i.test(h)) || headers[1] || '',
            supplierPrice: headers.find(h => /price|cost/i.test(h)) || headers[2] || '',
            supplierStock: headers.find(h => /stock|qty|quantity/i.test(h)) || headers[3] || '',
          }));
        } else {
          setCatalogFileName(file.name);
          setCatalogRows(data);
          setMapping(prev => ({
            ...prev,
            masterSku: headers.find(h => /sku|number|code|item/i.test(h)) || headers[0] || '',
            masterName: headers.find(h => /desc|name|title/i.test(h)) || headers[1] || '',
            masterPrice: headers.find(h => /retail|price/i.test(h)) || headers[2] || '',
            masterStock: headers.find(h => /on_hand|hand|stock|qty|quantity/i.test(h)) || headers[3] || '',
          }));
        }
        setResults([]);
        setSummary(null);
        showToast(`Loaded ${data.length} ${type} rows.`);
      },
      error: () => showToast('Could not read this CSV file. Please try another file.'),
    });
  };

  const loadSampleData = () => {
    const sampleSupplier: SupplierRow[] = [
      { sku: 'TEST-001', product_name: 'Blue T-Shirt', wholesale_price: '10.00', stock_quantity: '20' },
      { sku: 'TEST-002', product_name: 'Coffee Mug', wholesale_price: '5.50', stock_quantity: '15' },
      { sku: 'TEST-003', product_name: 'Desk Lamp', wholesale_price: '18.00', stock_quantity: '8' },
      { sku: 'TEST-004', product_name: 'Notebook', wholesale_price: '3.00', stock_quantity: '0' },
      { sku: 'TEST-005', product_name: 'Water Bottle', wholesale_price: '7.25', stock_quantity: '-2' },
      { sku: 'TEST-006', product_name: 'Phone Stand', wholesale_price: '', stock_quantity: '12' },
      { sku: 'TEST-002', product_name: 'Coffee Mug Duplicate', wholesale_price: '5.50', stock_quantity: '14' },
      { sku: '', product_name: 'Mystery Item', wholesale_price: '4.00', stock_quantity: '5' },
      { sku: 'TEST-008', product_name: 'Canvas Bag', wholesale_price: '9.00', stock_quantity: '30' },
      { sku: 'TEST-009', product_name: 'Ceramic Plate', wholesale_price: '6.00', stock_quantity: '11' },
      { sku: 'TEST-010', product_name: 'Wall Clock', wholesale_price: '22.00', stock_quantity: '4' },
      { sku: 'TEST-011', product_name: 'Extra Supplier Product', wholesale_price: '12.00', stock_quantity: '7' },
    ];
    const sampleCatalog: CatalogRow[] = [
      { item_number: 'TEST-001', description: 'Blue T-Shirt', retail_price: '18.00', on_hand: '18' },
      { item_number: 'TEST-002', description: 'Coffee Mug', retail_price: '9.00', on_hand: '15' },
      { item_number: 'TEST-003', description: 'Desk Lamp', retail_price: '32.00', on_hand: '10' },
      { item_number: 'TEST-004', description: 'Notebook', retail_price: '6.00', on_hand: '2' },
      { item_number: 'TEST-005', description: 'Water Bottle', retail_price: '13.00', on_hand: '0' },
      { item_number: 'TEST-006', description: 'Phone Stand', retail_price: '14.00', on_hand: '12' },
      { item_number: 'TEST-007', description: 'Missing Supplier Item', retail_price: '20.00', on_hand: '6' },
      { item_number: 'TEST-008', description: 'Canvas Bag', retail_price: '16.00', on_hand: '28' },
      { item_number: 'TEST-009', description: 'Ceramic Plate', retail_price: '11.00', on_hand: '11' },
      { item_number: 'TEST-010', description: 'Wall Clock', retail_price: '40.00', on_hand: '4' },
    ];
    const sampleMap: ColumnMapping = {
      supplierSku: 'sku', masterSku: 'item_number',
      supplierName: 'product_name', masterName: 'description',
      supplierPrice: 'wholesale_price', masterPrice: 'retail_price',
      supplierStock: 'stock_quantity', masterStock: 'on_hand',
    };
    setSupplierFileName('feedguard_test_supplier.csv');
    setCatalogFileName('feedguard_master_catalog.csv');
    setSupplierRows(sampleSupplier);
    setCatalogRows(sampleCatalog);
    setMapping(sampleMap);
    const validation = runValidationEngine(sampleSupplier, sampleCatalog, sampleMap, 48);
    setResults(validation.results);
    setSummary(validation.summary);
    showToast('Loaded sample test datasets.');
  };

  const clearWorkspace = () => {
    setSupplierRows([]);
    setCatalogRows([]);
    setSupplierFileName('');
    setCatalogFileName('');
    setMapping(emptyMapping);
    setResults([]);
    setSummary(null);
    setSearchQuery('');
    setStatusFilter('all');
    showToast('Workspace cleared.');
  };

  const handleValidate = () => {
    if (!supplierRows.length) {
      showToast('Please upload a supplier CSV feed first.');
      return;
    }
    if (!mapping.supplierSku || !mapping.supplierPrice || !mapping.supplierStock) {
      showToast('Select the supplier SKU, price, and stock columns first.');
      return;
    }
    if (catalogRows.length && (!mapping.masterSku || !mapping.masterPrice || !mapping.masterStock)) {
      showToast('Select the catalog SKU, price, and stock columns first.');
      return;
    }
    if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 1000) {
      showToast('Markup must be between 0 and 1000%.');
      return;
    }
    const validation = runValidationEngine(supplierRows, catalogRows, mapping, markupPercent);
    setResults(validation.results);
    setSummary(validation.summary);
    showToast('Validation completed!');
  };

  const downloadCsv = (rows: Record<string, string>[], filename: string) => {
    if (!rows.length) return;
    const csv = Papa.unparse(rows);
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const downloadValidatedCSV = () => downloadCsv(results.map(row => ({
    SKU: row.sku,
    Product_Name: row.productName,
    Supplier_Price: row.supplierPrice,
    Catalog_Price: row.masterPrice,
    Adjusted_Price: row.adjustedPrice,
    Supplier_Stock: row.supplierStock,
    Catalog_Stock: row.masterStock,
    Status: row.status.toUpperCase(),
    Validation_Notes: row.findings.join(' | '),
  })), `feedguard-validated-${new Date().toISOString().slice(0, 10)}.csv`);

  const downloadReport = () => downloadCsv(results.map(row => ({
    ID: row.id,
    SKU: row.sku,
    Product: row.productName,
    Severity: row.status.toUpperCase(),
    Findings: row.findings.join('; '),
  })), `feedguard-validation-report-${new Date().toISOString().slice(0, 10)}.csv`);

  const filteredResults = results.filter(row => {
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || row.sku.toLowerCase().includes(query) || row.productName.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const selectStyle = 'w-full mt-1 border border-[#dedab5] rounded-md px-2 py-2 bg-[#f7f6f0] text-xs text-[#344052]';

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f0e7] text-[#202b3d]">
      {toastMessage && <div className="fixed right-6 bottom-6 z-50 bg-[#263246] text-[#f5f1e5] border border-[#3d4a5d] px-4 py-3 rounded-lg text-xs shadow-xl">{toastMessage}</div>}
      <div className="flex flex-1">
        <aside className="w-64 bg-[#202b3d] text-[#f5f1e5] p-6 hidden md:flex flex-col flex-shrink-0">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#d4e970] text-[#202b3d] flex items-center justify-center font-bold"><ShieldCheck className="w-5 h-5" /></div>
            <div><div className="font-extrabold tracking-wider text-sm">FEEDGUARD</div><span className="font-mono text-[9px] text-[#b3b8bd] tracking-widest block">CATALOG OPERATIONS</span></div>
          </div>
          <div className="font-mono text-[10px] text-[#939ba7] tracking-widest mb-3 uppercase">WORKSPACE</div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold bg-[#2b374b] text-[#e2ef94] mb-1"><ClipboardCheck className="w-4 h-4" /> Feed validator</button>
          <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#c4c9cc] mb-1"><FileCheck2 className="w-4 h-4" /> Field mapping</div>
          <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-[#c4c9cc] mb-1"><Database className="w-4 h-4" /> Validation results</div>
          <div className="mt-auto bg-[#29364a] border border-[#39465a] rounded-xl p-4">
            <strong className="flex items-center gap-2 text-xs text-[#d9e8a1] font-semibold"><LockKeyhole className="w-3.5 h-3.5" /> Private by design</strong>
            <p className="text-[#aeb6c0] text-[10px] leading-relaxed mt-2">Supplier files stay in this browser. Nothing is sent to a server or stored outside your device.</p>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="min-h-16 border-b border-[#dedab5] bg-[#f7f5ee] px-4 md:px-8 py-3 flex items-center justify-between gap-3">
            <div className="font-mono text-xs text-[#797d7d]">OPERATIONS / INVENTORY CHECK</div>
            <span className="bg-[#e9eddb] text-[#4d6040] border border-[#d8e0bf] px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-[#719449]" /> ON-DEVICE ONLY</span>
          </header>

          <main className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
              <div>
                <div className="font-mono text-[10px] text-[#778264] tracking-widest uppercase">Supplier intake · Catalog integrity</div>
                <h1 className="font-serif text-3xl font-medium text-[#263246] mt-1">A clean feed starts here.</h1>
                <p className="text-xs text-[#777c79] mt-1">Compare supplier inventory against your store catalog before it reaches the shelf.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={loadSampleData} className="px-3.5 py-2 rounded-lg text-xs font-extrabold bg-[#faf9f4] border border-[#d5d2c6] text-[#344052] flex items-center gap-2 hover:bg-white"><Sparkles className="w-3.5 h-3.5" /> Load sample data</button>
                <button onClick={clearWorkspace} className="px-3.5 py-2 rounded-lg text-xs font-extrabold bg-[#faf9f4] border border-[#d5d2c6] text-[#344052] flex items-center gap-2 hover:bg-white"><RotateCcw className="w-3.5 h-3.5" /> Clear workspace</button>
              </div>
            </section>

            <section className="bg-[#faf9f4] border border-[#dfdaae] rounded-xl mb-6">
              <div className="p-4 border-b border-[#e8e4da] flex justify-between items-center"><h2 className="text-xs font-extrabold text-[#273246] flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Your two source files</h2><span className="font-mono text-[9px] text-[#858982] uppercase">CSV · parsed in browser</span></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {(['supplier', 'catalog'] as const).map(type => {
                  const isSupplier = type === 'supplier';
                  const filename = isSupplier ? supplierFileName : catalogFileName;
                  const count = isSupplier ? supplierRows.length : catalogRows.length;
                  return <div key={type} className="border border-dashed border-[#cfccbf] rounded-lg p-4 bg-[#f7f6f0]">
                    <div className="flex gap-3"><div className="w-8 h-8 rounded-lg bg-[#e8ead0] flex items-center justify-center text-[#526146]"><FileSpreadsheet className="w-4 h-4" /></div><div><h3 className="text-xs font-extrabold">{isSupplier ? 'Supplier inventory feed' : 'Master store catalog'}</h3><p className="text-[10px] text-[#81847c]">{isSupplier ? 'Latest product and stock list from supplier.' : 'Your current in-store catalog for comparison.'}</p></div></div>
                    <div className={`mt-4 px-3 py-2 rounded text-[10px] flex justify-between items-center ${filename ? 'bg-[#e7eddf] text-[#465a3c]' : 'bg-[#eeede5] text-[#6c7169]'}`}><span className="truncate pr-2">{filename || 'No file selected'}</span><span>{count ? `${count} rows` : ''}</span></div>
                    <label className="cursor-pointer mt-3 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#faf9f4] border border-[#d5d2c6] text-[#344052] inline-flex items-center gap-1.5 hover:bg-white"><Upload className="w-3.5 h-3.5" /> Choose CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) handleFileUpload(file, type); event.currentTarget.value = ''; }} /></label>
                  </div>;
                })}
              </div>
            </section>

            {(supplierRows.length > 0 || catalogRows.length > 0) && <section className="bg-[#faf9f4] border border-[#dfdaae] rounded-xl p-4 mb-6">
              <h2 className="text-xs font-extrabold text-[#273246] mb-3">Column mapping</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {([
                  ['Supplier SKU', 'supplierSku', supplierRows],
                  ['Supplier name', 'supplierName', supplierRows],
                  ['Supplier price', 'supplierPrice', supplierRows],
                  ['Supplier stock', 'supplierStock', supplierRows],
                  ['Catalog SKU', 'masterSku', catalogRows],
                  ['Catalog name', 'masterName', catalogRows],
                  ['Catalog price', 'masterPrice', catalogRows],
                  ['Catalog stock', 'masterStock', catalogRows],
                ] as const).map(([label, key, rows]) => {
                  const headers = rows.length ? Object.keys(rows[0]) : [];
                  return <label key={key} className="text-[10px] font-bold text-[#687064]">{label}<select className={selectStyle} value={mapping[key]} onChange={event => { setMapping(prev => ({ ...prev, [key]: event.target.value })); setResults([]); setSummary(null); }}><option value="">Select column</option>{headers.map(header => <option key={header} value={header}>{header}</option>)}</select></label>;
                })}
              </div>
              {!catalogRows.length && <p className="text-[10px] text-[#858982] mt-3">You can validate supplier data alone, or upload a catalog to compare both files.</p>}
            </section>}

            <div className="bg-[#e9eddb] border border-[#d8e0bf] rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <div><strong className="text-xs text-[#34432e] font-bold">Ready to compare.</strong><p className="text-[10px] text-[#657054] mt-0.5">Confirm column mappings, set price markup %, then run validation.</p></div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-[#4b5545] font-semibold">Markup:<input type="number" min="0" max="1000" value={markupPercent} onChange={event => setMarkupPercent(event.target.value === '' ? 0 : Number(event.target.value))} className="w-20 h-8 border border-[#dedab5] rounded px-2 bg-[#f7f6f0] text-xs" />%</label>
                <button onClick={handleValidate} className="px-4 py-2 rounded-lg text-xs font-extrabold bg-[#263246] text-[#f5f1e5] flex items-center gap-2 hover:bg-[#35445b]"><ShieldCheck className="w-4 h-4" /> Validate feed <ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {summary && <section className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  ['Records Checked', summary.totalRecordsChecked, 'text-[#7d8672]'],
                  ['Errors', summary.errorsCount, 'text-[#ad5648]'],
                  ['Warnings', summary.warningsCount, 'text-[#9c7a3d]'],
                  ['Passed', summary.passedCount, 'text-[#69824b]'],
                ] as const).map(([label, value, color]) => <div key={label} className="bg-[#faf9f4] border border-[#dfdaae] rounded-lg p-4"><div className={`font-mono text-[9px] uppercase ${color}`}>{label}</div><div className="font-serif text-3xl font-medium text-[#283449] mt-2">{value}</div></div>)}
              </div>
              <div className="bg-[#faf9f4] border border-[#dfdaae] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#e8e4da] flex flex-wrap justify-between items-center gap-3"><h2 className="text-xs font-extrabold text-[#273246] flex items-center gap-2"><PackageCheck className="w-4 h-4" /> Validation results ({results.length} RECORDS)</h2><div className="flex gap-2"><button onClick={downloadReport} className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#faf9f4] border border-[#d5d2c6] text-[#344052] flex items-center gap-1.5"><ArrowDownToLine className="w-3.5 h-3.5" /> Report</button><button onClick={downloadValidatedCSV} className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#d9ed83] text-[#273246] flex items-center gap-1.5"><ArrowDownToLine className="w-3.5 h-3.5" /> Validated CSV</button></div></div>
                <div className="p-4 bg-[#f4f2ea] flex flex-col sm:flex-row justify-between gap-3 border-b border-[#e8e4da]"><div className="flex flex-wrap items-center gap-1.5">{(['all', 'error', 'warning', 'pass'] as const).map(filter => <button key={filter} onClick={() => setStatusFilter(filter)} className={`px-2.5 py-1.5 rounded text-xs font-bold ${statusFilter === filter ? 'bg-[#e9eddb] text-[#3e5134]' : 'text-[#7b8079]'}`}>{filter === 'all' ? 'All' : filter === 'error' ? 'Errors' : filter === 'warning' ? 'Warnings' : 'Passed'}</button>)}</div><div className="relative"><Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8a8c85]" /><input type="search" placeholder="Search SKU or product" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="pl-8 pr-3 py-1.5 text-xs bg-[#faf9f4] border border-[#e1ddd2] rounded-md outline-none" /></div></div>
                <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-[#f4f2ea] font-mono text-[9px] text-[#84877f] uppercase"><th className="p-3">SKU</th><th className="p-3">Product</th><th className="p-3">Adjusted Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3">Findings</th></tr></thead><tbody className="divide-y divide-[#eeebe2] text-xs text-[#5e665f]">{filteredResults.map(row => <tr key={row.id} className="hover:bg-[#f8f7f1]"><td className="p-3 font-medium text-[#384455]">{row.sku}</td><td className="p-3 font-extrabold text-[#303b4c]">{row.productName}</td><td className="p-3">{row.adjustedPrice}</td><td className="p-3">{row.supplierStock}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-[9px] font-extrabold uppercase ${row.status === 'error' ? 'bg-[#f7e5e0] text-[#a14e3e]' : row.status === 'warning' ? 'bg-[#f5edd9] text-[#8d7036]' : 'bg-[#e8efda] text-[#4e653a]'}`}>{row.status}</span></td><td className="p-3 text-[11px] text-[#767c75]">{row.findings.join(' · ')}</td></tr>)}</tbody></table>{filteredResults.length === 0 && <p className="p-6 text-center text-xs text-[#858982]">No records match this filter.</p>}</div>
              </div>
            </section>}
          </main>
        </div>
      </div>
    </div>
  );
}