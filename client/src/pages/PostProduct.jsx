import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';
import { compressImage } from '../utils/imageCompressor';

// ── PRO: Shared form field definitions ────────────────────────────
const CATEGORIES  = ['Hostel Items', 'Gadgets', 'Clothing & Fashion', 'Textbooks & Handouts', 'Services', 'Others'];
const CONDITIONS  = ['New', 'Like New', 'Good', 'Fair'];
const HOSTELS     = ['Bronze Hostel','Silver Hostel','Gold Hostel','Platinum Hostel','Jasper Hall','Emerald Hall','Pearl Hall','Sapphire Hall','Off-Campus'];
const FACULTIES   = ['Information Technology & Applied Sciences','Basic Medical & Health Sciences','Social & Management Sciences','Arts, Education & Humanities','Law'];
const MTG_SPOTS   = [
  'Any Safe Campus Meeting Point',
  'LCU Senate Building Car Park',
  'LCU Student Center / Cafeteria',
  'Bronze Hostel Security Gate',
  'Silver Hostel Security Gate',
  'Gold Hostel Security Gate',
  'Platinum Hostel Lounge',
  'Jasper Hall Security Post',
  'Emerald Hall Common Area',
  'Pearl Hall Main Entrance',
  'Sapphire Hall Gate',
  'Off-Campus Location',
];

function emptyProduct(user) {
  return {
    name: '',
    price: '',
    originalPrice: '',
    description: '',
    category: 'Hostel Items',
    hostelLocation: user?.hostel || 'Off-Campus',
    facultyLocation: user?.faculty || 'Information Technology & Applied Sciences',
    agreedLocation: 'Any Safe Campus Meeting Point',
    condition: 'Good',
    productStatus: 'Available',
    isFeatured: false,
    images: [],         // array of { preview, file }
  };
}

function calcDiscountPct(price, orig) {
  if (!orig || !price || Number(orig) <= Number(price)) return null;
  return Math.round(((Number(orig) - Number(price)) / Number(orig)) * 100);
}

