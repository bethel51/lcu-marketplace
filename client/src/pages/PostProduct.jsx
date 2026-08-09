import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';
import { compressImage } from '../utils/imageCompressor';

export default function PostProduct() {
  const { id } = useParams(); // present if editing
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Hostel Items');
  const [hostelLocation, setHostelLocation] = useState(user?.hostel || 'Off-Campus');
  const [facultyLocation, setFacultyLocation] = useState(
    user?.faculty || 'Information Technology & Applied Sciences'
  );
  const [agreedLocation, setAgreedLocation] = useState('Any Safe Campus Meeting Point');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const categories = ['Hostel Items', 'Gadgets', 'Clothing & Fashion', 'Textbooks & Handouts', 'Services', 'Others'];

  const hostelsList = [
    'Bronze Hostel', 'Silver Hostel', 'Gold Hostel', 'Platinum Hostel',
    'Jasper Hall', 'Emerald Hall', 'Pearl Hall', 'Sapphire Hall', 'Off-Campus',
  ];

  const facultiesList = [
    'Information Technology & Applied Sciences',
    'Basic Medical & Health Sciences',
    'Social & Management Sciences',
    'Arts, Education & Humanities',
    'Law',
  ];

  // Fetch product data if in edit mode
  useEffect(() => {
    if (id) {
      setFetchingData(true);
      fetch(`${API_URL}/api/products/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            const sellerId = data.seller?._id || data.seller;
            if (sellerId !== user?._id) {
              showToast('You are not authorized to edit this listing.', 'error');
              navigate('/profile');
              return;
            }
            setName(data.name || '');
            setPrice(data.price || '');
            setDescription(data.description || '');
            setCategory(data.category || 'Hostel Items');
            setHostelLocation(data.hostelLocation || 'Off-Campus');
            setFacultyLocation(
              data.faculty || 'Information Technology & Applied Sciences'
            );
            setAgreedLocation(data.agreedLocation || 'Any Safe Campus Meeting Point');
            setImage(data.image || '');
          }
        })
        .catch(() => showToast('Failed to load listing for edit.', 'error'))
        .finally(() => setFetchingData(false));
    }
  }, [id, user]);

  const processImageFile = async (file) => {
    if (!file) return;
    setCompressing(true);
    try {
      const compressedBlob = await compressImage(file);
      setImageFile(compressedBlob);
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(compressedBlob);
    } catch {
      showToast('Error compressing image.', 'error');
    } finally {
      setCompressing(false);
    }
  };

  const handleImageChange = async (e) => {
    await processImageFile(e.target.files[0]);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await processImageFile(file);
    } else {
      showToast('Please drop a valid image file.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price || !description.trim()) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const isEdit = !!id;
      const method = isEdit ? 'PUT' : 'POST';
      // FIX: correct endpoint — backend mounts at /api/products (not /api/products/create)
      const endpoint = isEdit
        ? `${API_URL}/api/products/${id}`
        : `${API_URL}/api/products`;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          price: Number(price),
          description,
          category,
          hostelLocation,
          faculty: facultyLocation,
          agreedLocation,
          image,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast(
          isEdit ? 'Listing updated successfully! 🎉' : 'Product listed successfully! 🎉',
          'success'
        );
        navigate('/profile');
      } else {
        showToast(data.message || 'Failed to submit listing', 'error');
      }
    } catch (err) {
      showToast('Connection error. Please try again.', 'error');
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

  const isEdit = !!id;

  return (
    <>
      <style>{cssOverrides}</style>
      <div className="pp-page animate-fade-in">
        <div className="pp-card">

          {/* ── Header ── */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="pp-badge">
              <span>{isEdit ? '✏️' : '🏪'}</span>
              {isEdit ? 'Edit Mode' : 'New Listing'}
            </div>
            <h1 style={styles.title}>
              {isEdit ? 'Update Your Listing' : 'Publish a Product'}
            </h1>
            <p style={styles.subtitle}>
              {isEdit
                ? 'Make changes to your listing and save below.'
                : 'Sell, swap, or offer services to fellow LCU students.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* ── Basic Info ── */}
            <SectionDivider label="Basic Info" />

            <div className="pp-field">
              <label className="pp-label">Product / Service Title *</label>
              <input
                className="pp-input"
                type="text"
                required
                placeholder="e.g. Electric Kettle, Calculus Textbook, Mini-fridge…"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="pp-grid-2">
              <div className="pp-field">
                <label className="pp-label">Price (₦) *</label>
                <input
                  className="pp-input"
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
              </div>
              <div className="pp-field">
                <label className="pp-label">Category *</label>
                <select
                  className="pp-input"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Location ── */}
            <SectionDivider label="Location" />

            <div className="pp-grid-2">
              <div className="pp-field">
                <label className="pp-label">Hostel / Residence *</label>
                <select
                  className="pp-input"
                  value={hostelLocation}
                  onChange={e => setHostelLocation(e.target.value)}
                >
                  {hostelsList.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="pp-field">
                <label className="pp-label">Faculty *</label>
                <select
                  className="pp-input"
                  value={facultyLocation}
                  onChange={e => setFacultyLocation(e.target.value)}
                >
                  {facultiesList.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pp-field">
              <label className="pp-label">Agreed Meeting Location *</label>
              <select
                className="pp-input"
                value={agreedLocation}
                onChange={e => setAgreedLocation(e.target.value)}
              >
                <option value="Any Safe Campus Meeting Point">Any Safe Campus Meeting Point</option>
                <option value="LCU Senate Building Car Park">LCU Senate Building Car Park</option>
                <option value="LCU Student Center / Cafeteria">LCU Student Center / Cafeteria</option>
                <option value="Bronze Hostel Security Gate">Bronze Hostel Security Gate</option>
                <option value="Silver Hostel Security Gate">Silver Hostel Security Gate</option>
                <option value="Gold Hostel Security Gate">Gold Hostel Security Gate</option>
                <option value="Platinum Hostel Lounge">Platinum Hostel Lounge</option>
                <option value="Jasper Hall Security Post">Jasper Hall Security Post</option>
                <option value="Emerald Hall Common Area">Emerald Hall Common Area</option>
                <option value="Pearl Hall Main Entrance">Pearl Hall Main Entrance</option>
                <option value="Sapphire Hall Gate">Sapphire Hall Gate</option>
                <option value="Off-Campus Location">Off-Campus Location</option>
              </select>
            </div>

            {/* ── Description ── */}
            <SectionDivider label="Details" />

            <div className="pp-field">
              <label className="pp-label">Description *</label>
              <textarea
                className="pp-input pp-textarea"
                required
                rows={5}
                placeholder="Describe the item condition, any warranty, reason for selling, and where you can meet on campus…"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* ── Photo ── */}
            <SectionDivider label="Photo" />

            <div className="pp-field">
              <label className="pp-label">Product Photo</label>
              <input
                type="file"
                accept="image/*"
                id="pp-photo-input"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="pp-photo-input"
                className={`pp-upload-zone${dragOver ? ' drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {compressing ? (
                  <div className="pp-upload-placeholder">
                    <span className="pp-upload-icon">⚙️</span>
                    <span>Compressing image…</span>
                  </div>
                ) : image ? (
                  <div className="pp-img-preview-wrap">
                    <img src={image} alt="Preview" className="pp-img-preview" />
                    <div className="pp-img-overlay">📷 Tap to change photo</div>
                  </div>
                ) : (
                  <div className="pp-upload-placeholder">
                    <span className="pp-upload-icon">📷</span>
                    <span>Tap to select or drag &amp; drop an image</span>
                    <span className="pp-upload-hint">Auto-compressed · JPG, PNG, WebP · Max 5 MB</span>
                  </div>
                )}
              </label>
            </div>

            {/* ── Action Buttons ── */}
            <div className="pp-actions">
              <button
                type="button"
                className="pp-btn pp-btn-cancel"
                onClick={() => navigate('/profile')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pp-btn pp-btn-submit"
                disabled={loading || compressing}
              >
                {loading ? (
                  <>
                    {isEdit ? 'Saving' : 'Publishing'}
                    <span className="pp-loading-dot" />
                    <span className="pp-loading-dot" />
                    <span className="pp-loading-dot" />
                  </>
                ) : (
                  isEdit ? '💾 Save Changes' : 'Publish Listing'
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

/* ── JS-side style object ── */
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

/* ── Responsive CSS injected via <style> tag ── */
const cssOverrides = `
  .pp-page {
    padding: 24px 12px 80px;
    width: 100%;
    box-sizing: border-box;
  }
  .pp-card {
    width: 100%;
    max-width: 700px;
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

  /* 2-col grid — stacks on mobile */
  .pp-grid-2 {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  @media (min-width: 480px) {
    .pp-grid-2 { grid-template-columns: 1fr 1fr; }
  }

  /* Field */
  .pp-field { display: flex; flex-direction: column; gap: 7px; }
  .pp-label {
    font-size: 0.80rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  /* Input / Select / Textarea */
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
  .pp-textarea { resize: vertical; min-height: 120px; }

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
    padding: 44px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-gray);
    font-size: 0.88rem;
    font-weight: 500;
  }
  .pp-upload-icon { font-size: 2.4rem; margin-bottom: 4px; }
  .pp-upload-hint { font-size: 0.72rem; opacity: 0.55; }
  .pp-img-preview-wrap { position: relative; height: 240px; width: 100%; overflow: hidden; }
  .pp-img-preview { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pp-img-overlay {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.72);
    color: #fff;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 10px;
    letter-spacing: 0.03em;
  }

  /* Actions */
  .pp-actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 12px;
    margin-top: 12px;
  }
  @media (max-width: 360px) {
    .pp-actions { grid-template-columns: 1fr; }
  }

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
  .pp-btn-cancel:hover {
    background: rgba(255,255,255,0.10);
    color: var(--text-white);
  }
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
