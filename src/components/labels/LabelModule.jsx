import { useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { supabase } from '../../lib/supabase';

const SHIFT_1_JOBS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];
const SHIFT_2_JOBS = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];

const JOB_CODE_MAP = {
  A: '1', B: '4', C: '7', D: 'A', E: 'D', F: 'G',
  G: 'J', H: 'M', J: 'P', K: 'S', L: 'V', M: 'Y',
  N: '2', O: '5', P: '8', Q: 'B', R: 'E', S: 'H',
  T: 'K', U: 'N', V: 'Q', W: 'T', X: 'W', Y: 'Z'
};

function toUppercaseValue(value) {
  return String(value ?? '').toUpperCase();
}

function buildAutoLabelItem(sku, systemCode) {
  const cleanSku = toUppercaseValue(sku).trim();

  if (!cleanSku) return '';

  const cleanSystemCode = toUppercaseValue(systemCode).trim();

  if (cleanSystemCode === 'S1' && !cleanSku.endsWith('SFG')) {
    return `${cleanSku}SFG`;
  }

  return cleanSku;
}

export default function LabelModule({
  systemCode,
  printer
}) {
  const [labelMode, setLabelMode] = useState('auto');

  const skuStorageKey = `1nico-label-sku-${String(systemCode || '').toLowerCase()}`;
  const stateStorageKey = `1nico-label-state-${String(systemCode || '').toLowerCase()}`;
  const [products, setProducts] = useState([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [skuDropdownOpen, setSkuDropdownOpen] = useState(false);
  const [skuHighlightIndex, setSkuHighlightIndex] = useState(0);
  const skuOptionRefs = useRef([]);

  const [expirationDates, setExpirationDates] = useState([]);
  const [loadingSkuData, setLoadingSkuData] = useState(true);
  const [loadingExpDates, setLoadingExpDates] = useState(false);
  const [inventoryMessage, setInventoryMessage] = useState('');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [dateHighlightIndex, setDateHighlightIndex] = useState(0);
  const dateOptionRefs = useRef([]);
  const [storageReady, setStorageReady] = useState(false);

  const [labelData, setLabelData] = useState({
    shift: '1',
    job: 'A',
    qty: '',
    dateCode: '',
    startingExpDate: '',
    labelQty: '2',
    palletQty: '1',
    startingPallet: '1'
  });

  const [manualLabelData, setManualLabelData] = useState({
    item: '',
    qty: '',
    lot: '',
    dateCode: '',
    lic: '',
    site: '',
    workOrder: '',
    labelQty: '2',
    palletQty: '1',
    startingPallet: '1'
  });

  const filteredProducts = useMemo(() => {
    const search = skuSearch.trim().toLowerCase();
    if (!search) return [];

    return products.filter((product) =>
      String(product.sku || '').toLowerCase().includes(search) ||
      String(product.description || '').toLowerCase().includes(search)
    );
  }, [products, skuSearch]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(stateStorageKey) || 'null');

      if (saved) {
        if (saved.labelMode) setLabelMode(saved.labelMode);
        if (saved.labelData) {
          const automaticShift = getAutomaticShift(new Date());
          const savedShift = saved.labelData.shift;

          setLabelData((previous) => ({
            ...previous,
            ...saved.labelData,
            shift: automaticShift,
            job:
              savedShift === automaticShift
                ? saved.labelData.job
                : automaticShift === '1'
                  ? 'A'
                  : 'N'
          }));
        }
        if (saved.manualLabelData) {
          setManualLabelData((previous) => ({
            ...previous,
            ...saved.manualLabelData
          }));
        }
        if (saved.sku) localStorage.setItem(skuStorageKey, saved.sku);
      }
    } catch (error) {
      console.warn('Unable to restore Label state:', error);
    } finally {
      setStorageReady(true);
    }
  }, [stateStorageKey, skuStorageKey]);

  useEffect(() => {
    if (!storageReady) return;

    localStorage.setItem(
      stateStorageKey,
      JSON.stringify({
        labelMode,
        labelData,
        manualLabelData,
        sku: selectedProduct?.sku || localStorage.getItem(skuStorageKey) || ''
      })
    );
  }, [
    storageReady,
    stateStorageKey,
    skuStorageKey,
    labelMode,
    labelData,
    manualLabelData,
    selectedProduct
  ]);

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingSkuData(true);

      const { data, error } = await supabase
        .from('workability_products')
        .select('id, customer, sku, description, active')
        .eq('customer', 'MDLZ')
        .eq('active', true)
        .order('sku', { ascending: true });

      if (error) {
        console.error('Label SKU load error:', error);
        setInventoryMessage('Unable to load SKUs from Supabase.');
        setLoadingSkuData(false);
        return;
      }

      const list = data || [];
      setProducts(list);

      const savedSku = localStorage.getItem(skuStorageKey);
      const savedProduct = list.find(
        (product) => String(product.sku) === String(savedSku)
      );

      if (savedProduct) {
        setSelectedProduct(savedProduct);
        setSkuSearch(savedProduct.sku);
      }

      setLoadingSkuData(false);
    };

    loadProducts();
  }, [skuStorageKey]);

  const parseComponentOptions = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(/[,|]/).map((item) => item.trim()).filter(Boolean);
      }
    }

    return [];
  };

  const getFeedstockItems = (components) => {
    const feedstocks = (components || []).filter((component) => {
      const type = String(component.type || '').trim().toUpperCase();
      const description = String(
        component.component_description || component.description || ''
      ).toUpperCase();

      return type === 'FEEDSTOCK' || description.includes('CANDY');
    });

    return Array.from(
      new Set(
        feedstocks.flatMap((component) => [
          component.component_sku,
          ...parseComponentOptions(component.component_options)
        ])
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    );
  };

  const loadExpirationDates = async (product) => {
    if (!product?.id) {
      setExpirationDates([]);
      setInventoryMessage('');
      return;
    }

    setLoadingExpDates(true);
    setInventoryMessage('');

    try {
      const { data: components, error: componentError } = await supabase
        .from('workability_components')
        .select('*')
        .eq('product_id', product.id);

      if (componentError) throw componentError;

      const feedstockItems = getFeedstockItems(components || []);

      if (!feedstockItems.length) {
        setExpirationDates([]);
        setInventoryMessage('No FEEDSTOCK component found for this SKU.');
        return;
      }

      const response = await fetch('http://10.1.1.156:3001/inventory/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          items: feedstockItems,
          site: 'MDLZ8',
          includeWip: true,
          fresh: Date.now()
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.error) {
        throw new Error(payload.message || 'Inventory Server error.');
      }

      const uniqueDates = new Map();

      (payload.items || []).forEach((item) => {
        (item.lots || []).forEach((row) => {
          const parsed = parseInventoryDate(row.ExpirationDate);
          const onHand = Number(row.OnHandQuantity || 0);

          if (!parsed || onHand <= 0) return;

          const key = toDateKey(parsed);
          if (!uniqueDates.has(key)) uniqueDates.set(key, parsed);
        });
      });

      const sortedDates = Array.from(uniqueDates.values())
        .sort((a, b) => a.getTime() - b.getTime())
        .map(formatDateForLabel);

      setExpirationDates(sortedDates);

      if (!sortedDates.length) {
        setInventoryMessage('No expiration dates with available inventory.');
        return;
      }

      // Keep the operator's selected date. Inventory is refreshed on every reload.
      // If no date has been selected yet, start with the oldest available date.
      setLabelData((previous) => {
        if (previous.dateCode) return previous;
        return {
          ...previous,
          startingExpDate: sortedDates[0],
          dateCode: sortedDates[0]
        };
      });
    } catch (error) {
      console.error('Label expiration load error:', error);
      setExpirationDates([]);
      setInventoryMessage(error.message || 'Unable to load Inventory dates.');
    } finally {
      setLoadingExpDates(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) loadExpirationDates(selectedProduct);
  }, [selectedProduct]);


  const selectSku = (product) => {
    setSelectedProduct(product);
    setSkuSearch(toUppercaseValue(product.sku));
    setSkuDropdownOpen(false);
    setSkuHighlightIndex(0);
    localStorage.setItem(skuStorageKey, toUppercaseValue(product.sku));
    setLabelData((previous) => ({
      ...previous,
      startingExpDate: '',
      dateCode: ''
    }));
  };

  const handleSkuInputChange = (value) => {
    setSkuSearch(value.toUpperCase());
    setSkuDropdownOpen(Boolean(value.trim()));

    if (selectedProduct && value !== selectedProduct.sku) {
      setSelectedProduct(null);
      setExpirationDates([]);
      setLabelData((previous) => ({
        ...previous,
        startingExpDate: '',
        dateCode: ''
      }));
    }
  };

  const handleSkuBlur = () => {
    window.setTimeout(() => {
      setSkuDropdownOpen(false);

      if (selectedProduct) {
        setSkuSearch(selectedProduct.sku);
      } else {
        setSkuSearch('');
      }
    }, 150);
  };

  const handleSkuKeyDown = (event) => {
    if (!skuDropdownOpen || !filteredProducts.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSkuHighlightIndex((index) =>
        index >= filteredProducts.length - 1 ? 0 : index + 1
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSkuHighlightIndex((index) =>
        index <= 0 ? filteredProducts.length - 1 : index - 1
      );
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const product =
        filteredProducts[skuHighlightIndex] || filteredProducts[0];
      if (product) {
        selectSku(product);

        window.setTimeout(() => {
          document.querySelector('[data-label-input="true"]')?.focus();
        }, 0);
      }
    }
  };

  useEffect(() => {
    skuOptionRefs.current[skuHighlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [skuHighlightIndex]);

  const availableJobs =
    labelData.shift === '1' ? SHIFT_1_JOBS : SHIFT_2_JOBS;


  useEffect(() => {
    if (!storageReady) return undefined;

    const applyAutomaticShift = () => {
      const automaticShift = getAutomaticShift(new Date());

      setLabelData((previous) => {
        if (previous.shift === automaticShift) return previous;

        return {
          ...previous,
          shift: automaticShift,
          job: automaticShift === '1' ? 'A' : 'N'
        };
      });
    };

    applyAutomaticShift();
    const timer = window.setInterval(applyAutomaticShift, 1000);
    return () => window.clearInterval(timer);
  }, [storageReady]);

  const calculatedExpDate = labelData.dateCode || '';

  const handleExpirationDateChange = (value) => {
    setLabelData((previous) => ({
      ...previous,
      startingExpDate: value,
      dateCode: value
    }));
    setDateDropdownOpen(false);
  };

  const getNextDateAfter = (date) => {
    if (!expirationDates.length) return date || '';

    const currentIndex = expirationDates.indexOf(date);
    if (currentIndex < 0) return expirationDates[0];

    return expirationDates[currentIndex + 1] || date;
  };

  const handleJobChange = (nextJob) => {
    const nextDate = getNextDateAfter(labelData.dateCode);

    setLabelData((previous) => ({
      ...previous,
      job: nextJob,
      startingExpDate: nextDate,
      dateCode: nextDate
    }));
  };

  useEffect(() => {
    dateOptionRefs.current[dateHighlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [dateHighlightIndex]);

  const handleDateKeyDown = (event) => {
    if (!expirationDates.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setDateDropdownOpen(true);
      setDateHighlightIndex((index) =>
        index >= expirationDates.length - 1 ? 0 : index + 1
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setDateDropdownOpen(true);
      setDateHighlightIndex((index) =>
        index <= 0 ? expirationDates.length - 1 : index - 1
      );
    }

    if (event.key === 'Enter' && dateDropdownOpen) {
      event.preventDefault();
      handleExpirationDateChange(expirationDates[dateHighlightIndex] || '');
    }

    if (event.key === 'Escape') setDateDropdownOpen(false);
  };

  useEffect(() => {
    setLabelData((previous) => {
      const validJobs =
        previous.shift === '1' ? SHIFT_1_JOBS : SHIFT_2_JOBS;

      if (validJobs.includes(previous.job)) return previous;

      return {
        ...previous,
        job: previous.shift === '1' ? 'A' : 'N'
      };
    });
  }, [labelData.shift]);

  const productionDate = getProductionDate();
  const dateParts = getDateParts(productionDate);
  const julianDay = getJulianDay(productionDate);
  const year = dateParts.yy;
  const jobCode = JOB_CODE_MAP[labelData.job] || '';

  const systemLotCode = systemCode.replace('S', '').padStart(2, '0');
  const generatedLot = `MX${julianDay}${year}${systemLotCode}${jobCode}`;
  const generatedSite = 'MDLZ8';
  const generatedWorkOrder =
    `MDLZFG${dateParts.mm}${dateParts.dd}${dateParts.yy}`;
  const generatedLicBase =
    `${year}${julianDay}${systemCode}${labelData.shift}${labelData.job}`;

  const generatedLabels = useMemo(() => {
    const labelQty = positiveInteger(labelData.labelQty);
    const palletQty = positiveInteger(labelData.palletQty);
    const startingPallet = positiveInteger(labelData.startingPallet);
    const labels = [];

    for (let palletIndex = 0; palletIndex < palletQty; palletIndex += 1) {
      const palletNumber = startingPallet + palletIndex;
      const lic = `${generatedLicBase}-${String(palletNumber).padStart(2, '0')}`;

      for (let copyIndex = 0; copyIndex < labelQty; copyIndex += 1) {
        labels.push({
          id: `auto-${palletNumber}-${copyIndex + 1}`,
          palletNumber,
          copyNumber: copyIndex + 1,
          item: buildAutoLabelItem(selectedProduct?.sku, systemCode),
          qty: labelData.qty,
          lot: generatedLot,
          dateCode: labelData.dateCode,
          lic,
          site: generatedSite,
          workOrder: generatedWorkOrder
        });
      }
    }

    return labels;
  }, [
    generatedLicBase,
    generatedLot,
    generatedSite,
    generatedWorkOrder,
    labelData.dateCode,
    labelData.labelQty,
    labelData.palletQty,
    labelData.qty,
    labelData.startingPallet,
    selectedProduct,
    systemCode
  ]);

  const generatedManualLabels = useMemo(() => {
    const labelQty = positiveInteger(manualLabelData.labelQty);
    const palletQty = positiveInteger(manualLabelData.palletQty);
    const startingPallet = positiveInteger(manualLabelData.startingPallet);
    const labels = [];

    for (let palletIndex = 0; palletIndex < palletQty; palletIndex += 1) {
      const palletNumber = startingPallet + palletIndex;
      const lic = buildManualLic(manualLabelData.lic, palletNumber);

      for (let copyIndex = 0; copyIndex < labelQty; copyIndex += 1) {
        labels.push({
          id: `manual-${palletNumber}-${copyIndex + 1}`,
          palletNumber,
          copyNumber: copyIndex + 1,
          item: manualLabelData.item,
          qty: manualLabelData.qty,
          lot: manualLabelData.lot,
          dateCode: formatDateCodeInput(manualLabelData.dateCode),
          lic,
          site: manualLabelData.site,
          workOrder: manualLabelData.workOrder
        });
      }
    }

    return labels;
  }, [manualLabelData]);

  const previewLabel =
    labelMode === 'auto'
      ? generatedLabels[0]
      : generatedManualLabels[0];

  useEffect(() => {
    const timeout = setTimeout(() => {
      document
        .querySelectorAll('svg[data-label-barcode="true"]')
        .forEach((element) => {
          const value = element.getAttribute('data-barcode-value');
          if (!value) {
            element.innerHTML = '';
            return;
          }

          try {
            const barcodeField = element.getAttribute('data-barcode-field');

            JsBarcode(element, value, {
              format: 'CODE128',
              displayValue: false,
              height: 42,
              width: barcodeField === 'item' ? 2 : 1.45,
              margin: 0
            });
          } catch (error) {
            console.error('Barcode render error:', error);
          }
        });
    }, 30);

    return () => clearTimeout(timeout);
  }, [labelMode, generatedLabels, generatedManualLabels]);

  const updateAuto = (field, value) => {
    if (field === 'job') {
      handleJobChange(value);
      return;
    }

    if (field === 'shift') {
      setLabelData((previous) => ({
        ...previous,
        shift: value,
        job: value === '1' ? 'A' : 'N'
      }));
      return;
    }

    setLabelData((previous) => ({ ...previous, [field]: value }));
  };

  const updateManual = (field, value) => {
    const nextValue =
      field === 'dateCode' ? value : toUppercaseValue(value);

    setManualLabelData((previous) => ({
      ...previous,
      [field]: nextValue
    }));
  };

  const printAutoLabels = async () => {
    if (!selectedProduct?.sku) {
      alert('Select a valid SKU from the database before printing.');
      return;
    }

    if (!labelData.dateCode) {
      alert('Select a valid expiration date for this Job before printing.');
      return;
    }

    if (!labelData.qty.trim()) {
      alert('Enter Qty before printing labels.');
      return;
    }

    const finalDateCode = formatDateCodeInput(labelData.dateCode);

    if (!isValidDateCode(finalDateCode)) {
      alert('Date Code must use MM/DD/YYYY format.');
      return;
    }

    const labels = generatedLabels.map((label) => ({
      ...label,
      dateCode: finalDateCode
    }));

    await sendLabelsToPrinter(labels, printer);

    setLabelData((previous) => ({
      ...previous,
      qty: ''
    }));
  };

  const printManualLabels = async () => {
    const firstLabel = generatedManualLabels[0];

    if (!firstLabel?.item.trim()) {
      alert('Enter Item# before printing.');
      return;
    }

    if (!firstLabel.qty.trim()) {
      alert('Enter Qty before printing.');
      return;
    }

    if (firstLabel.dateCode && !isValidDateCode(firstLabel.dateCode)) {
      alert('Date Code must use MM/DD/YYYY format.');
      return;
    }

    await sendLabelsToPrinter(generatedManualLabels, printer);
  };

  return (
    <div>
      <style>{`
        .label-mode-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }

        .label-mode-button {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #64748b;
          border-radius: 8px;
          padding: 10px 22px;
          font-size: 0.95rem;
          font-weight: 900;
          cursor: pointer;
        }

        .label-mode-button.active {
          background: #dc2626;
          border-color: #dc2626;
          color: white;
        }

        .label-sku-dropdown {
          position: absolute;
          z-index: 50;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          max-height: 260px;
          overflow-y: auto;
          background: #fff;
          border: 1px solid #94a3b8;
          border-radius: 8px;
          box-shadow: 0 12px 24px rgba(15,23,42,0.18);
        }

        .label-sku-option {
          width: 100%;
          border: none;
          border-bottom: 1px solid #e2e8f0;
          background: #fff;
          padding: 9px 10px;
          text-align: left;
          cursor: pointer;
          display: grid;
          gap: 2px;
        }

        .label-sku-option.highlighted,
        .label-sku-option:hover {
          background: #fee2e2;
        }

        .label-sku-option strong {
          color: #0f172a;
          font-size: 0.88rem;
        }

        .label-sku-option span {
          color: #64748b;
          font-size: 0.75rem;
        }

        .label-sku-description {
          margin-top: -6px;
          padding: 9px 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #475569;
          font-size: 0.76rem;
          font-weight: 800;
        }

        .label-inventory-message,
        .label-inventory-error {
          border-radius: 8px;
          padding: 9px 10px;
          font-size: 0.78rem;
          font-weight: 900;
          line-height: 1.35;
        }

        .label-inventory-message {
          background: #eff6ff;
          border: 1px solid #93c5fd;
          color: #1e40af;
        }


        .label-inventory-error {
          background: #fee2e2;
          border: 1px solid #f87171;
          color: #991b1b;
        }


        .label-workspace {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
        }

        .label-date-picker {
          position: relative;
        }

        .label-date-button {
          width: 100%;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid #94a3b8;
          border-radius: 8px;
          padding: 6px 10px;
          background: #fff;
          color: #0f172a;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
        }

        .label-date-menu {
          position: absolute;
          z-index: 80;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          max-height: 220px;
          overflow-y: auto;
          overscroll-behavior: contain;
          border: 1px solid #94a3b8;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 12px 26px rgba(15,23,42,0.18);
        }

        .label-date-option {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #e2e8f0;
          padding: 9px 12px;
          text-align: left;
          font-size: 0.94rem;
          font-weight: 900;
          cursor: pointer;
        }

        .label-date-option {
          background: #fff;
          color: #0f172a;
        }

        .label-date-option:hover {
          background: #eff6ff;
        }

        .label-date-option.highlighted {
          outline: 2px solid #2563eb;
          outline-offset: -2px;
        }

        .label-date-empty {
          padding: 12px;
          color: #64748b;
          font-weight: 800;
          text-align: center;
        }

        @media (max-width: 620px) {
          .label-preview-scale {
            transform: scale(0.78);
            transform-origin: top center;
            margin-bottom: -1.7in;
          }
        }
      `}</style>

      <div className="label-mode-tabs">
        <button
          type="button"
          className={`label-mode-button ${labelMode === 'auto' ? 'active' : ''}`}
          onClick={() => setLabelMode('auto')}
        >
          Auto Label
        </button>

        <button
          type="button"
          className={`label-mode-button ${labelMode === 'manual' ? 'active' : ''}`}
          onClick={() => setLabelMode('manual')}
        >
          Manual Label
        </button>
      </div>

      <div className="label-workspace">
        <SetupCard
          title={labelMode === 'auto' ? 'Auto Label Setup' : 'Manual Label Setup'}
        >
          {labelMode === 'auto' ? (
            <>
              <div style={{ position: 'relative' }}>
                <CompactControl label="SKU">
                  <input
                    value={skuSearch}
                    onChange={(event) => handleSkuInputChange(event.target.value)}
                    onFocus={() => {
                      if (!selectedProduct && skuSearch.trim()) {
                        setSkuDropdownOpen(true);
                      }
                    }}
                    onBlur={handleSkuBlur}
                    onKeyDown={handleSkuKeyDown}
                    placeholder={loadingSkuData ? 'Loading SKUs...' : 'Type or select SKU'}
                    autoComplete="off"
                    style={compactInput}
                  />
                </CompactControl>

                {skuDropdownOpen &&
                  !selectedProduct &&
                  skuSearch.trim() &&
                  filteredProducts.length > 0 && (
                  <div className="label-sku-dropdown">
                    {filteredProducts.slice(0, 30).map((product, index) => (
                      <button
                        key={product.id}
                        ref={(element) => {
                          skuOptionRefs.current[index] = element;
                        }}
                        type="button"
                        className={`label-sku-option ${
                          index === skuHighlightIndex ? 'highlighted' : ''
                        }`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectSku(product)}
                      >
                        <strong>{product.sku}</strong>
                        <span>{product.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedProduct?.description && (
                <div className="label-sku-description">
                  {selectedProduct.description}
                </div>
              )}

              <CompactControl label="Shift">
                <select
                  value={labelData.shift}
                  onChange={(event) => updateAuto('shift', event.target.value)}
                  style={compactInput}
                >
                  <option value="1">Shift 1</option>
                  <option value="2">Shift 2</option>
                </select>
              </CompactControl>

              <CompactControl label="Job">
                <select
                  value={labelData.job}
                  onChange={(event) => updateAuto('job', event.target.value)}
                  style={compactInput}
                >
                  {availableJobs.map((job) => (
                    <option key={job} value={job}>
                      Job {job}
                    </option>
                  ))}
                </select>
              </CompactControl>

              <CompactControl label="Exp. Date">
                <div className="label-date-picker">
                  <button
                    type="button"
                    className="label-date-button"
                    onClick={() => {
                      if (!selectedProduct || loadingExpDates) return;
                      const selectedIndex = expirationDates.indexOf(calculatedExpDate);
                      setDateHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
                      setDateDropdownOpen((previous) => !previous);
                    }}
                    onKeyDown={handleDateKeyDown}
                  >
                    <span>
                      {loadingExpDates
                        ? 'Loading fresh inventory...'
                        : calculatedExpDate || 'Select expiration date'}
                    </span>
                    <span>▼</span>
                  </button>

                  {dateDropdownOpen && (
                    <div className="label-date-menu" role="listbox">
                      {expirationDates.length === 0 ? (
                        <div className="label-date-empty">No dates available</div>
                      ) : (
                        expirationDates.map((date, index) => (
                          <button
                            key={date}
                            ref={(element) => {
                              dateOptionRefs.current[index] = element;
                            }}
                            type="button"
                            className={`label-date-option ${
                              index === dateHighlightIndex ? 'highlighted' : ''
                            }`}
                            onMouseEnter={() => setDateHighlightIndex(index)}
                            onClick={() => handleExpirationDateChange(date)}
                          >
                            {date}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </CompactControl>

              {inventoryMessage && (
                <div className="label-inventory-message">{inventoryMessage}</div>
              )}


              <QuantityControls data={labelData} onChange={updateAuto} />
            </>
          ) : (
            <QuantityControls data={manualLabelData} onChange={updateManual} />
          )}
        </SetupCard>

        <div
          style={{
            backgroundColor: '#e2e8f0',
            border: '1px solid #cbd5e1',
            borderRadius: '18px',
            padding: '18px',
            boxShadow: '0 12px 30px rgba(15,23,42,0.14)'
          }}
        >
          <div
            style={{
              backgroundColor: '#cbd5e1',
              color: '#111827',
              padding: '12px 16px',
              fontSize: '1.35rem',
              fontWeight: '900',
              textAlign: 'center',
              borderRadius: '12px 12px 0 0',
              border: '1px solid #94a3b8',
              borderBottom: 'none'
            }}
          >
            1NICO Pallet Label
          </div>

          <div
            className="label-preview-scale"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #94a3b8',
              borderRadius: '0 0 12px 12px',
              padding: '18px'
            }}
          >
            {labelMode === 'auto' ? (
              <EditableLabel
                label={previewLabel}
                editableFields={{
                  qty: true,
                  dateCode: false
                }}
                onChange={updateAuto}
                data={labelData}
              />
            ) : (
              <EditableLabel
                label={previewLabel}
                editableFields={{
                  item: true,
                  qty: true,
                  lot: true,
                  dateCode: true,
                  lic: true,
                  site: true,
                  workOrder: true
                }}
                onChange={updateManual}
                data={manualLabelData}
                manual
              />
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '16px'
            }}
          >
            <button
              type="button"
              onClick={
                labelMode === 'auto' ? printAutoLabels : printManualLabels
              }
              style={printButton}
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuantityControls({ data, onChange }) {
  return (
    <>
      <CompactControl label="Label Qty">
        <input
          type="number"
          min="1"
          value={data.labelQty}
          onChange={(event) => onChange('labelQty', event.target.value)}
          style={compactInput}
        />
      </CompactControl>

      <CompactControl label="Pallet Qty">
        <input
          type="number"
          min="1"
          value={data.palletQty}
          onChange={(event) => onChange('palletQty', event.target.value)}
          style={compactInput}
        />
      </CompactControl>

      <CompactControl label="Starting Pallet #">
        <input
          type="number"
          min="1"
          value={data.startingPallet}
          onChange={(event) => onChange('startingPallet', event.target.value)}
          style={compactInput}
        />
      </CompactControl>
    </>
  );
}

function SetupCard({ title, children }) {
  return (
    <div
      style={{
        width: '360px',
        backgroundColor: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '16px',
        boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          backgroundColor: '#e5e7eb',
          color: '#111827',
          padding: '14px 18px',
          fontSize: '1.05rem',
          fontWeight: '900',
          borderBottom: '1px solid #cbd5e1'
        }}
      >
        {title}
      </div>

      <div style={{ padding: '18px', display: 'grid', gap: '14px' }}>
        {children}
      </div>
    </div>
  );
}

function CompactControl({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: '6px' }}>
      <span style={{ color: '#334155', fontSize: '0.82rem', fontWeight: '900' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function EditableLabel({
  label,
  editableFields,
  onChange,
  data,
  manual = false
}) {
  const inputRefs = useRef({});
  const editableFieldOrder = [
    'item',
    'qty',
    'lot',
    'dateCode',
    'lic',
    'site',
    'workOrder'
  ].filter((field) => editableFields[field]);

  if (!label) return null;

  const focusNextEditableField = (currentField) => {
    const currentIndex = editableFieldOrder.indexOf(currentField);
    const nextField = editableFieldOrder[currentIndex + 1];

    if (nextField) {
      inputRefs.current[nextField]?.focus();
      inputRefs.current[nextField]?.select?.();
      return;
    }

    inputRefs.current[currentField]?.blur();
  };

  return (
    <div
      style={{
        width: '4in',
        minHeight: '8in',
        backgroundColor: '#fff',
        color: '#000',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '0.28in',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden'
      }}
    >
      <PreviewRow
        field="item"
        label="ITEM#"
        value={manual ? data.item : label.item}
        editable={editableFields.item}
        onChange={onChange}
        inputRef={(element) => {
          inputRefs.current.item = element;
        }}
        onEnter={focusNextEditableField}
        big
      />

      <PreviewRow
        field="qty"
        label="QTY"
        value={data.qty}
        editable={editableFields.qty}
        onChange={onChange}
        inputRef={(element) => {
          inputRefs.current.qty = element;
        }}
        onEnter={focusNextEditableField}
      />

      <PreviewRow
        field="lot"
        label="LOT"
        value={manual ? data.lot : label.lot}
        editable={editableFields.lot}
        onChange={onChange}
        inputRef={(element) => {
          inputRefs.current.lot = element;
        }}
        onEnter={focusNextEditableField}
        big
      />

      <PreviewRow
        field="dateCode"
        label="DATE CODE"
        value={data.dateCode}
        editable={editableFields.dateCode}
        onChange={onChange}
        inputRef={(element) => {
          inputRefs.current.dateCode = element;
        }}
        onEnter={focusNextEditableField}
        dateField
      />

      <PreviewRow
        field="lic"
        label="LIC#"
        value={manual ? data.lic : label.lic}
        barcodeValue={label.lic}
        editable={editableFields.lic}
        onChange={onChange}
        inputRef={(element) => {
          inputRefs.current.lic = element;
        }}
        onEnter={focusNextEditableField}
      />

      <PreviewRow
        field="site"
        label="SITE"
        value={manual ? data.site : label.site}
        editable={editableFields.site}
        onChange={onChange}
        inputRef={(element) => {
          inputRefs.current.site = element;
        }}
        onEnter={focusNextEditableField}
        small
      />

      <PreviewRow
        field="workOrder"
        label="WO"
        value={manual ? data.workOrder : label.workOrder}
        editable={editableFields.workOrder}
        onChange={onChange}
        inputRef={(element) => {
          inputRefs.current.workOrder = element;
        }}
        onEnter={focusNextEditableField}
      />
    </div>
  );
}

function PreviewRow({
  field,
  label,
  value,
  barcodeValue,
  editable,
  onChange,
  inputRef,
  onEnter,
  dateField,
  big,
  small
}) {
  const displayedBarcodeValue =
    barcodeValue === undefined ? value : barcodeValue;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '0.72in 1fr',
        columnGap: '0.1in',
        alignItems: 'start',
        marginBottom: big ? '0.16in' : '0.13in'
      }}
    >
      <div
        style={{
          textAlign: 'right',
          fontSize: label === 'DATE CODE' ? '0.125in' : '0.14in',
          fontWeight: '700',
          lineHeight: '1.05',
          paddingTop: '0.17in'
        }}
      >
        {label}:
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          width: '100%'
        }}
      >
        <BarcodeSvg value={displayedBarcodeValue} field={field} />

        {editable ? (
          <input
            ref={inputRef}
            data-label-input="true"
            value={value}
            onChange={(event) => {
              const nextValue = dateField
                ? formatDateCodeTyping(
                    event.target.value,
                    event.nativeEvent?.inputType
                  )
                : toUppercaseValue(event.target.value);

              onChange(field, nextValue);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;

              event.preventDefault();

              if (dateField) {
                onChange(field, formatDateCodeInput(event.currentTarget.value));
              }

              onEnter?.(field);
            }}
            onBlur={(event) => {
              if (dateField) {
                onChange(field, formatDateCodeInput(event.target.value));
              }
            }}
            placeholder={dateField ? 'MM/DD/YYYY' : label}
            style={previewInput}
          />
        ) : (
          <div
            style={{
              maxWidth: '100%',
              overflowWrap: 'anywhere',
              fontSize: big ? '0.22in' : small ? '0.16in' : '0.18in',
              fontWeight: '900',
              lineHeight: '1.05',
              marginTop: '0.02in'
            }}
          >
            {value}
          </div>
        )}
      </div>
    </div>
  );
}

function BarcodeSvg({ value, field }) {
  return (
    <svg
      data-label-barcode="true"
      data-barcode-value={value || ''}
      data-barcode-field={field || ''}
      style={{
        display: 'block',
        width: 'auto',
        maxWidth: 'none',
        height: '0.46in',
        margin: 0,
        overflow: 'visible'
      }}
    />
  );
}


function parseInventoryDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]));

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function formatDateForLabel(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(
    date.getDate()
  ).padStart(2, '0')}/${date.getFullYear()}`;
}


function getAutomaticShift(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();

  // Shift 2 starts at 6:01 PM and remains active through 6:00 AM.
  return minutes >= 18 * 60 + 1 || minutes < 6 * 60 + 1 ? '2' : '1';
}

function getProductionDate() {
  const productionDate = new Date();
  const minutes = productionDate.getHours() * 60 + productionDate.getMinutes();

  // The night shift belongs to the prior production date through 6:00 AM.
  if (minutes < 6 * 60 + 1) {
    productionDate.setDate(productionDate.getDate() - 1);
  }

  return productionDate;
}

function getJulianDay(date) {
  const year = date.getFullYear();
  const currentUtc = Date.UTC(year, date.getMonth(), date.getDate());
  const startUtc = Date.UTC(year, 0, 0);
  const julianDay = Math.floor((currentUtc - startUtc) / 86400000);

  return String(julianDay).padStart(3, '0');
}

function getDateParts(date) {
  return {
    mm: String(date.getMonth() + 1).padStart(2, '0'),
    dd: String(date.getDate()).padStart(2, '0'),
    yy: String(date.getFullYear()).slice(-2)
  };
}

function positiveInteger(value) {
  return Math.max(parseInt(value, 10) || 1, 1);
}

function buildManualLic(value, palletNumber) {
  const enteredValue = String(value || '').trim();
  if (!enteredValue) return '';

  // The operator enters the base. A typed ending such as -01 is removed.
  const base = enteredValue.replace(/-\d+$/, '');

  return `${base}-${String(palletNumber).padStart(2, '0')}`;
}

function formatDateCodeTyping(value, inputType = '') {
  const raw = String(value || '')
    .replace(/[^\d/]/g, '')
    .slice(0, 10);

  // Keep Backspace/Delete natural so the operator can correct the date.
  if (String(inputType || '').startsWith('delete')) {
    return raw;
  }

  const digits = raw.replace(/\D/g, '').slice(0, 8);

  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  // While typing, keep the year exactly as entered:
  // 032027 -> 03/20/27
  // 03202027 -> 03/20/2027
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatDateCodeInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let month = '';
  let day = '';
  let year = '';

  if (raw.includes('/')) {
    const parts = raw.split('/').map((part) => part.trim());

    if (parts.length !== 3) {
      return raw;
    }

    [month, day, year] = parts;
  } else {
    const digits = raw.replace(/\D/g, '');

    // MMDDYY -> MM/DD/20YY
    if (digits.length === 6) {
      month = digits.slice(0, 2);
      day = digits.slice(2, 4);
      year = `20${digits.slice(4, 6)}`;
    }
    // MMDDYYYY -> MM/DD/YYYY
    else if (digits.length === 8) {
      month = digits.slice(0, 2);
      day = digits.slice(2, 4);
      year = digits.slice(4, 8);
    } else {
      return raw;
    }
  }

  if (year.length === 2) {
    year = `20${year}`;
  }

  const monthNumber = parseInt(month, 10);
  const dayNumber = parseInt(day, 10);
  const cleanYear = String(year || '').replace(/\D/g, '');

  if (
    Number.isNaN(monthNumber) ||
    Number.isNaN(dayNumber) ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    dayNumber > 31 ||
    cleanYear.length !== 4
  ) {
    return raw;
  }

  // Reject impossible dates such as 02/31/2027.
  const testDate = new Date(
    Number(cleanYear),
    monthNumber - 1,
    dayNumber
  );

  if (
    testDate.getFullYear() !== Number(cleanYear) ||
    testDate.getMonth() !== monthNumber - 1 ||
    testDate.getDate() !== dayNumber
  ) {
    return raw;
  }

  return `${String(monthNumber).padStart(2, '0')}/${String(
    dayNumber
  ).padStart(2, '0')}/${cleanYear}`;
}

function isValidDateCode(value) {
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value);
}

function cleanZplValue(value) {
  return String(value || '').replace(/[\^~]/g, ' ').trim();
}

function buildZebraLabelZpl(label, printer) {
  const item = cleanZplValue(label.item);
  const qty = cleanZplValue(label.qty);
  const lot = cleanZplValue(label.lot);
  const dateCode = cleanZplValue(label.dateCode);
  const lic = cleanZplValue(label.lic);
  const site = cleanZplValue(label.site);
  const workOrder = cleanZplValue(label.workOrder);

  const isSystem234 = printer === 'system234';

  // System 1 uses the original 203-dpi size.
  // Systems 2–4 use the same physical layout scaled for 300 dpi.
  const scale = isSystem234 ? 300 / 203 : 1;
  const dot = (value) => Math.round(value * scale);

  const printWidth = isSystem234 ? 1200 : 812;
  const labelLength = isSystem234 ? 2400 : 1624;
  const barcodeModuleWidth = isSystem234 ? 3 : 2;

  // Compact centered block.
  const labelX = 72;
  const valueX = 220;

  return `^XA
^CI28
^PW${printWidth}
^LL${labelLength}
^LH0,${dot(105)}

^FO${dot(labelX)},${dot(35)}^A0N,${dot(30)},${dot(30)}^FDITEM#:^FS
^FO${dot(valueX)},${dot(8)}^BY${barcodeModuleWidth},2,${dot(62)}^BCN,${dot(62)},N,N,N^FD${item}^FS
^FO${dot(valueX)},${dot(76)}^A0N,${dot(42)},${dot(42)}^FD${item}^FS

^FO${dot(labelX)},${dot(205)}^A0N,${dot(30)},${dot(30)}^FDQTY:^FS
^FO${dot(valueX)},${dot(178)}^BY${barcodeModuleWidth},2,${dot(56)}^BCN,${dot(56)},N,N,N^FD${qty}^FS
^FO${dot(valueX)},${dot(242)}^A0N,${dot(42)},${dot(42)}^FD${qty}^FS

^FO${dot(labelX)},${dot(365)}^A0N,${dot(30)},${dot(30)}^FDLOT:^FS
^FO${dot(valueX)},${dot(338)}^BY${barcodeModuleWidth},2,${dot(62)}^BCN,${dot(62)},N,N,N^FD${lot}^FS
^FO${dot(valueX)},${dot(406)}^A0N,${dot(42)},${dot(42)}^FD${lot}^FS

^FO${dot(labelX)},${dot(525)}^A0N,${dot(27)},${dot(27)}^FDDATE^FS
^FO${dot(labelX)},${dot(554)}^A0N,${dot(27)},${dot(27)}^FDCODE:^FS
^FO${dot(valueX)},${dot(505)}^BY${barcodeModuleWidth},2,${dot(62)}^BCN,${dot(62)},N,N,N^FD${dateCode}^FS
^FO${dot(valueX)},${dot(575)}^A0N,${dot(42)},${dot(42)}^FD${dateCode}^FS

^FO${dot(labelX)},${dot(715)}^A0N,${dot(30)},${dot(30)}^FDLIC#:^FS
^FO${dot(valueX)},${dot(686)}^BY${barcodeModuleWidth},2,${dot(68)}^BCN,${dot(68)},N,N,N^FD${lic}^FS
^FO${dot(valueX)},${dot(762)}^A0N,${dot(40)},${dot(40)}^FD${lic}^FS

^FO${dot(labelX)},${dot(905)}^A0N,${dot(30)},${dot(30)}^FDSITE:^FS
^FO${dot(valueX)},${dot(878)}^BY${barcodeModuleWidth},2,${dot(58)}^BCN,${dot(58)},N,N,N^FD${site}^FS
^FO${dot(valueX)},${dot(944)}^A0N,${dot(36)},${dot(36)}^FD${site}^FS

^FO${dot(labelX)},${dot(1070)}^A0N,${dot(30)},${dot(30)}^FDWO:^FS
^FO${dot(valueX)},${dot(1042)}^BY${barcodeModuleWidth},2,${dot(62)}^BCN,${dot(62)},N,N,N^FD${workOrder}^FS
^FO${dot(valueX)},${dot(1112)}^A0N,${dot(36)},${dot(36)}^FD${workOrder}^FS

^XZ`;
}

async function sendLabelsToPrinter(labels, printer) {
  const zpl = labels
    .map((label) => buildZebraLabelZpl(label, printer))
    .join('\n');

  if (!zpl.trim()) {
    throw new Error('Generated ZPL is empty.');
  }

  try {
    const response = await fetch('http://10.1.1.156:5050/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        printer,
        zpl
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Unable to print labels.');
    }
  } catch (error) {
    console.error('Label print error:', error);
    alert(`Unable to print labels: ${error.message}`);
    throw error;
  }
}

const compactInput = {
  width: '100%',
  height: '38px',
  border: '1px solid #94a3b8',
  borderRadius: '8px',
  padding: '6px 10px',
  color: '#0f172a',
  backgroundColor: '#fff',
  fontSize: '0.95rem',
  fontWeight: '800',
  outline: 'none',
  boxSizing: 'border-box'
};

const previewInput = {
  width: '2.65in',
  maxWidth: '100%',
  border: '1px solid #9ca3af',
  borderRadius: '4px',
  padding: '0.04in 0.06in',
  boxSizing: 'border-box',
  color: '#000',
  backgroundColor: '#fff',
  fontSize: '0.18in',
  fontWeight: '900',
  outline: 'none',
  textAlign: 'left',
  marginTop: '0.02in'
};

const printButton = {
  backgroundColor: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '12px 22px',
  fontWeight: '900',
  cursor: 'pointer',
  boxShadow: '0 6px 14px rgba(220,38,38,0.18)'
};
