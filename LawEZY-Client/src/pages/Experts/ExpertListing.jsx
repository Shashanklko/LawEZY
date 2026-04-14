import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import ExpertCard from './components/ExpertCard';
import ExpertProfile from './ExpertProfile';
import Modal from '../../components/common/Modal';
import apiClient from '../../services/apiClient';
import './ExpertListing.css';

// Institutional Strategic Listing Component
const ExpertListing = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  const initialCategory = queryParams.get('category') || 'all';
  const initialSearch = queryParams.get('query') || '';

  const { user } = useAuthStore();
  const isProfessional = ['LAWYER', 'CA', 'CFA', 'PRO', 'EXPERT', 'PROFESSIONAL'].includes(user?.role?.toUpperCase());

  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [experts, setExperts] = useState([]);
  const [filteredExperts, setFilteredExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [priceRange, setPriceRange] = useState('Any Price');
  const [experienceRange, setExperienceRange] = useState('All Experience');
  const [sortBy, setSortBy] = useState('Recommended');
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  
  // Direct Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingExpert, setBookingExpert] = useState(null);
  const [bookingData, setBookingData] = useState({ date: '', time: '', reason: '', discountPercent: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenProfile = (id) => {
    setSelectedExpertId(id);
    setIsProfileOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileOpen(false);
    setSelectedExpertId(null);
  };

  const handleOpenBooking = (expert) => {
    if (!user) {
      alert("Please login to initiate institutional booking.");
      navigate('/login');
      return;
    }
    setBookingExpert(expert);
    setIsBookingOpen(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const scheduledAt = `${bookingData.date}T${bookingData.time}`;
      const payload = {
        clientUid: user.uid,
        expertUid: bookingExpert.uid,
        initiatorUid: user.uid,
        baseFee: bookingExpert.consultationFee || bookingExpert.price || 499.0,
        scheduledAt: scheduledAt,
        reason: bookingData.reason,
        discountPercent: parseFloat(bookingData.discountPercent)
      };

      await apiClient.post('/api/appointments/propose', payload);
      alert(`Strategic Proposal Dispatched to ${bookingExpert.name}.`);
      setIsBookingOpen(false);
      navigate('/dashboard');
    } catch (err) {
      alert("Institutional handshake failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Professionals' },
    { id: 'legal', label: 'Lawyers' },
    { id: 'financial', label: 'CAs & CFAs' }
  ];

  const allLegalDomains = [
    'Corporate Law', 'Family Law', 'IP & Patents', 'Criminal Defense', 'Real Estate', 'Arbitration', 'Civil Litigation'
  ];

  const allFinancialDomains = [
    'GST Compliance', 'Taxation', 'Audit & Assurance', 'Startup Finance', 'M&A', 'Wealth Management'
  ];

  const currentDomains = category === 'legal' ? allLegalDomains : category === 'financial' ? allFinancialDomains : [...allLegalDomains, ...allFinancialDomains];

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        const response = await apiClient.get('/api/professionals');
        const mappedExperts = response.data.map(ex => ({
          ...ex,
          category: ex.category === 'LAWYER' ? 'legal' : 'financial'
        }));
        setExperts(mappedExperts);
        setFilteredExperts(mappedExperts);
      } catch (err) {
        console.error('Error fetching professionals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExperts();
  }, []);

  useEffect(() => {
    if (loading) return;
    
    let result = [...experts];

    // 1. Category Filter
    if (category !== 'all') {
      result = result.filter(ex => ex.category === category);
    }

    // 2. Search Text Filter
    if (search) {
      const lowSearch = search.toLowerCase();
      result = result.filter(ex => 
        (ex.name?.toLowerCase().includes(lowSearch)) || 
        (ex.title?.toLowerCase().includes(lowSearch)) ||
        (ex.domains?.some(d => d.toLowerCase().includes(lowSearch)))
      );
    }

    // 3. Specialized Domains Filter (Multi-select)
    if (selectedDomains.length > 0) {
      result = result.filter(ex => 
        ex.domains.some(d => selectedDomains.includes(d))
      );
    }

    // 4. Price Filter
    if (priceRange !== 'Any Price') {
      result = result.filter(ex => {
        if (priceRange === 'Under ₹1,000') return ex.price < 1000;
        if (priceRange === '₹1,000 - ₹3,000') return ex.price >= 1000 && ex.price <= 3000;
        if (priceRange === '₹3,000 - ₹5,000') return ex.price > 3000 && ex.price <= 5000;
        if (priceRange === 'Over ₹5,000') return ex.price > 5000;
        return true;
      });
    }

    // 5. Experience Filter
    if (experienceRange !== 'All Experience') {
      result = result.filter(ex => {
        const years = parseInt(ex.experience || '0');
        if (experienceRange === '0-5 Years') return years >= 0 && years <= 5;
        if (experienceRange === '5-10 Years') return years > 5 && years <= 10;
        if (experienceRange === '10+ Years') return years > 10;
        return true;
      });
    }

    // 6. Tactical Sorting
    if (sortBy === 'Rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'Experience') {
      result.sort((a, b) => parseInt(b.experience || '0') - parseInt(a.experience || '0'));
    } else if (sortBy === 'Price: Low to High') {
      result.sort((a, b) => a.price - b.price);
    }

    setFilteredExperts(result);
  }, [category, search, selectedDomains, priceRange, experienceRange, sortBy]);

  const toggleDomain = (domain) => {
    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter(d => d !== domain));
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  return (
    <div className="expert-listing-page">
      <div className="listing-container">
        {/* SIDEBAR FILTERS */}
        <aside className="filters-sidebar">
          {isProfessional && (
            <button className="back-to-dashboard-listing-btn" onClick={() => navigate('/dashboard')}>
                ← Back to Dashboard
            </button>
          )}
          <div className="filter-group">
            <h4 className="filter-title">Category</h4>
            <div className="filter-options">
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  className={`filter-btn ${category === cat.id ? 'active' : ''}`}
                  onClick={() => { setCategory(cat.id); setSelectedDomains([]); }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h4 className="filter-title">Experience Seniority</h4>
            <select 
              className="filter-select"
              value={experienceRange}
              onChange={(e) => setExperienceRange(e.target.value)}
            >
              <option>All Experience</option>
              <option>0-5 Years</option>
              <option>5-10 Years</option>
              <option>10+ Years</option>
            </select>
          </div>

          <div className="filter-group">
            <h4 className="filter-title">Investment Range</h4>
            <select 
              className="filter-select" 
              value={priceRange} 
              onChange={(e) => setPriceRange(e.target.value)}
            >
              <option>Any Price</option>
              <option>Under ₹1,000</option>
              <option>₹1,000 - ₹3,000</option>
              <option>₹3,000 - ₹5,000</option>
              <option>Over ₹5,000</option>
            </select>
          </div>

          <div className="filter-group">
            <h4 className="filter-title">Strategic Domains</h4>
            <div className="domain-chips-filter">
              {currentDomains.map(domain => (
                <button 
                  key={domain}
                  className={`domain-chip-btn ${selectedDomains.includes(domain) ? 'selected' : ''}`}
                  onClick={() => toggleDomain(domain)}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="listing-main">
          <div className="listing-header-institutional">
            <div className="header-left">
              <h1>{category === 'all' ? 'Professional Network' : category === 'legal' ? 'Legal Advocates' : 'Financial Strategists'}</h1>
              <div className="listing-stats">
                <span className="count-pill">{filteredExperts.length} Specialists Online</span>
                <span className="verified-pill">Verified Elite Only</span>
              </div>
            </div>
            
            <div className="header-right-tactical">
              <div className="search-dock">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  type="text" 
                  placeholder="Search network..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="sort-dock">
                <span className="sort-label">Sort by</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option>Recommended</option>
                  <option>Rating</option>
                  <option>Experience</option>
                  <option>Price: Low to High</option>
                </select>
              </div>
            </div>
          </div>

          <div className="experts-grid">
            {loading ? (
              <div className="loading-grid">
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card" />)}
              </div>
            ) : filteredExperts.length > 0 ? (
              filteredExperts.map(expert => (
                <ExpertCard 
                  key={expert.id} 
                  expert={expert} 
                  onViewProfile={handleOpenProfile} 
                  onBookAppointment={handleOpenBooking}
                />
              ))
            ) : (
              <div className="no-results">
                <h3>No experts found matching your criteria.</h3>
                <button className="btn-clear-filters" onClick={() => { 
                  setCategory('all'); 
                  setSearch(''); 
                  setSelectedDomains([]); 
                  setPriceRange('Any Price');
                  setExperienceRange('All Experience');
                }}>Clear All Filters</button>
              </div>
            )}
          </div>
        </main>
      </div>

      <Modal isOpen={isProfileOpen} onClose={handleCloseProfile}>
        <ExpertProfile expertId={selectedExpertId} isModal={true} />
      </Modal>

      {/* Direct Booking Modal */}
      {isBookingOpen && bookingExpert && (
        <div className="modal-overlay-premium" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setIsBookingOpen(false)}>
          <div className="booking-modal-card animate-reveal-up" style={{ background: 'var(--heritage-parchment)', width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '35px', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--midnight-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: 'var(--strategic-gold)', fontSize: '1.5rem', boxShadow: '0 8px 20px rgba(13, 27, 42, 0.2)' }}>⚖️</div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, color: 'var(--midnight-primary)', margin: 0 }}>Direct Booking</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '5px' }}>Initiating institutional consultation with {bookingExpert.name}</p>
            </div>

            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '15px' }}>
                <div className="input-field-group">
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Preferred Date</label>
                  <input required type="date" min={new Date().toISOString().split('T')[0]} value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                </div>
                <div className="input-field-group">
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Time</label>
                  <input required type="time" value={bookingData.time} onChange={e => setBookingData({...bookingData, time: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                </div>
              </div>

              <div className="input-field-group">
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Reason for Consultation</label>
                <textarea required placeholder="Briefly describe your requirement..." value={bookingData.reason} onChange={e => setBookingData({...bookingData, reason: e.target.value})} rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'none' }} />
              </div>

              <div className="input-field-group" style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '15px', borderRadius: '14px', border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px' }}>Institutional Negotiation</label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#059669' }}>{bookingData.discountPercent}% Discount</span>
                </div>
                <input type="range" min="0" max="10" step="1" value={bookingData.discountPercent} onChange={e => setBookingData({...bookingData, discountPercent: e.target.value})} style={{ width: '100%', height: '6px', background: '#d1fae5', borderRadius: '5px', outline: 'none', cursor: 'pointer' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsBookingOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#e2e8f0', color: '#475569', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Abstain</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--midnight-primary)', color: 'var(--strategic-gold)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 15px rgba(13, 27, 42, 0.2)' }}>
                  {isSubmitting ? 'Dispatching...' : 'Submit Request →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertListing;
