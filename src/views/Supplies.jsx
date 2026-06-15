import { useEffect, useState } from 'react';
import {
  Package,
  Search,
  Download,
  Plus,
  ExternalLink,
  Save,
  X,
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Supplies() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [productLink, setProductLink] = useState('');
  const [loadingImport, setLoadingImport] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const { data, error } = await supabase
      .from('supplies')
      .select('*')
      .eq('enabled', true)
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setItems(data || []);
  }

  const filteredItems = items.filter((item) =>
    `${item.name || ''} ${item.model_no || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function updateSelected(field, value) {
    const updated = { ...selected, [field]: value };
    setSelected(updated);

    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  async function saveSelected() {
    if (!selected) return;

    const { error } = await supabase
      .from('supplies')
      .update({
        qty_text: selected.qty_text || '',
        qty_big: 0,
        qty_small: 0,
        notes: selected.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id);

    if (error) {
      console.error(error);
      alert('Unable to save product.');
      return;
    }

    alert('Saved.');
    setSelected(null);
    loadItems();
  }

  async function deleteSelected() {
    if (!selected) return;

    const confirmDelete = confirm(`Delete ${selected.name}?`);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('supplies')
      .update({ enabled: false })
      .eq('id', selected.id);

    if (error) {
      console.error(error);
      alert('Unable to delete product.');
      return;
    }

    setSelected(null);
    await loadItems();
  }

  async function addFromLink() {
    if (!productLink.trim()) {
      alert('Paste a product link first.');
      return;
    }

    setLoadingImport(true);

    const { data, error } = await supabase.functions.invoke(
      'import-product-from-link',
      {
        body: { url: productLink.trim() },
      }
    );

    setLoadingImport(false);

    if (error || !data) {
      console.error(error);
      alert('Unable to import product.');
      return;
    }

    const { error: insertError } = await supabase.from('supplies').insert([
      {
        name: data.name || 'New Supply',
        model_no: data.model_no || '',
        description: data.description || '',
        image_url: data.image_url || '',
        product_url: productLink.trim(),
        qty_text: '',
        qty_big: 0,
        qty_small: 0,
        notes: '',
        enabled: true,
      },
    ]);

    if (insertError) {
      console.error(insertError);
      alert('Unable to save product.');
      return;
    }

    setProductLink('');
    setShowAddModal(false);
    await loadItems();
    alert('Product added.');
  }

  async function resetQuantities() {
    const { error } = await supabase
      .from('supplies')
      .update({
        qty_text: '',
        qty_big: 0,
        qty_small: 0,
        notes: '',
        updated_at: new Date().toISOString(),
      })
      .eq('enabled', true);

    if (error) {
      console.error(error);
      alert('Report downloaded, but unable to reset quantities.');
      return;
    }

    setSelected(null);
    await loadItems();
  }

  async function downloadWord() {
    const selectedLines = items
      .filter((item) => String(item.qty_text || '').trim() !== '')
      .map((item) => {
        return `
          <li>
            <strong>${item.name}</strong>
            ${item.model_no ? ` - ${item.model_no}` : ''}
            = ${item.qty_text}
          </li>
        `;
      })
      .join('');

    const html = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body style="font-family: Arial, sans-serif;">
          <h1>Supplies Needed in Building 8</h1>
          <p>Date: ${new Date().toLocaleDateString('en-US')}</p>
          <hr />
          <ul>${selectedLines || '<li>No supplies entered.</li>'}</ul>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'supplies-needed-building-8.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    await resetQuantities();
  }

  return (
    <div style={pageStyle}>
      <style>
        {`
          @media (max-width: 900px) {
            .supplies-title-row {
              flex-direction: column;
              align-items: stretch !important;
            }

            .supplies-actions {
              width: 100%;
              flex-direction: column;
              align-items: stretch !important;
            }

            .supplies-search {
              width: 100% !important;
            }

            .supplies-main-panel {
              padding: 16px !important;
            }

            .supplies-layout {
              grid-template-columns: 1fr !important;
            }

            .supplies-gallery {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .supplies-detail {
              padding: 16px !important;
            }

            .supplies-large-image {
              height: 190px !important;
            }

            .supplies-button {
              width: 100%;
              justify-content: center;
            }
          }

          @media (max-width: 520px) {
            .supplies-container {
              padding: 16px !important;
            }

            .supplies-gallery {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 10px !important;
            }

            .supplies-card {
              padding: 10px !important;
            }

            .supplies-card-img {
              height: 90px !important;
            }
          }
        `}
      </style>

      <div style={topBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={brandStyle}>1NICO</span>
          <span style={{ fontWeight: '500', fontSize: '0.95rem', opacity: 0.9 }}>
            Workstation
          </span>
        </div>

        <div style={{ textAlign: 'right', lineHeight: '1.3' }}>
          <div style={{ fontWeight: '800', fontSize: '1.05rem' }}>
            Supplies
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.95 }}>
            {new Date().toLocaleDateString('en-US')}
          </div>
        </div>
      </div>

      <div className="supplies-container" style={containerStyle}>
        <div className="supplies-title-row" style={titleRowStyle}>
          <h1 style={titleStyle}>Supplies</h1>

          <div className="supplies-actions" style={actionsStyle}>
            <div className="supplies-search" style={searchBoxStyle}>
              <Search size={18} color="#64748b" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supply..."
                style={searchInputStyle}
              />
            </div>

            <button
              className="supplies-button"
              style={redButtonStyle}
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} />
              Add Item
            </button>

            <button
              className="supplies-button"
              style={greenButtonStyle}
              onClick={downloadWord}
            >
              <Download size={16} />
              Download Word
            </button>
          </div>
        </div>

        <div className="supplies-main-panel" style={mainPanelStyle}>
          <div className="supplies-layout" style={catalogLayoutStyle}>
            <div className="supplies-gallery" style={galleryStyle}>
              {filteredItems.map((item) => (
                <div
                  className="supplies-card"
                  key={item.id}
                  onClick={() => setSelected(item)}
                  style={{
                    ...productCardStyle,
                    borderColor:
                      selected?.id === item.id ? '#dc2626' : '#e2e8f0',
                  }}
                >
                  <div className="supplies-card-img" style={imageBoxStyle}>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={imageStyle}
                      />
                    ) : (
                      <Package size={34} color="#94a3b8" />
                    )}
                  </div>

                  <div style={cardNameStyle}>{item.name}</div>
                  <div style={cardModelStyle}>{item.model_no || 'No model'}</div>
                </div>
              ))}
            </div>

            <div className="supplies-detail" style={detailPanelStyle}>
              {selected ? (
                <>
                  <div style={detailCloseRowStyle}>
                    <button
                      onClick={() => setSelected(null)}
                      style={closePreviewButtonStyle}
                      title="Close preview"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="supplies-large-image" style={largeImageBoxStyle}>
                    {selected.image_url ? (
                      <img
                        src={selected.image_url}
                        alt={selected.name}
                        style={largeImageStyle}
                      />
                    ) : (
                      <Package size={60} color="#94a3b8" />
                    )}
                  </div>

                  <h2 style={productTitleStyle}>{selected.name}</h2>
                  <div style={modelStyle}>Model: {selected.model_no || 'N/A'}</div>

                  <p style={descriptionStyle}>
                    {selected.description || 'No description.'}
                  </p>

                  <div style={qtyBoxStyle}>
                    <label style={labelStyle}>Quantity Needed</label>
                    <input
                      type="text"
                      value={selected.qty_text || ''}
                      onChange={(e) =>
                        updateSelected('qty_text', e.target.value)
                      }
                      style={qtyTextInputStyle}
                      placeholder="Example: 2 boxes, 1 gallon..."
                    />
                  </div>

                  <textarea
                    value={selected.notes || ''}
                    onChange={(e) => updateSelected('notes', e.target.value)}
                    placeholder="Optional note..."
                    style={textareaStyle}
                  />

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="supplies-button"
                      onClick={saveSelected}
                      style={redButtonStyle}
                    >
                      <Save size={16} />
                      Save
                    </button>

                    {selected.product_url && (
                      <button
                        className="supplies-button"
                        onClick={() =>
                          window.open(selected.product_url, '_blank')
                        }
                        style={grayButtonStyle}
                      >
                        <ExternalLink size={16} />
                        Open Product
                      </button>
                    )}

                    <button
                      className="supplies-button"
                      onClick={deleteSelected}
                      style={deleteButtonStyle}
                    >
                      <Trash2 size={16} />
                      Delete Product
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ color: '#64748b', fontWeight: '700' }}>
                  Select a supply.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, color: '#1e293b' }}>Add Item</h2>

              <button
                onClick={() => setShowAddModal(false)}
                style={closeButtonStyle}
              >
                <X size={18} />
              </button>
            </div>

            <p style={mutedTextStyle}>
              Paste a product link. The system will try to get the product name,
              description and image.
            </p>

            <input
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              placeholder="Paste product link..."
              style={linkInputStyle}
              autoFocus
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                style={grayButtonStyle}
              >
                Cancel
              </button>

              <button
                onClick={addFromLink}
                style={redButtonStyle}
                disabled={loadingImport}
              >
                {loadingImport ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  backgroundColor: '#f1f5f9',
  minHeight: '100vh',
  fontFamily: 'system-ui, sans-serif',
};

const topBarStyle = {
  backgroundColor: '#dc2626',
  color: '#fff',
  padding: '14px 24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const brandStyle = {
  backgroundColor: '#fff',
  color: '#dc2626',
  fontWeight: '900',
  padding: '3px 8px',
  borderRadius: '4px',
  fontSize: '0.9rem',
};

const containerStyle = {
  padding: '24px',
  maxWidth: '1300px',
  margin: '0 auto',
};

const titleRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  marginBottom: '20px',
  flexWrap: 'wrap',
};

const titleStyle = {
  margin: 0,
  color: '#0f172a',
  fontSize: '1.8rem',
  fontWeight: '900',
};

const actionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap',
};

const searchBoxStyle = {
  width: '340px',
  maxWidth: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '10px 12px',
  backgroundColor: '#fff',
};

const searchInputStyle = {
  border: 'none',
  outline: 'none',
  width: '100%',
  fontSize: '0.95rem',
  color: '#334155',
  fontWeight: '600',
};

const mainPanelStyle = {
  backgroundColor: '#fff',
  padding: '24px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const catalogLayoutStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.15fr) minmax(360px, 0.85fr)',
  gap: '24px',
};

const galleryStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
  gap: '14px',
  alignContent: 'start',
};

const productCardStyle = {
  border: '2px solid #e2e8f0',
  borderRadius: '10px',
  padding: '12px',
  cursor: 'pointer',
  backgroundColor: '#fff',
};

const imageBoxStyle = {
  height: '105px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  marginBottom: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

const imageStyle = {
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
};

const cardNameStyle = {
  fontWeight: '800',
  color: '#1e293b',
  fontSize: '0.85rem',
  lineHeight: '1.25',
};

const cardModelStyle = {
  color: '#64748b',
  fontSize: '0.75rem',
  fontWeight: '700',
  marginTop: '4px',
};

const detailPanelStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '12px',
  padding: '20px',
  backgroundColor: '#fff',
};

const detailCloseRowStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginBottom: '8px',
};

const closePreviewButtonStyle = {
  backgroundColor: '#f8fafc',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '7px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const largeImageBoxStyle = {
  height: '220px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '16px',
  overflow: 'hidden',
};

const largeImageStyle = {
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
};

const productTitleStyle = {
  margin: '0 0 6px 0',
  color: '#0f172a',
  fontSize: '1.35rem',
  fontWeight: '900',
};

const modelStyle = {
  color: '#dc2626',
  fontWeight: '900',
  marginBottom: '12px',
};

const descriptionStyle = {
  color: '#475569',
  lineHeight: '1.45',
  fontWeight: '500',
  fontSize: '0.95rem',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.76rem',
  color: '#64748b',
  fontWeight: '900',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
};

const qtyBoxStyle = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '14px',
  marginBottom: '14px',
};

const qtyTextInputStyle = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '10px 12px',
  boxSizing: 'border-box',
  fontSize: '0.95rem',
  fontWeight: '800',
  color: '#0f172a',
  backgroundColor: '#fff',
};

const textareaStyle = {
  width: '100%',
  minHeight: '64px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '10px',
  boxSizing: 'border-box',
  marginBottom: '14px',
  color: '#334155',
  fontWeight: '600',
};

const redButtonStyle = {
  backgroundColor: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 16px',
  fontWeight: '900',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
};

const greenButtonStyle = {
  backgroundColor: '#22c55e',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 16px',
  fontWeight: '900',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
};

const grayButtonStyle = {
  backgroundColor: '#f8fafc',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '10px 16px',
  fontWeight: '900',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
};

const deleteButtonStyle = {
  backgroundColor: '#fff',
  color: '#dc2626',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '10px 16px',
  fontWeight: '900',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.72)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
};

const modalStyle = {
  width: '100%',
  maxWidth: '520px',
  backgroundColor: '#fff',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  padding: '24px',
  boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const closeButtonStyle = {
  backgroundColor: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '8px',
  cursor: 'pointer',
  display: 'inline-flex',
};

const mutedTextStyle = {
  color: '#64748b',
  fontWeight: '500',
  lineHeight: '1.5',
};

const linkInputStyle = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '12px',
  fontWeight: '700',
  color: '#334155',
  boxSizing: 'border-box',
  margin: '16px 0',
};