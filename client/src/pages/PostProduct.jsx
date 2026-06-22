import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

export default function PostProduct() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // Get product ID if editing
  const isEditMode = !!id;
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Hostel Items');
  const [hostelLocation, setHostelLocation] = useState(user?.hostel || 'Off-Campus');
  const [faculty, setFaculty] = useState(user?.faculty || 'Basic Medical & Health Sciences');
  const [imageFile, setImageFile] = useState(null);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = ['Hostel Items', 'Gadgets', 'Textbooks & Handouts', 'Services', 'Others'];

  const hostelsList = [
    'Bronze Hostel',
    'Silver Hostel',
    'Gold Hostel',
    'Platinum Hostel',
    'Jasper Hall',
    'Emerald Hall',
    'Pearl Hall',
    'Sapphire Hall',
    'Off-Campus'
  ];

  const facultiesList = [
    'Information Technology & Applied Sciences',
    'Basic Medical & Health Sciences',
    'Social & Management Sciences',
    'Arts, Education & Humanities',
    'Law'
  ];

  const getCategoryEmoji = (cat) => {
    switch (cat) {
      case 'Hostel Items': return '🏠';
      case 'Gadgets': return '💻';
      case 'Textbooks & Handouts': return '📚';
      case 'Services': return '🛠️';
      case 'Others': return '📦';
      default: return '🏷️';
    }
  };

  // Fetch product details for editing
  useEffect(() => {
    if (isEditMode && token) {
      const fetchProductDetails = async () => {
        try {
          const response = await fetch(`${API_URL}/api/products/${id}`);
          const data = await response.json();
          if (response.ok) {
            // Verify if logged in user is the owner
            if (data.seller?._id !== user?._id && data.seller !== user?._id) {
              setError('You are not authorized to edit this listing.');
              return;
            }
            setName(data.name);
            setPrice(data.price.toString());
            setDescription(data.description);
            setCategory(data.category);
            setHostelLocation(data.hostelLocation);
            setFaculty(data.faculty || 'None');
            setImage(data.image || '');
          } else {
            setError(data.message || 'Failed to fetch listing details');
          }
        } catch (err) {
          setError('Error loading listing details');
        }
      };
      fetchProductDetails();
    }
  }, [id, isEditMode, token, user]);

  // File uploader change handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('You must be logged in to modify listings');
      return;
    }

    setLoading(true);
    setError('');

    const url = isEditMode 
      ? `${API_URL}/api/products/${id}` 
      : `${API_URL}/api/products`;
      
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('hostelLocation', hostelLocation);
      formData.append('faculty', faculty);
      
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (image) {
        formData.append('image', image);
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save listing');
      }

      showToast(isEditMode ? 'Listing updated successfully! 📝' : 'Listing published successfully! 🚀', 'success');
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Error occurred while saving listing.');
      showToast(err.message || 'Error occurred while saving listing.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container} className="container animate-fade-in">
      <div style={styles.card} className="glass-panel">
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          ← Back
        </button>
        <h2 style={styles.title}>{isEditMode ? 'Edit Listing' : 'Post New Listing'}</h2>
        <p style={styles.subtitle}>
          {isEditMode 
            ? 'Update the details of your item or service listings.' 
            : 'Enter the details of your item or service to list it on the marketplace.'}
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Product / Service Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Panasonic Bedside Fridge"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input"
            />
          </div>

          <div style={styles.row}>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>Price (₦)</label>
              <input
                type="number"
                required
                placeholder="e.g. 45000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="glass-input"
              />
            </div>

            <div style={styles.fieldHalf}>
              <label style={styles.label}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="glass-input"
                style={styles.select}
              >
                {categories.map(c => (
                  <option key={c} value={c} style={styles.option}>{getCategoryEmoji(c)} {c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>Hostel Location</label>
              <select
                value={hostelLocation}
                onChange={(e) => setHostelLocation(e.target.value)}
                className="glass-input"
                style={styles.select}
              >
                {hostelsList.map(h => (
                  <option key={h} value={h} style={styles.option}>{h}</option>
                ))}
              </select>
            </div>

            <div style={styles.fieldHalf}>
              <label style={styles.label}>Faculty Location</label>
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="glass-input"
                style={styles.select}
              >
                {facultiesList.map(f => (
                  <option key={f} value={f} style={styles.option}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              required
              rows="4"
              placeholder="Describe the condition, age, specifications, or details of your services..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-input"
              style={styles.textarea}
            />
          </div>

          {/* Image Upload */}
          <div style={styles.field}>
            <label style={styles.label}>Product Image</label>
            <div style={styles.uploadBox}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={styles.fileInput}
                id="file-upload"
              />
              <label htmlFor="file-upload" style={styles.fileLabel}>
                {image ? (
                  <div style={styles.previewContainer}>
                    <img src={image} alt="Preview" style={styles.previewImg} />
                    <span style={styles.changeLabel}>Change Image</span>
                  </div>
                ) : (
                  <div style={styles.uploadPlaceholder}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Click to Upload Image (Max 5MB)</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button type="button" onClick={() => navigate('/')} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (isEditMode ? 'Updating...' : 'Publishing...') : (isEditMode ? 'Update Listing' : 'Publish Listing')}
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
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-gray)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginBottom: '20px',
    transition: 'var(--transition-smooth)',
  },
  card: {
    width: '100%',
    maxWidth: '640px',
    padding: '40px',
    border: '1px solid var(--border-color)',
  },
  title: {
    fontSize: '2rem',
    color: '#fff',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--text-gray)',
    fontSize: '0.9rem',
    marginBottom: '32px',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--error)',
    border: '1px solid var(--error)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '24px',
    fontSize: '0.85rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  row: {
    display: 'flex',
    gap: '20px',
  },
  fieldHalf: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-gray)',
  },
  select: {
    width: '100%',
    cursor: 'pointer',
  },
  option: {
    background: 'var(--bg-input)',
    color: 'var(--text-white)',
  },
  textarea: {
    resize: 'vertical',
  },
  uploadBox: {
    border: '2px dashed var(--border-color)',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  fileInput: {
    display: 'none',
  },
  fileLabel: {
    cursor: 'pointer',
    display: 'block',
    width: '100%',
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--text-gray)',
    fontSize: '0.9rem',
  },
  previewContainer: {
    position: 'relative',
    display: 'inline-block',
  },
  previewImg: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '6px',
    objectFit: 'contain',
  },
  changeLabel: {
    display: 'block',
    marginTop: '8px',
    color: 'var(--gold)',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '16px',
    marginTop: '8px',
  }
};
