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
  const [facultyLocation, setFacultyLocation] = useState(user?.faculty || 'Information Technology & Applied Sciences');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [compressing, setCompressing] = useState(false);

  const categories = ['Hostel Items', 'Gadgets', 'Textbooks & Handouts', 'Services', 'Others'];
  
  const hostelsList = [
    'Bronze Hostel','Silver Hostel','Gold Hostel','Platinum Hostel',
    'Jasper Hall','Emerald Hall','Pearl Hall','Sapphire Hall','Off-Campus'
  ];

  const facultiesList = [
    'Information Technology & Applied Sciences',
    'Basic Medical & Health Sciences',
    'Social & Management Sciences',
    'Arts, Education & Humanities',
    'Law'
  ];

  // Fetch product data if in edit mode
  useEffect(() => {
    if (id) {
      setFetchingData(true);
      fetch(`${API_URL}/api/products/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            // Check authorization
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
            setFacultyLocation(data.facultyLocation || 'Information Technology & Applied Sciences');
            setImage(data.image || '');
          }
        })
        .catch(() => showToast('Failed to load listing for edit.', 'error'))
        .finally(() => setFetchingData(false));
    }
  }, [id, user]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setCompressing(true);
    try {
      const compressedBlob = await compressImage(file);
      setImageFile(compressedBlob);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(compressedBlob);
    } catch {
      showToast('Error compressing image.', 'error');
    } finally {
      setCompressing(false);
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
      const endpoint = isEdit ? `${API_URL}/api/products/${id}` : `${API_URL}/api/products/create`;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          price: Number(price),
          description,
          category,
          hostelLocation,
          facultyLocation,
          image // base64 string
        })
      });

      const data = await response.json();
      if (response.ok) {
        showToast(isEdit ? 'Listing updated successfully!' : 'Product listed successfully!', 'success');
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
      <div style={styles.center} className="container">
        <p>Loading listing details...</p>
      </div>
    );
  }

  return (
    <div style={styles.container} className="container animate-fade-in">
      <div style={styles.card} className="glass-panel">
        <h2 style={styles.title}>{id ? '✏️ Edit Listing' : '🚀 Post a Product / Service'}</h2>
        <p style={styles.subtitle}>
          List an item to sell, swap or offer student services on campus.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Product / Service Title *</label>
            <input
              type="text" required placeholder="e.g. Electric Kettle, calculus textbook, mini-fridge"
              value={name} onChange={e => setName(e.target.value)}
              className="glass-input"
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Price (₦) *</label>
              <input
                type="number" required placeholder="e.g. 5000" min="0"
                value={price} onChange={e => setPrice(e.target.value)}
                className="glass-input"
              />
            </div>
            
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="glass-input">
                {categories.map(c => (
                  <option key={c} value={c} style={styles.option}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Primary Location (Hostel) *</label>
              <select value={hostelLocation} onChange={e => setHostelLocation(e.target.value)} className="glass-input">
                {hostelsList.map(h => (
                  <option key={h} value={h} style={styles.option}>{h}</option>
                ))}
              </select>
            </div>
            
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Campus Faculty Location *</label>
              <select value={facultyLocation} onChange={e => setFacultyLocation(e.target.value)} className="glass-input">
                {facultiesList.map(f => (
                  <option key={f} value={f} style={styles.option}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Item Description *</label>
            <textarea
              required rows="5"
              placeholder="State the condition of the item, warranty (if any), reason for selling, and campus meet-up availability..."
              value={description} onChange={e => setDescription(e.target.value)}
              className="glass-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Upload Product Photo *</label>
            <div style={styles.fileUploadArea}>
              <input
                type="file" accept="image/*" id="product-photo"
                onChange={handleImageChange} style={{ display: 'none' }}
              />
              <label htmlFor="product-photo" style={styles.fileLabel}>
                {compressing ? (
                  <span>Compressing Image...</span>
                ) : image ? (
                  <div style={styles.imgPreviewContainer}>
                    <img src={image} alt="Preview" style={styles.imgPreview} />
                    <span style={styles.imgChangeHint}>Click to Change Image</span>
                  </div>
                ) : (
                  <div style={styles.uploadPlaceholder}>
                    <span>📷 Click to select an image from your device</span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: '4px' }}>Automatic mobile photo compression enabled</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button" onClick={() => navigate('/profile')}
              className="btn-secondary" style={{ flex: 1, padding: '14px' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading || compressing}
              className="btn-primary" style={{ flex: 2, padding: '14px' }}
            >
              {loading ? 'Submitting Listing...' : id ? 'Update Listing' : '🚀 Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '32px',
    paddingBottom: '60px',
  },
  center: {
    height: '50vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '36px 40px',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
  },
  title: {
    fontSize: '1.7rem',
    fontWeight: '800',
    color: '#fff',
    marginBottom: '6px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: 'var(--text-gray)',
    textAlign: 'center',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  row: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  option: {
    background: 'var(--bg-input)',
    color: 'var(--text-white)',
  },
  fileUploadArea: {
    width: '100%',
  },
  fileLabel: {
    display: 'block',
    width: '100%',
    border: '2px dashed var(--border-color)',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    transition: 'var(--transition-smooth)',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: 'var(--text-gray)',
    fontSize: '0.88rem',
    fontWeight: '500',
  },
  imgPreviewContainer: {
    position: 'relative',
    height: '240px',
    width: '100%',
    overflow: 'hidden',
  },
  imgPreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imgChangeHint: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: '0.8rem',
    padding: '8px',
    fontWeight: '600',
  }
};