/* ─────────────────────────────────────────────────────────────────
   SINGLE PRODUCT FORM — used for both standard and PRO
───────────────────────────────────────────────────────────────── */
function ProductForm({ form, onChange, isPro, slotLabel = '' }) {
  const [compressing, setCompressing] = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const maxPhotos = isPro ? 5 : 3;
  const discountPct = calcDiscountPct(form.price, form.originalPrice);

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return null;
    setCompressing(true);
    try {
      const blob = await compressImage(file);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ preview: reader.result, file: blob });
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
    finally { setCompressing(false); }
  };

  const handleFilesChange = async (files) => {
    const remaining = maxPhotos - form.images.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const results   = await Promise.all(toProcess.map(processFile));
    const valid     = results.filter(Boolean);
    if (valid.length > 0) {
      onChange('images', [...form.images, ...valid]);
    }
  };

  const removeImage = (idx) => {
    onChange('images', form.images.filter((_, i) => i !== idx));
  };

  return (
    <div className="pp-product-form">
      {slotLabel && (
        <div className="pp-slot-label">{slotLabel}</div>
      )}

      {/* ── Basic Info ── */}
      <SectionDivider label="Basic Info" />

      <div className="pp-field">
        <label className="pp-label">Product / Service Title *</label>
        <input
          className="pp-input"
          type="text"
          required
          placeholder="e.g. Electric Kettle, Calculus Textbook…"
          value={form.name}
          onChange={e => onChange('name', e.target.value)}
        />
      </div>

      <div className="pp-grid-2">
        <div className="pp-field">
          <label className="pp-label">Selling Price (₦) *</label>
          <input
            className="pp-input"
            type="number"
            required
            placeholder="e.g. 25000"
            min="0"
            value={form.price}
            onChange={e => onChange('price', e.target.value)}
          />
        </div>
        {isPro && (
          <div className="pp-field">
            <label className="pp-label">
              Original Price (₦)
              <span className="pp-pro-tag">⭐ PRO</span>
            </label>
            <input
              className="pp-input"
              type="number"
              placeholder="e.g. 40000 (optional)"
              min="0"
              value={form.originalPrice}
              onChange={e => onChange('originalPrice', e.target.value)}
            />
            {discountPct && (
              <div className="pp-discount-preview">
                <span className="pp-discount-original">₦{Number(form.originalPrice).toLocaleString()}</span>
                <span className="pp-discount-arrow">→</span>
                <span className="pp-discount-sale">₦{Number(form.price).toLocaleString()}</span>
                <span className="pp-discount-badge">{discountPct}% OFF</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pp-grid-2">
        <div className="pp-field">
          <label className="pp-label">Category *</label>
          <select className="pp-input" value={form.category} onChange={e => onChange('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="pp-field">
          <label className="pp-label">
            Condition {isPro && <span className="pp-pro-tag">⭐ PRO</span>}
          </label>
          <select className="pp-input" value={form.condition} onChange={e => onChange('condition', e.target.value)}>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Location ── */}
      <SectionDivider label="Location" />

      <div className="pp-grid-2">
        <div className="pp-field">
          <label className="pp-label">Hostel / Residence *</label>
          <select className="pp-input" value={form.hostelLocation} onChange={e => onChange('hostelLocation', e.target.value)}>
            {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="pp-field">
          <label className="pp-label">Faculty *</label>
          <select className="pp-input" value={form.facultyLocation} onChange={e => onChange('facultyLocation', e.target.value)}>
            {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="pp-field">
        <label className="pp-label">Agreed Meeting Location *</label>
        <select className="pp-input" value={form.agreedLocation} onChange={e => onChange('agreedLocation', e.target.value)}>
          {MTG_SPOTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* ── Description ── */}
      <SectionDivider label="Details" />

      <div className="pp-field">
        <label className="pp-label">Description *</label>
        <textarea
          className="pp-input pp-textarea"
          required
          rows={4}
          placeholder="Describe the item condition, any warranty, reason for selling…"
          value={form.description}
          onChange={e => onChange('description', e.target.value)}
        />
      </div>

      {/* ── PRO: Status ── */}
      {isPro && (
        <div className="pp-field">
          <label className="pp-label">
            Product Status <span className="pp-pro-tag">⭐ PRO</span>
          </label>
          <select className="pp-input" value={form.productStatus} onChange={e => onChange('productStatus', e.target.value)}>
            <option value="Available">🟢 Available</option>
            <option value="Reserved">🟡 Reserved</option>
          </select>
        </div>
      )}

      {/* ── PRO: Featured toggle ── */}
      {isPro && (
        <div className="pp-featured-toggle" onClick={() => onChange('isFeatured', !form.isFeatured)}>
          <div className={`pp-toggle-track${form.isFeatured ? ' active' : ''}`}>
            <div className="pp-toggle-thumb" />
          </div>
          <div>
            <div className="pp-toggle-label">
              ⭐ Featured Listing <span className="pp-pro-tag">PRO</span>
            </div>
            <div className="pp-toggle-hint">Appear in the Featured Products section on the marketplace</div>
          </div>
        </div>
      )}

      {/* ── Photos ── */}
      <SectionDivider label={`Photos (${form.images.length}/${maxPhotos})`} />

      {/* Existing images grid */}
      {form.images.length > 0 && (
        <div className="pp-images-grid">
          {form.images.map((img, idx) => (
            <div key={idx} className="pp-image-thumb">
              <img src={img.preview || img} alt={`Photo ${idx + 1}`} />
              <button
                type="button"
                className="pp-image-remove"
                onClick={() => removeImage(idx)}
              >✕</button>
              {idx === 0 && <div className="pp-image-main-label">Main</div>}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {form.images.length < maxPhotos && (
        <div className="pp-field">
          <input
            type="file"
            accept="image/*"
            multiple
            id={`pp-photo-input-${slotLabel || 'main'}`}
            onChange={e => handleFilesChange(e.target.files)}
            style={{ display: 'none' }}
          />
          <label
            htmlFor={`pp-photo-input-${slotLabel || 'main'}`}
            className={`pp-upload-zone${dragOver ? ' drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async e => {
              e.preventDefault();
              setDragOver(false);
              await handleFilesChange(e.dataTransfer.files);
            }}
          >
            {compressing ? (
              <div className="pp-upload-placeholder">
                <span className="pp-upload-icon">⚙️</span>
                <span>Compressing images…</span>
              </div>
            ) : (
              <div className="pp-upload-placeholder">
                <span className="pp-upload-icon">📷</span>
                <span>Tap to add photos ({maxPhotos - form.images.length} remaining)</span>
                <span className="pp-upload-hint">
                  {isPro ? `PRO: up to ${maxPhotos} photos` : `Standard: up to ${maxPhotos} photos`} · Auto-compressed · Max 5 MB each
                </span>
              </div>
            )}
          </label>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function PostProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const isPro = user?.isPro === true;
  const isEdit = !!id;

  const [loading, setLoading]       = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [dualMode, setDualMode]     = useState(false);
  const [activeSlot, setActiveSlot] = useState(0); // 0 or 1 for dual mode

  const [forms, setForms] = useState([emptyProduct(user), emptyProduct(user)]);

  // ── Edit mode: load existing product ──────────────────────
  useEffect(() => {
    if (!id) return;
    setFetchingData(true);
    fetch(`${API_URL}/api/products/${id}`)
      .then(r => r.json())
      .then(data => {
        if (!data) return;
        const sellerId = data.seller?._id || data.seller;
        if (sellerId !== user?._id) {
          showToast('You are not authorized to edit this listing.', 'error');
          navigate('/profile');
          return;
        }
        // Build images array for edit mode
        const imgs = data.images?.length
          ? data.images.map(url => ({ preview: url, file: null }))
          : data.image ? [{ preview: data.image, file: null }] : [];

        setForms([{
          name: data.name || '',
          price: data.price || '',
          originalPrice: data.originalPrice || '',
          description: data.description || '',
          category: data.category || 'Hostel Items',
          hostelLocation: data.hostelLocation || 'Off-Campus',
          facultyLocation: data.faculty || 'Information Technology & Applied Sciences',
          agreedLocation: data.agreedLocation || 'Any Safe Campus Meeting Point',
          condition: data.condition || 'Good',
          productStatus: data.productStatus || data.status || 'Available',
          isFeatured: data.isFeatured || false,
          images: imgs,
        }, emptyProduct(user)]);
      })
      .catch(() => showToast('Failed to load listing for edit.', 'error'))
      .finally(() => setFetchingData(false));
  }, [id, user]);

  // ── Update a field in a form slot ─────────────────────────
  const updateForm = (slot, field, value) => {
    setForms(prev => {
      const next = [...prev];
      next[slot] = { ...next[slot], [field]: value };
      return next;
    });
  };

  // ── Build FormData for a single product slot ───────────────
  const buildPayload = (form) => {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('price', Number(form.price));
    if (form.originalPrice) fd.append('originalPrice', Number(form.originalPrice));
    fd.append('description', form.description);
    fd.append('category', form.category);
    fd.append('hostelLocation', form.hostelLocation);
    fd.append('faculty', form.facultyLocation);
    fd.append('agreedLocation', form.agreedLocation);
    fd.append('condition', form.condition);
    if (isPro) {
      fd.append('productStatus', form.productStatus);
      fd.append('isFeatured', form.isFeatured);
    }
    // Append image files
    form.images.forEach(img => {
      if (img.file) {
        fd.append('images', img.file, 'photo.jpg');
      } else if (img.preview && img.preview.startsWith('http')) {
        // Existing URL — send as string
        fd.append('images', img.preview);
      }
    });
    return fd;
  };

  // ── Submit one product ─────────────────────────────────────
  const submitProduct = async (form, editId) => {
    const method   = editId ? 'PUT' : 'POST';
    const endpoint = editId
      ? `${API_URL}/api/products/${editId}`
      : `${API_URL}/api/products`;

    const fd = buildPayload(form);

    const response = await fetch(endpoint, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to submit listing');
    return data;
  };

  // ── Main submit handler ────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const slotsToSubmit = dualMode ? [0, 1] : [0];
    for (const slot of slotsToSubmit) {
      const f = forms[slot];
      if (!f.name.trim() || !f.price || !f.description.trim()) {
        showToast(`Please fill out all required fields in Product ${slot + 1}.`, 'error');
        setActiveSlot(slot);
        return;
      }
      if (f.originalPrice && Number(f.originalPrice) <= Number(f.price)) {
        showToast(`Original price must be higher than selling price (Product ${slot + 1}).`, 'error');
        return;
      }
    }

    setLoading(true);
    try {
      for (const slot of slotsToSubmit) {
        await submitProduct(forms[slot], slot === 0 ? id : null);
      }
      showToast(
        isEdit
          ? 'Listing updated successfully! 🎉'
          : dualMode
            ? '2 Products listed successfully! 🎉'
            : 'Product listed successfully! 🎉',
        'success'
      );
      navigate(isPro ? '/pro-dashboard' : '/profile');
    } catch (err) {
      showToast(err.message || 'Connection error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.spinner} />
        <p style={styles.loaderText}>Loading listing details…</p>
      </div>
    );
  }

  return (
    <>
      <style>{cssOverrides}</style>
      <div className="pp-page animate-fade-in">
        <div className="pp-card">

          {/* ── Header ── */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="pp-badge">
              {isPro && <span className="pro-badge" style={{ marginRight: 6 }}>⭐ PRO</span>}
              <span>{isEdit ? '✏️' : '🏪'}</span>
              {isEdit ? 'Edit Mode' : 'New Listing'}
            </div>
            <h1 style={styles.title}>
              {isEdit ? 'Update Your Listing' : 'Publish a Product'}
            </h1>
            <p style={styles.subtitle}>
              {isEdit
                ? 'Make changes to your listing and save below.'
                : isPro
                  ? 'PRO seller — up to 20 active listings, 5 photos, discount pricing & more.'
                  : 'Sell, swap, or offer services to fellow LCU students.'}
            </p>
          </div>

          {/* ── PRO: Dual listing toggle ── */}
          {isPro && !isEdit && (
            <div className="pp-dual-toggle-bar">
              <div className="pp-dual-toggle-info">
                <span className="pp-dual-icon">📦📦</span>
                <div>
                  <div className="pp-dual-title">Dual Listing <span className="pp-pro-tag">PRO</span></div>
                  <div className="pp-dual-hint">Post 2 different products at once</div>
                </div>
              </div>
              <div
                className={`pp-toggle-track${dualMode ? ' active' : ''}`}
                onClick={() => { setDualMode(d => !d); setActiveSlot(0); }}
                style={{ cursor: 'pointer' }}
              >
                <div className="pp-toggle-thumb" />
              </div>
            </div>
          )}

          {/* ── Dual listing slot tabs ── */}
          {dualMode && (
            <div className="pp-slot-tabs">
              {[0, 1].map(i => (
                <button
                  key={i}
                  type="button"
                  className={`pp-slot-tab${activeSlot === i ? ' active' : ''}`}
                  onClick={() => setActiveSlot(i)}
                >
                  Product {i + 1}
                  {forms[i].name && <span className="pp-slot-tab-name"> — {forms[i].name.slice(0, 14)}{forms[i].name.length > 14 ? '…' : ''}</span>}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Show active slot if dual mode, otherwise just slot 0 */}
            {dualMode ? (
              <ProductForm
                key={activeSlot}
                form={forms[activeSlot]}
                onChange={(field, val) => updateForm(activeSlot, field, val)}
                isPro={isPro}
                slotLabel={`Product ${activeSlot + 1}`}
              />
            ) : (
              <ProductForm
                form={forms[0]}
                onChange={(field, val) => updateForm(0, field, val)}
                isPro={isPro}
              />
            )}

            {/* ── Action Buttons ── */}
            <div className="pp-actions">
              <button
                type="button"
                className="pp-btn pp-btn-cancel"
                onClick={() => navigate(isPro ? '/pro-dashboard' : '/profile')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pp-btn pp-btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    {isEdit ? 'Saving' : dualMode ? 'Publishing 2 Products' : 'Publishing'}
                    <span className="pp-loading-dot" />
                    <span className="pp-loading-dot" />
                    <span className="pp-loading-dot" />
                  </>
                ) : (
                  isEdit
                    ? '💾 Save Changes'
                    : dualMode
                      ? '🚀 Publish 2 Products'
                      : '🚀 Publish Listing'
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}

/* ── Helper component ── */
function SectionDivider({ label }) {
  return (
    <div className="pp-section-divider">
      <span className="pp-section-label">{label}</span>
      <div className="pp-divider-line" />
    </div>
  );
}

const styles = {
  title: {
    fontSize: 'clamp(1.4rem, 5vw, 1.9rem)',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '6px',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '0.88rem',
    color: 'var(--text-gray)',
    lineHeight: 1.5,
  },
  loaderWrap: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--border-color)',
    borderTop: '3px solid var(--gold)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: {
    color: 'var(--text-gray)',
    fontSize: '0.92rem',
  },
};

const cssOverrides = `
  .pp-page {
    padding: 24px 12px 80px;
    width: 100%;
    box-sizing: border-box;
  }
  .pp-card {
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    box-shadow: var(--glass-shadow);
    padding: 28px 16px;
    box-sizing: border-box;
  }
  @media (min-width: 480px) {
    .pp-page { padding: 32px 20px 80px; }
    .pp-card { padding: 36px 28px; }
  }
  @media (min-width: 680px) {
    .pp-page { padding: 40px 32px 80px; }
    .pp-card { padding: 40px 44px; }
  }

  /* PRO tag inline */
  .pp-pro-tag {
    display: inline-block;
    background: linear-gradient(135deg, #ca8a04, #eab308);
    color: #1a1200;
    font-size: 0.6rem;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 50px;
    margin-left: 6px;
    vertical-align: middle;
    letter-spacing: 0.04em;
  }

  /* Dual toggle bar */
  .pp-dual-toggle-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(202,138,4,0.08) 100%);
    border: 1px solid rgba(234,179,8,0.25);
    border-radius: 14px;
    padding: 14px 18px;
    margin-bottom: 18px;
    cursor: pointer;
    gap: 12px;
  }
  .pp-dual-toggle-info { display: flex; align-items: center; gap: 12px; }
  .pp-dual-icon { font-size: 1.8rem; }
  .pp-dual-title { font-weight: 700; font-size: 0.95rem; color: var(--text-primary); }
  .pp-dual-hint { font-size: 0.78rem; color: var(--text-gray); margin-top: 2px; }

  /* Toggle switch */
  .pp-toggle-track {
    width: 48px;
    height: 26px;
    background: rgba(255,255,255,0.12);
    border-radius: 999px;
    position: relative;
    transition: background 0.22s;
    flex-shrink: 0;
  }
  .pp-toggle-track.active { background: linear-gradient(135deg, #ca8a04, #eab308); }
  .pp-toggle-thumb {
    position: absolute;
    width: 20px; height: 20px;
    background: #fff;
    border-radius: 50%;
    top: 3px; left: 3px;
    transition: left 0.22s;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  .pp-toggle-track.active .pp-toggle-thumb { left: 25px; }

  /* Slot tabs */
  .pp-slot-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 0;
  }
  .pp-slot-tab {
    padding: 10px 18px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    color: var(--text-gray);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  }
  .pp-slot-tab.active {
    color: var(--gold, #eab308);
    border-bottom-color: var(--gold, #eab308);
  }
  .pp-slot-tab-name { opacity: 0.6; font-weight: 500; }

  /* Slot label */
  .pp-slot-label {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--gold, #eab308);
    margin-bottom: 8px;
  }

  /* Product form */
  .pp-product-form { display: flex; flex-direction: column; gap: 18px; }

  /* 2-col grid */
  .pp-grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 480px) { .pp-grid-2 { grid-template-columns: 1fr 1fr; } }

  /* Field */
  .pp-field { display: flex; flex-direction: column; gap: 7px; }
  .pp-label {
    font-size: 0.80rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  /* Input */
  .pp-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--bg-input);
    border: 1.5px solid var(--border-color);
    border-radius: 10px;
    padding: 13px 14px;
    color: var(--text-white);
    font-size: 0.95rem;
    font-family: var(--font-body);
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    outline: none;
    appearance: auto;
  }
  .pp-input:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.18);
    background: var(--bg-input-focus);
  }
  .pp-input::placeholder { color: var(--text-muted); }
  .pp-input option { background: var(--bg-input); color: var(--text-white); }
  .pp-textarea { resize: vertical; min-height: 110px; }

  /* Discount preview */
  .pp-discount-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 6px;
    padding: 8px 12px;
    background: rgba(16,185,129,0.08);
    border: 1px solid rgba(16,185,129,0.2);
    border-radius: 8px;
  }
  .pp-discount-original {
    font-size: 0.82rem;
    color: var(--text-gray);
    text-decoration: line-through;
  }
  .pp-discount-arrow { color: var(--text-muted); font-size: 0.8rem; }
  .pp-discount-sale { font-weight: 800; color: #10b981; font-size: 0.95rem; }
  .pp-discount-badge {
    background: rgba(16,185,129,0.2);
    color: #10b981;
    border-radius: 50px;
    padding: 2px 10px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  /* PRO Featured toggle */
  .pp-featured-toggle {
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(234,179,8,0.06);
    border: 1px solid rgba(234,179,8,0.18);
    border-radius: 12px;
    padding: 14px 16px;
    cursor: pointer;
  }
  .pp-toggle-label { font-weight: 700; font-size: 0.9rem; color: var(--text-primary); }
  .pp-toggle-hint { font-size: 0.76rem; color: var(--text-gray); margin-top: 2px; }

  /* Multi image grid */
  .pp-images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 10px;
    margin-bottom: 10px;
  }
  .pp-image-thumb {
    position: relative;
    aspect-ratio: 1;
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid var(--border-color);
  }
  .pp-image-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pp-image-remove {
    position: absolute;
    top: 4px; right: 4px;
    background: rgba(0,0,0,0.72);
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 22px; height: 22px;
    font-size: 0.7rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }
  .pp-image-main-label {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.7);
    color: #eab308;
    font-size: 0.6rem;
    font-weight: 800;
    text-align: center;
    padding: 3px;
    letter-spacing: 0.05em;
  }

  /* Upload zone */
  .pp-upload-zone {
    display: block;
    width: 100%;
    box-sizing: border-box;
    border: 2px dashed var(--border-strong);
    border-radius: 12px;
    cursor: pointer;
    text-align: center;
    background: rgba(0,0,0,0.12);
    transition: border-color 0.22s, background 0.22s;
    overflow: hidden;
  }
  .pp-upload-zone:hover, .pp-upload-zone.drag-over {
    border-color: var(--gold);
    background: rgba(59,130,246,0.06);
  }
  .pp-upload-placeholder {
    padding: 32px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-gray);
    font-size: 0.88rem;
    font-weight: 500;
  }
  .pp-upload-icon { font-size: 2rem; margin-bottom: 4px; }
  .pp-upload-hint { font-size: 0.72rem; opacity: 0.55; }

  /* Actions */
  .pp-actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 12px;
    margin-top: 12px;
  }
  @media (max-width: 360px) { .pp-actions { grid-template-columns: 1fr; } }

  /* Buttons */
  .pp-btn {
    padding: 15px;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 700;
    font-family: var(--font-body);
    border: none;
    cursor: pointer;
    transition: all 0.22s ease;
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .pp-btn-cancel {
    background: rgba(255,255,255,0.05);
    border: 1.5px solid var(--border-strong);
    color: var(--text-secondary);
  }
  .pp-btn-cancel:hover { background: rgba(255,255,255,0.10); color: var(--text-white); }
  .pp-btn-submit {
    background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
    color: #fff;
    box-shadow: 0 4px 20px rgba(59,130,246,0.35);
  }
  .pp-btn-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(59,130,246,0.50);
  }
  .pp-btn-submit:active:not(:disabled) { transform: translateY(0); }
  .pp-btn-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

  /* Section divider */
  .pp-section-divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 8px 0 2px;
  }
  .pp-section-label {
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }
  .pp-divider-line { flex: 1; height: 1px; background: var(--border-color); }

  /* Badge */
  .pp-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(59,130,246,0.12);
    border: 1px solid rgba(59,130,246,0.28);
    border-radius: 50px;
    padding: 4px 14px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-accent);
    margin-bottom: 12px;
  }

  /* Loading dots */
  .pp-loading-dot {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: rgba(255,255,255,0.9);
    animation: pp-dot-bounce 1.2s infinite;
  }
  .pp-loading-dot:nth-child(2) { animation-delay: 0.2s; }
  .pp-loading-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pp-dot-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
`;
