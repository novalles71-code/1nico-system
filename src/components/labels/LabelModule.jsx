import { useEffect, useMemo, useState } from 'react';
import JsBarcode from 'jsbarcode';

const SHIFT_1_JOBS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];
const SHIFT_2_JOBS = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];

const JOB_CODE_MAP = {
  A: '1', B: '4', C: '7', D: 'A', E: 'D', F: 'G',
  G: 'J', H: 'M', J: 'P', K: 'S', L: 'V', M: 'Y',
  N: '2', O: '5', P: '8', Q: 'B', R: 'E', S: 'H',
  T: 'K', U: 'N', V: 'Q', W: 'T', X: 'W', Y: 'Z'
};

export default function LabelModule({
  systemCode,
  printer,
  productNumber = ''
}) {
  const [labelMode, setLabelMode] = useState('auto');

  const [labelData, setLabelData] = useState({
    shift: '1',
    job: 'A',
    qty: '',
    dateCode: '',
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

  const availableJobs =
    labelData.shift === '1' ? SHIFT_1_JOBS : SHIFT_2_JOBS;

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
          item: productNumber,
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
    productNumber
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
            JsBarcode(element, value, {
              format: 'CODE128',
              displayValue: false,
              height: 42,
              width: 1.45,
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
    setLabelData((previous) => ({ ...previous, [field]: value }));
  };

  const updateManual = (field, value) => {
    setManualLabelData((previous) => ({ ...previous, [field]: value }));
  };

  const printAutoLabels = async () => {
    if (!productNumber.trim()) {
      alert('Item# is empty. Enter the product number in Run Total first.');
      return;
    }

    if (!labelData.qty.trim()) {
      alert('Enter Qty before printing labels.');
      return;
    }

    const finalDateCode = formatDateCodeInput(labelData.dateCode);

    if (!isValidDateCode(finalDateCode)) {
      alert('Date Code must use M/D/YYYY format.');
      return;
    }

    const labels = generatedLabels.map((label) => ({
      ...label,
      dateCode: finalDateCode
    }));

    await sendLabelsToPrinter(labels, printer);

    setLabelData((previous) => ({
      ...previous,
      qty: '',
      dateCode: ''
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
      alert('Date Code must use M/D/YYYY format.');
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

        .label-workspace {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
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
                  dateCode: true
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
  if (!label) return null;

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
        big
      />

      <PreviewRow
        field="qty"
        label="QTY"
        value={data.qty}
        editable={editableFields.qty}
        onChange={onChange}
      />

      <PreviewRow
        field="lot"
        label="LOT"
        value={manual ? data.lot : label.lot}
        editable={editableFields.lot}
        onChange={onChange}
        big
      />

      <PreviewRow
        field="dateCode"
        label="DATE CODE"
        value={data.dateCode}
        editable={editableFields.dateCode}
        onChange={onChange}
        dateField
      />

      <PreviewRow
        field="lic"
        label="LIC#"
        value={manual ? data.lic : label.lic}
        barcodeValue={label.lic}
        editable={editableFields.lic}
        onChange={onChange}
      />

      <PreviewRow
        field="site"
        label="SITE"
        value={manual ? data.site : label.site}
        editable={editableFields.site}
        onChange={onChange}
        small
      />

      <PreviewRow
        field="workOrder"
        label="WO"
        value={manual ? data.workOrder : label.workOrder}
        editable={editableFields.workOrder}
        onChange={onChange}
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
        <BarcodeSvg value={displayedBarcodeValue} />

        {editable ? (
          <input
            value={value}
            onChange={(event) => {
              const nextValue = dateField
                ? formatDateCodeTyping(
                    event.target.value,
                    event.nativeEvent?.inputType
                  )
                : event.target.value;

              onChange(field, nextValue);
            }}
            onBlur={(event) => {
              if (dateField) {
                onChange(field, formatDateCodeInput(event.target.value));
              }
            }}
            placeholder={dateField ? 'M/D/YYYY' : label}
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

function BarcodeSvg({ value }) {
  return (
    <svg
      data-label-barcode="true"
      data-barcode-value={value || ''}
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

function getProductionDate() {
  const productionDate = new Date();

  // A night-shift label remains on the prior production date until 6:00 AM.
  if (productionDate.getHours() < 6) {
    productionDate.setDate(productionDate.getDate() - 1);
  }

  return productionDate;
}

function getJulianDay(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const difference = date - start;

  return String(Math.floor(difference / 86400000)).padStart(3, '0');
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
  const raw = String(value || '').replace(/[^\d/]/g, '').slice(0, 10);

  // Let Backspace/Delete behave like a normal text field.
  if (String(inputType || '').startsWith('delete')) return raw;

  const digits = raw.replace(/\D/g, '').slice(0, 8);

  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatDateCodeInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let mm = '';
  let dd = '';
  let yyyy = '';

  if (raw.includes('/')) {
    const parts = raw.split('/').map((part) => part.trim());
    if (parts.length !== 3) return raw;

    mm = parts[0];
    dd = parts[1];
    yyyy = parts[2];
  } else {
    const digits = raw.replace(/\D/g, '');

    if (digits.length === 6) {
      mm = digits.slice(0, 2);
      dd = digits.slice(2, 4);
      yyyy = `20${digits.slice(4, 6)}`;
    } else if (digits.length === 8) {
      mm = digits.slice(0, 2);
      dd = digits.slice(2, 4);
      yyyy = digits.slice(4, 8);
    } else {
      return raw;
    }
  }

  if (yyyy.length === 2) {
    yyyy = `20${yyyy}`;
  }

  const monthNumber = parseInt(mm, 10);
  const dayNumber = parseInt(dd, 10);
  const year = String(yyyy || '').replace(/\D/g, '');

  if (
    Number.isNaN(monthNumber) ||
    Number.isNaN(dayNumber) ||
    year.length !== 4
  ) {
    return raw;
  }

  return `${String(monthNumber).padStart(2, '0')}/${String(
    dayNumber
  ).padStart(2, '0')}/${year}`;
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
  const scale = isSystem234 ? 300 / 203 : 1;
  const dot = (value) => Math.round(value * scale);

  const printWidth = isSystem234 ? 1200 : 812;
  const labelLength = isSystem234 ? 2400 : 1624;
  const labelHomeY = isSystem234 ? dot(120) : 120;
  const barcodeModuleWidth = isSystem234 ? 3 : 2;

  return `^XA
^CI28
~SD15
^PR6
^MTT
^MNY
^MMT
^PW${printWidth}
^LL${labelLength}
^LH0,${labelHomeY}
^FO${dot(70)},${dot(70)}^A0N,${dot(30)},${dot(30)}^FDITEM#:^FS
^FO${dot(230)},${dot(45)}^BY${barcodeModuleWidth},2,${dot(70)}^BCN,${dot(70)},N,N,N^FD${item}^FS
^FO${dot(230)},${dot(122)}^A0N,${dot(44)},${dot(44)}^FD${item}^FS
^FO${dot(70)},${dot(250)}^A0N,${dot(30)},${dot(30)}^FDQTY:^FS
^FO${dot(230)},${dot(220)}^BY${barcodeModuleWidth},2,${dot(60)}^BCN,${dot(60)},N,N,N^FD${qty}^FS
^FO${dot(230)},${dot(292)}^A0N,${dot(44)},${dot(44)}^FD${qty}^FS
^FO${dot(70)},${dot(420)}^A0N,${dot(30)},${dot(30)}^FDLOT:^FS
^FO${dot(230)},${dot(390)}^BY${barcodeModuleWidth},2,${dot(70)}^BCN,${dot(70)},N,N,N^FD${lot}^FS
^FO${dot(230)},${dot(468)}^A0N,${dot(44)},${dot(44)}^FD${lot}^FS
^FO${dot(70)},${dot(600)}^A0N,${dot(28)},${dot(28)}^FDDATE^FS
^FO${dot(70)},${dot(630)}^A0N,${dot(28)},${dot(28)}^FDCODE:^FS
^FO${dot(230)},${dot(585)}^BY${barcodeModuleWidth},2,${dot(70)}^BCN,${dot(70)},N,N,N^FD${dateCode}^FS
^FO${dot(230)},${dot(665)}^A0N,${dot(44)},${dot(44)}^FD${dateCode}^FS
^FO${dot(70)},${dot(820)}^A0N,${dot(30)},${dot(30)}^FDLIC#:^FS
^FO${dot(230)},${dot(790)}^BY${barcodeModuleWidth},2,${dot(75)}^BCN,${dot(75)},N,N,N^FD${lic}^FS
^FO${dot(230)},${dot(875)}^A0N,${dot(42)},${dot(42)}^FD${lic}^FS
^FO${dot(70)},${dot(1020)}^A0N,${dot(30)},${dot(30)}^FDSITE:^FS
^FO${dot(230)},${dot(990)}^BY${barcodeModuleWidth},2,${dot(65)}^BCN,${dot(65)},N,N,N^FD${site}^FS
^FO${dot(230)},${dot(1065)}^A0N,${dot(38)},${dot(38)}^FD${site}^FS
^FO${dot(70)},${dot(1200)}^A0N,${dot(30)},${dot(30)}^FDWO:^FS
^FO${dot(230)},${dot(1170)}^BY${barcodeModuleWidth},2,${dot(70)}^BCN,${dot(70)},N,N,N^FD${workOrder}^FS
^FO${dot(230)},${dot(1250)}^A0N,${dot(38)},${dot(38)}^FD${workOrder}^FS
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
    const response = await fetch('http://10.1.3.70:5050/print', {
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
