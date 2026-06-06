import { useState, useMemo, useEffect } from "react";
import { DigitronLoader, Icon } from "../components/ui";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProducts, updateProduct, fetchQuotes, loginAdmin, fetchPopularProducts, addProduct, deleteProduct, toggleProductVisibility, fetchCategories, updateQuoteStatus, fetchSettings, saveSettings, resetSettings } from '../services/api';
import siteConfig from "../data/siteConfig";

const settingsToForm = (settings) => ({
  storeName: settings.storeName,
  storeTagline: settings.storeTagline,
  whatsappNumber: settings.whatsappNumber,
  phoneNumber: settings.phoneNumber,
  email: settings.email,
  salesEmail: settings.salesEmail,
  addressLine1: settings.address?.line1 || "",
  addressLine2: settings.address?.line2 || "",
  addressState: settings.address?.state || "",
  hoursWeekday: settings.hours?.weekday || "",
  hoursWeekend: settings.hours?.weekend || "",
  socialFacebook: settings.social?.facebook || "#",
  socialInstagram: settings.social?.instagram || "#",
  socialYoutube: settings.social?.youtube || "#",
  enableReviews: settings.features?.enableReviews ?? localStorage.getItem('ae_enable_reviews') !== 'false',
  enableCalculator: settings.features?.enableCalculator ?? localStorage.getItem('ae_enable_calculator') !== 'false'
});

const formToSettings = (settingsForm) => ({
  storeName: settingsForm.storeName,
  storeTagline: settingsForm.storeTagline,
  whatsappNumber: settingsForm.whatsappNumber,
  phoneNumber: settingsForm.phoneNumber,
  email: settingsForm.email,
  salesEmail: settingsForm.salesEmail,
  address: {
    line1: settingsForm.addressLine1,
    line2: settingsForm.addressLine2,
    state: settingsForm.addressState,
  },
  hours: {
    weekday: settingsForm.hoursWeekday,
    weekend: settingsForm.hoursWeekend,
  },
  social: {
    facebook: settingsForm.socialFacebook,
    instagram: settingsForm.socialInstagram,
    youtube: settingsForm.socialYoutube,
  },
  features: {
    enableReviews: settingsForm.enableReviews,
    enableCalculator: settingsForm.enableCalculator,
  }
});

const persistSettingsLocally = (settings) => {
  const { features, ...configOverrides } = settings;
  localStorage.setItem('ae_site_config', JSON.stringify(configOverrides));
  localStorage.setItem('ae_enable_reviews', features?.enableReviews ? 'true' : 'false');
  localStorage.setItem('ae_enable_calculator', features?.enableCalculator ? 'true' : 'false');
};

export default function AdminPage({ showToast }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!sessionStorage.getItem("ae_admin_token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  // Add Product form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", brand: "", category: "Cameras", price: "", stock: "In Stock" });

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState(null);

  // Webpage Display Manager State
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [displaySearch, setDisplaySearch] = useState("");
  const [displayFilter, setDisplayFilter] = useState("all"); // "all" | "live" | "hidden"
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);

  // Settings tab form state
  const [settingsForm, setSettingsForm] = useState(() => {
    return settingsToForm(siteConfig);
  });

  const token = sessionStorage.getItem("ae_admin_token");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await loginAdmin(username, password);
      sessionStorage.setItem("ae_admin_token", data.token);
      setIsAuthenticated(true);
      showToast("Logged in successfully");
    } catch {
      showToast("Invalid credentials");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("ae_admin_token");
    setIsAuthenticated(false);
    showToast("Logged out");
  };

  const queryClient = useQueryClient();

  const { data: allProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => fetchProducts(null, null, true),
    enabled: isAuthenticated
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: isAuthenticated
  });

  const { data: allQuotes = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ['admin-quotes'],
    queryFn: () => fetchQuotes(token),
    enabled: isAuthenticated && (activeTab === 'quotes' || activeTab === 'dashboard')
  });

  const { data: popularProducts = [], isLoading: loadingPopular } = useQuery({
    queryKey: ['admin-popular-products'],
    queryFn: fetchPopularProducts,
    enabled: isAuthenticated && activeTab === 'dashboard'
  });

  const { data: savedSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: fetchSettings,
    enabled: isAuthenticated && activeTab === 'settings'
  });

  useEffect(() => {
    if (savedSettings) {
      window.setTimeout(() => setSettingsForm(settingsToForm(savedSettings)), 0);
      persistSettingsLocally(savedSettings);
    }
  }, [savedSettings]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      showToast("Product updated successfully!");
    },
    onError: () => showToast("Error updating product. Session might be expired.")
  });

  const addMutation = useMutation({
    mutationFn: (data) => addProduct(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      showToast("Product added successfully!");
    },
    onError: () => showToast("Error adding product")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      showToast("Product removed successfully!");
    },
    onError: () => showToast("Error removing product")
  });

  const visibilityMutation = useMutation({
    mutationFn: (id) => toggleProductVisibility(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      showToast("Visibility toggled!");
    },
    onError: () => showToast("Error updating visibility")
  });

  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, status }) => updateQuoteStatus(id, status, token),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-quotes'] });
      const previousQuotes = queryClient.getQueryData(['admin-quotes']);
      queryClient.setQueryData(['admin-quotes'], (old = []) =>
        old.map(q => q.id === id ? { ...q, status } : q)
      );
      return { previousQuotes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      showToast("Quote status updated!");
    },
    onError: (_error, _variables, context) => {
      if (context?.previousQuotes) queryClient.setQueryData(['admin-quotes'], context.previousQuotes);
      showToast("Error updating quote status");
    }
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (data) => saveSettings(data, token),
    onSuccess: (result) => {
      persistSettingsLocally(result.settings);
      queryClient.setQueryData(['site-settings'], result.settings);
      showToast("Settings saved successfully! Refreshing page to apply...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: () => showToast("Error saving settings. Session might be expired.")
  });

  const resetSettingsMutation = useMutation({
    mutationFn: () => resetSettings(token),
    onSuccess: (result) => {
      localStorage.removeItem('ae_site_config');
      localStorage.removeItem('ae_enable_reviews');
      localStorage.removeItem('ae_enable_calculator');
      queryClient.setQueryData(['site-settings'], result.settings);
      showToast("Configuration reset! Reloading...");
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    },
    onError: () => showToast("Error resetting settings. Session might be expired.")
  });

  const stats = useMemo(() => {
    return {
      total: allProducts.length,
      lowStock: allProducts.filter(p => p.stock !== 'In Stock').length,
      recentQuotes: allQuotes.slice(0, 5),
      quoteCount: allQuotes.length
    };
  }, [allProducts, allQuotes]);

  const filteredProducts = useMemo(() => allProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  ), [allProducts, searchTerm]);

  const displayFilteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      // Category filter
      if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
      
      // Search filter
      if (displaySearch) {
        const term = displaySearch.toLowerCase();
        if (!p.name.toLowerCase().includes(term) && !p.brand.toLowerCase().includes(term)) return false;
      }
      
      // Display filter
      if (displayFilter === "live") return p.is_visible;
      if (displayFilter === "hidden") return !p.is_visible;
      
      return true;
    });
  }, [allProducts, selectedCategory, displaySearch, displayFilter]);

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <div className="admin-login-logo">
            <Icon name="shield" size={48} color="var(--gold)" />
            <h1 className="admin-login-title">Admin Portal</h1>
            <div className="admin-login-sub">{siteConfig.storeName}</div>
          </div>
          <form className="admin-login-form" onSubmit={handleLogin}>
            <input 
              type="text" 
              className="admin-input" 
              placeholder="Username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              autoComplete="username"
            />
            <input 
              type="password" 
              className="admin-input" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              autoComplete="current-password"
            />
            <button type="submit" className="btn-admin-login">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-brand">
          <Icon name="shield" size={20} color="var(--gold)" />
          <span>Admin Portal</span>
        </div>
        
        <div className="admin-nav">
          <div className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <Icon name="home" size={16} /> Dashboard
          </div>
          <div className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <Icon name="box" size={16} /> Products ({allProducts.length})
          </div>
          <div className={`admin-nav-item ${activeTab === 'displayManager' ? 'active' : ''}`} onClick={() => setActiveTab('displayManager')}>
            <Icon name="eye" size={16} /> Webpage Displays
          </div>
          <div className={`admin-nav-item ${activeTab === 'quotes' ? 'active' : ''}`} onClick={() => setActiveTab('quotes')}>
            <Icon name="messageSquare" size={16} /> Quotes ({allQuotes.length})
          </div>
          <div className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Icon name="settings" size={16} /> Settings
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '32px', left: '16px', right: '16px' }}>
          <button className="btn-detail-outline" onClick={handleLogout} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}>
            <Icon name="logOut" size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="admin-page-title">Overview Dashboard</h2>
            <div className="admin-stats-grid">
              <div className="stat-card">
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Total Products</div>
                <div style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1.1 }}>{stats.total}</div>
              </div>
              <div className="stat-card">
                <div style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Stock Alerts</div>
                <div style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1.1 }}>{stats.lowStock}</div>
              </div>
              <div className="stat-card">
                <div style={{ color: 'var(--gold)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Total Quotes</div>
                <div style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1.1 }}>{stats.quoteCount}</div>
              </div>
            </div>

            <div className="admin-dashboard-row">
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3>Recent Quote Requests</h3>
                  <button className="btn-link" onClick={() => setActiveTab('quotes')} style={{ color: 'var(--gold)', fontSize: '12px' }}>View All</button>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentQuotes.map(q => (
                        <tr key={q.id}>
                          <td>{q.customerName}</td>
                          <td>{q.customerPhone}</td>
                          <td>{new Date(q.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="admin-card">
                <h3 className="admin-card-title">Top Categories</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {['Cameras', 'Storage', 'Accessories'].map(cat => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>{cat}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                        {allProducts.filter(p => p.category === cat).length} items
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-card" style={{ marginTop: '24px' }}>
              <h3 className="admin-card-title">Most Visited & Commonly Searched Products</h3>
              {loadingPopular ? (
                <DigitronLoader label="loading trends" compact />
              ) : popularProducts.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>No visits recorded yet. Popular products will display here.</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Rank</th>
                        <th>Product Name</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th style={{ textAlign: 'right' }}>Total Visits / Searches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {popularProducts.map((p, idx) => (
                        <tr key={p.id}>
                          <td style={{ color: 'var(--gold)', fontWeight: 'bold' }}>#{idx + 1}</td>
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                          <td><span className="brand-badge">{p.brand}</span></td>
                          <td>{p.category}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--gold)' }}>{p.visits || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="admin-page-title" style={{ margin: 0 }}>Product Inventory</h2>
              <button className="btn-detail-primary" onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name={showAddForm ? "x" : "plus"} size={14} color="white" /> {showAddForm ? "Close Form" : "Add Product"}
              </button>
            </div>

            {showAddForm && (
              <div className="admin-card" style={{ marginBottom: '24px' }}>
                <h3 className="admin-card-title">Add New Product</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newProduct.name || !newProduct.brand) {
                    showToast("Name and brand are required");
                    return;
                  }
                  addMutation.mutate(newProduct, {
                    onSuccess: () => {
                      setShowAddForm(false);
                      setNewProduct({ name: "", brand: "", category: "Cameras", price: "", stock: "In Stock" });
                    }
                  });
                }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>PRODUCT NAME</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 2MP Dome Camera" 
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="admin-table-input"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>BRAND</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CP Plus" 
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                      className="admin-table-input"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>CATEGORY (GENRE)</label>
                    <select 
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="admin-table-input"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
                    >
                      <option value="Cameras">Cameras</option>
                      <option value="Storage">Storage</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Networking">Networking</option>
                      <option value="Services">Services</option>
                      <option value="DVR">DVR</option>
                      <option value="NVR">NVR</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>PRICE (₹)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 2400" 
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="admin-table-input"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>STOCK STATUS</label>
                    <select 
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                      className="admin-table-input"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                      <option value="Call for Availability">Call for Availability</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn-detail-primary" style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }} disabled={addMutation.isPending}>
                      {addMutation.isPending ? "Adding..." : "Save Product"}
                    </button>
                    <button type="button" className="btn-link" onClick={() => setShowAddForm(false)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Search products..." 
                className="form-input" 
                style={{ maxWidth: '300px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="admin-table-wrap">
              {loadingProducts ? (
                <DigitronLoader label="loading products" compact />
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Brand</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Price</th>
                      <th>Catalog Display Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.slice(0, 100).map(p => (
                      <tr key={p.id}>
                        <td style={{ color: 'rgba(255,255,255,0.4)' }}>#{p.id}</td>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td><span className="brand-badge">{p.brand}</span></td>
                        <td>{p.category}</td>
                        <td>
                          <select 
                            className="admin-table-input" 
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '12px', 
                              borderRadius: '4px',
                              border: '1px solid rgba(255,255,255,0.08)',
                              background: 'rgba(255,255,255,0.04)',
                              color: p.stock === 'In Stock' ? 'var(--success)' : 'var(--warning)',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            defaultValue={p.stock}
                            onChange={(e) => updateMutation.mutate({ id: p.id, data: { stock: e.target.value } })}
                          >
                            <option value="In Stock" style={{ background: 'var(--obsidian)', color: 'var(--success)' }}>In Stock</option>
                            <option value="Out of Stock" style={{ background: 'var(--obsidian)', color: 'var(--warning)' }}>Out of Stock</option>
                            <option value="Call for Availability" style={{ background: 'var(--obsidian)', color: 'var(--warning)' }}>Call</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>₹</span>
                            <input 
                              type="text" 
                              className="admin-table-input" 
                              style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }}
                              defaultValue={p.price}
                              onBlur={(e) => updateMutation.mutate({ id: p.id, data: { price: parseFloat(e.target.value) || 0 } })}
                            />
                          </div>
                        </td>
                        <td>
                          <button 
                            onClick={() => visibilityMutation.mutate(p.id)}
                            title={p.is_visible ? "Click to move back from public catalog" : "Click to put back in public page"}
                            className={`btn-visibility-toggle ${p.is_visible ? 'live' : 'archived'}`}
                            style={{ margin: 0 }}
                          >
                            <Icon name={p.is_visible ? "eye" : "eyeOff"} size={12} />
                            {p.is_visible ? "Public Catalog" : "Hidden Archive"}
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
                            <button 
                              className="btn-link"
                              onClick={() => {
                                setEditingProduct({
                                  ...p,
                                  categoryId: p.categoryId || (categories.find(c => c.name === p.category)?.id || '')
                                });
                              }}
                              style={{ color: 'var(--gold-light)', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: 'none', background: 'transparent', fontWeight: 500 }}
                            >
                              <Icon name="edit" size={13} /> Edit
                            </button>
                            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                            <button 
                              className="btn-link"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete "${p.name}"?`)) {
                                  deleteMutation.mutate(p.id);
                                }
                              }}
                              style={{ color: '#ff6b6b', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: 'none', background: 'transparent' }}
                            >
                              <Icon name="trash" size={13} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {filteredProducts.length > 100 && (
              <div style={{ textAlign: 'center', marginTop: '16px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                Showing 100 of {filteredProducts.length} products.
              </div>
            )}
          </div>
        )}

        {activeTab === 'quotes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 className="admin-page-title" style={{ margin: 0 }}>Quote Requests</h2>
                <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                  Manage customer inquiries, view item details, and track follow-ups.
                </p>
              </div>
            </div>

            {loadingQuotes ? (
              <DigitronLoader label="loading quotes" compact />
            ) : allQuotes.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <Icon name="messageSquare" size={48} color="rgba(255,255,255,0.15)" style={{ marginBottom: '16px' }} />
                <h3 style={{ color: 'var(--white)', margin: '0 0 8px 0' }}>No Inquiries Yet</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '13.5px' }}>
                  Quote requests submitted by customers through the catalog page will appear here.
                </p>
              </div>
            ) : (() => {
              const selectedQuote = allQuotes.find(q => q.id === selectedQuoteId) || allQuotes[0];
              const selectedItems = Array.isArray(selectedQuote?.items) ? selectedQuote.items : [];
              const customerMessages = selectedItems
                .map(item => item.message || item.requirements || item.notes)
                .filter(Boolean);
              const customerEmail = selectedItems.find(item => item.customerEmail)?.customerEmail;
              
              return (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '380px 1fr', 
                  gap: '24px', 
                  height: 'calc(100vh - 180px)', 
                  minHeight: '550px' 
                }}>
                  {/* Left Column: Inbox List */}
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    {/* Search / Header */}
                    <div style={{ 
                      padding: '16px', 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      background: 'rgba(255, 255, 255, 0.01)'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', marginBottom: '8px' }}>
                        INBOX ({allQuotes.length})
                      </div>
                    </div>

                    {/* Scrollable list */}
                    <div style={{ 
                      flex: 1, 
                      overflowY: 'auto', 
                      padding: '8px'
                    }}>
                      {allQuotes.map(q => {
                        const isSelected = selectedQuote && selectedQuote.id === q.id;
                        const itemsCount = Array.isArray(q.items) ? q.items.length : 0;
                        const itemsSummary = Array.isArray(q.items) 
                          ? q.items.map(i => i.name).join(', ') 
                          : 'Items requested';
                        const cleanDate = new Date(q.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short'
                        });

                        return (
                          <div 
                            key={q.id}
                            onClick={() => setSelectedQuoteId(q.id)}
                            style={{
                              padding: '16px',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                              borderLeft: isSelected ? '3px solid var(--gold)' : '3px solid transparent',
                              border: isSelected ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid transparent',
                              borderLeftColor: isSelected ? 'var(--gold)' : 'transparent',
                              transition: 'all 0.2s ease',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 600, color: isSelected ? 'var(--gold-light)' : 'var(--white)', fontSize: '14px' }}>
                                {q.customerName}
                              </span>
                              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.35)' }}>
                                {cleanDate}
                              </span>
                            </div>

                            <div style={{ 
                              fontSize: '12px', 
                              color: 'rgba(255, 255, 255, 0.4)', 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              marginBottom: '10px'
                            }}>
                              {itemsSummary}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                                {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                              </span>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                background: q.status === 'Pending' ? 'rgba(249, 115, 22, 0.1)' : 
                                            q.status === 'Processed' ? 'rgba(234, 179, 8, 0.1)' :
                                            q.status === 'Completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                                color: q.status === 'Pending' ? '#f97316' : 
                                       q.status === 'Processed' ? '#eab308' :
                                       q.status === 'Completed' ? '#22c55e' : 'rgba(255,255,255,0.4)'
                              }}>
                                {q.status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Detailed Pane */}
                  {selectedQuote ? (
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}>
                      {/* Pane Header */}
                      <div style={{ 
                        padding: '24px', 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        background: 'rgba(255, 255, 255, 0.01)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--white)' }}>
                            {selectedQuote.customerName}
                          </h3>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.35)', marginTop: '4px' }}>
                            Reference ID: <span style={{ fontFamily: 'monospace' }}>{selectedQuote.id}</span>
                          </div>
                        </div>

                        {/* Status Select dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>STATUS:</span>
                          <select
                            value={selectedQuote.status || 'Pending'}
                            onChange={(e) => updateQuoteMutation.mutate({ id: selectedQuote.id, status: e.target.value })}
                            disabled={updateQuoteMutation.isPending}
                            style={{
                              background: '#121212',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: selectedQuote.status === 'Pending' ? '#f97316' : 
                                     selectedQuote.status === 'Processed' ? '#eab308' :
                                     selectedQuote.status === 'Completed' ? '#22c55e' : 'rgba(255,255,255,0.7)',
                              fontWeight: 600,
                              fontSize: '12.5px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="Pending" style={{ color: '#f97316', background: '#121212' }}>Pending</option>
                            <option value="Processed" style={{ color: '#eab308', background: '#121212' }}>Processed</option>
                            <option value="Completed" style={{ color: '#22c55e', background: '#121212' }}>Completed</option>
                            <option value="Cancelled" style={{ color: 'rgba(255,255,255,0.4)', background: '#121212' }}>Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Scrollable details */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                        {/* Meta grid */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                          gap: '16px',
                          marginBottom: '28px'
                        }}>
                          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '14px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', marginBottom: '4px' }}>CONTACT PHONE</div>
                            <a href={`tel:${selectedQuote.customerPhone}`} style={{ color: 'var(--gold-light)', textDecoration: 'none', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon name="phone" size={12} /> {selectedQuote.customerPhone}
                            </a>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '14px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', marginBottom: '4px' }}>SUBMISSION DATE</div>
                            <div style={{ color: 'var(--white)', fontWeight: 500, fontSize: '13.5px' }}>
                              {new Date(selectedQuote.createdAt).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>

                          {customerEmail && (
                            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '14px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', marginBottom: '4px' }}>CUSTOMER EMAIL</div>
                              <a href={`mailto:${customerEmail}`} style={{ color: 'var(--gold-light)', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
                                {customerEmail}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Items detail list */}
                        <h4 style={{ color: 'var(--white)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Requested Products & Estimation</h4>
                        <div className="admin-table-wrap" style={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
                          <table className="admin-table" style={{ margin: 0 }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <th>Product Item</th>
                                <th style={{ textAlign: 'center' }}>Qty</th>
                                <th style={{ textAlign: 'right' }}>Est. Unit Price</th>
                                <th style={{ textAlign: 'right' }}>Est. Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                let totalEstVal = 0;
                                return (
                                  <>
                                    {selectedItems.map((item, idx) => {
                                      // Lookup unit price in db
                                      const matchedProd = allProducts.find(p => p.name.toLowerCase() === item.name.toLowerCase());
                                      const price = matchedProd ? matchedProd.price : 0;
                                      const qty = item.qty || 1;
                                      const sub = price * qty;
                                      totalEstVal += sub;

                                      return (
                                        <tr key={idx}>
                                          <td style={{ fontWeight: 500, color: 'var(--white)' }}>
                                            {item.name}
                                            {(item.message || item.requirements || item.notes) && (
                                              <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '4px', lineHeight: 1.45 }}>
                                                Wrote: {item.message || item.requirements || item.notes}
                                              </span>
                                            )}
                                            {matchedProd && (
                                              <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                                                Brand: {matchedProd.brand} | Cat: {matchedProd.category}
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                                            {qty}
                                          </td>
                                          <td style={{ textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>
                                            {price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Ask for quote'}
                                          </td>
                                          <td style={{ textAlign: 'right', fontWeight: 600, color: sub > 0 ? 'var(--gold-light)' : 'rgba(255,255,255,0.4)' }}>
                                            {sub > 0 ? `₹${sub.toLocaleString('en-IN')}` : '—'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    {totalEstVal > 0 && (
                                      <tr style={{ background: 'rgba(212,175,55,0.03)' }}>
                                        <td colSpan={3} style={{ fontWeight: 600, color: 'var(--white)', textAlign: 'right' }}>Estimated Total Valuation:</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold-light)', fontSize: '15px' }}>
                                          ₹{totalEstVal.toLocaleString('en-IN')}
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {customerMessages.length > 0 && (
                          <div style={{ 
                            background: 'rgba(212,175,55,0.05)', 
                            border: '1px solid rgba(212,175,55,0.14)', 
                            borderRadius: '8px', 
                            padding: '16px',
                            marginBottom: '24px'
                          }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: '8px' }}>
                              CUSTOMER REQUIREMENTS
                            </div>
                            {customerMessages.map((message, idx) => (
                              <p key={idx} style={{ margin: idx === 0 ? 0 : '10px 0 0 0', color: 'rgba(255,255,255,0.82)', fontSize: '13.5px', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                                {message}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Customer Quick Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <a 
                            href={`https://wa.me/91${selectedQuote.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Hello ${selectedQuote.customerName},\n\nThis is Digitron Associates. We have received your quote request for the products:\n` +
                              selectedItems.map(i => `- ${i.name} (Qty: ${i.qty || 1})`).join('\n') +
                              (customerMessages.length ? `\n\nYour note:\n${customerMessages.join('\n\n')}` : '') +
                              `\n\nOur representative will get in touch with you shortly. Thank you!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-detail-primary"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              textDecoration: 'none', 
                              padding: '10px 18px', 
                              fontSize: '13px', 
                              borderRadius: '8px',
                              background: '#25d366',
                              borderColor: '#25d366',
                              color: '#fff'
                            }}
                          >
                            <Icon name="messageSquare" size={14} color="white" /> Contact via WhatsApp
                          </a>

                          <a 
                            href={`tel:${selectedQuote.customerPhone}`}
                            className="btn-detail-outline"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              textDecoration: 'none', 
                              padding: '10px 18px', 
                              fontSize: '13px', 
                              borderRadius: '8px',
                              borderColor: 'rgba(255,255,255,0.15)',
                              color: 'var(--white)'
                            }}
                          >
                            <Icon name="phone" size={14} /> Call Customer
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      color: 'rgba(255,255,255,0.3)' 
                    }}>
                      Select an inquiry from the list to view details.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Webpage Display Manager Tab Content */}
        {activeTab === 'displayManager' && (
          <div>
            {/* Header section with top-tier premium appearance */}
            <div style={{ 
              background: 'linear-gradient(135deg, var(--obsidian) 0%, #1a1a1a 100%)', 
              padding: '28px 32px', 
              borderRadius: 'var(--radius-lg)', 
              color: 'var(--white)', 
              marginBottom: '32px', 
              border: '1px solid rgba(255,255,255,0.05)', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-40px', bottom: '-40px', opacity: 0.05, pointerEvents: 'none' }}>
                <Icon name="eye" size={200} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(212,175,55,0.15)', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="eye" size={22} color="var(--gold)" />
                </div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>Webpage Display Manager</h2>
              </div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13.5px', lineHeight: 1.6, maxWidth: '750px' }}>
                Control which products are displayed on your public catalog website. Toggling products back to the webpage automatically puts them in their correct genre (e.g. Cameras, Storage, Accessories) like a perfect fit!
              </p>
            </div>

            {/* Controls panel: Genre filters, display status tabs, and search */}
      <div className="admin-controls-panel">
                {/* Row 1: Search and Status Filters */}
                <div className="admin-status-tabs">
                  {/* Status selector (All / Live / Archive) */}
                  <button
                    onClick={() => setDisplayFilter('all')}
                    className={`admin-status-tab-btn ${displayFilter === 'all' ? 'active' : ''}`}
                  >
                    All Products ({allProducts.length})
                  </button>
                  <button
                    onClick={() => setDisplayFilter('live')}
                    className={`admin-status-tab-btn ${displayFilter === 'live' ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></span>
                    Live on Page ({allProducts.filter(p => p.is_visible).length})
                  </button>
                  <button
                    onClick={() => setDisplayFilter('hidden')}
                    className={`admin-status-tab-btn ${displayFilter === 'hidden' ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--mid-gray)' }}></span>
                    Backend Archive ({allProducts.filter(p => !p.is_visible).length})
                  </button>
                </div>

                {/* Search field */}
                <div style={{ position: 'relative', width: '280px' }}>
                  <input
                    type="text"
                    placeholder="Search name or brand..."
                    value={displaySearch}
                    onChange={(e) => setDisplaySearch(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '13px' }}
                  />
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mid-gray)' }}>
                    <Icon name="search" size={14} />
                  </div>
                </div>
              </div>

              {/* Row 2: Genre/Category filter pills */}
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--mid-gray)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Filter by Genre (Category)
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`admin-pill-btn ${selectedCategory === 'All' ? 'active' : ''}`}
                  >
                    All Genres
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`admin-pill-btn ${selectedCategory === cat.name ? 'active' : ''}`}
                    >
                      {cat.name} ({allProducts.filter(p => p.category === cat.name).length})
                    </button>
                  ))}
                </div>
              </div>

            {/* Products grid display */}
            {displayFilteredProducts.length === 0 ? (
              <div style={{
                background: 'var(--white)',
                padding: '60px 20px',
                borderRadius: 'var(--radius-md)',
                border: '0.5px solid var(--light-gray)',
                textAlign: 'center',
                color: 'var(--mid-gray)'
              }}>
                <Icon name="search" size={48} color="var(--light-gray)" style={{ marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--dark-gray)' }}>No Products Found</h3>
                <p style={{ margin: 0, fontSize: '13.5px' }}>
                  No products matched your search or filter settings in this genre.
                </p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '24px' 
              }}>
                {displayFilteredProducts.map(p => {
                  const isLive = p.is_visible;
                  return (
                    <div 
                      key={p.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 'var(--radius-lg)',
                        border: isLive ? '1.5px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isLive ? '0 0 20px rgba(34, 197, 94, 0.05)' : 'none',
                        opacity: isLive ? 1 : 0.75,
                        transition: 'all 0.25s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Genre top banner ribbon decoration */}
                      {isLive && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '4px',
                          background: 'linear-gradient(90deg, #22c55e, #4ade80)'
                        }}></div>
                      )}
                      
                      <div>
                        {/* Status badge and Category label */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            fontSize: '11px', 
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: isLive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            color: isLive ? '#4ade80' : 'rgba(255, 255, 255, 0.45)'
                          }}>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: isLive ? '#22c55e' : 'rgba(255, 255, 255, 0.3)',
                              boxShadow: isLive ? '0 0 6px #22c55e' : 'none'
                            }}></span>
                            {isLive ? 'LIVE' : 'HIDDEN ARCHIVE'}
                          </span>
                          
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {p.category}
                          </span>
                        </div>

                        {/* Product Title and Brand */}
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: 'var(--white)', lineHeight: 1.4 }}>
                          {p.name}
                        </h4>
                        <span className="brand-badge" style={{ marginBottom: '16px', display: 'inline-block' }}>
                          {p.brand}
                        </span>

                        {/* Description & Target Genre status */}
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'rgba(255, 255, 255, 0.45)', 
                          marginBottom: '18px',
                          background: 'rgba(255, 255, 255, 0.01)',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '0.5px dashed rgba(255, 255, 255, 0.1)'
                        }}>
                          {isLive ? (
                            <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Icon name="check" size={12} /> Live in public {p.category} catalog.
                            </span>
                          ) : (
                            <span style={{ color: 'rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Icon name="plus" size={12} /> Click Publish to place back in {p.category}!
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price and Action Button */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginTop: '8px', 
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                      }}>
                        <div>
                          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, letterSpacing: '0.05em' }}>PRICE</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gold-light)' }}>
                            {p.price > 0 ? `₹${p.price.toLocaleString('en-IN')}` : 'Quote Request'}
                          </div>
                        </div>

                        <button 
                          onClick={() => visibilityMutation.mutate(p.id)}
                          disabled={visibilityMutation.isPending}
                          style={{
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: isLive ? '1px solid rgba(255, 107, 107, 0.3)' : '1px solid var(--gold)',
                            background: isLive ? 'rgba(255, 107, 107, 0.05)' : 'var(--gold-tint)',
                            color: isLive ? '#ff6b6b' : 'var(--gold-light)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {visibilityMutation.isPending ? (
                            <Icon name="loader" size={12} className="spin" />
                          ) : (
                            <Icon name={isLive ? "eyeOff" : "eye"} size={12} />
                          )}
                          {isLive ? 'Move to Archive' : 'Publish to Page'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 className="admin-page-title" style={{ margin: 0 }}>System Settings</h2>
                <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                  Customize store information, operating hours, social handles, and toggle client-side features.
                </p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              saveSettingsMutation.mutate(formToSettings(settingsForm));
            }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Grid Layout of panels */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px'
              }}>
                
                {/* General Info Panel */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '20px'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--white)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="settings" size={16} color="var(--gold)" /> Store Branding & Contacts
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>STORE NAME</label>
                      <input 
                        type="text" 
                        value={settingsForm.storeName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>STORE TAGLINE</label>
                      <input 
                        type="text" 
                        value={settingsForm.storeTagline}
                        onChange={(e) => setSettingsForm({ ...settingsForm, storeTagline: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>WHATSAPP NUMBER</label>
                      <input 
                        type="text" 
                        value={settingsForm.whatsappNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>DISPLAY PHONE NUMBER</label>
                      <input 
                        type="text" 
                        value={settingsForm.phoneNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, phoneNumber: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>SUPPORT EMAIL</label>
                      <input 
                        type="email" 
                        value={settingsForm.email}
                        onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Address & Hours Panel */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '20px'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--white)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="home" size={16} color="var(--gold)" /> Address & Operating Hours
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>ADDRESS LINE 1</label>
                      <input 
                        type="text" 
                        value={settingsForm.addressLine1}
                        onChange={(e) => setSettingsForm({ ...settingsForm, addressLine1: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>ADDRESS LINE 2</label>
                      <input 
                        type="text" 
                        value={settingsForm.addressLine2}
                        onChange={(e) => setSettingsForm({ ...settingsForm, addressLine2: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>STATE & ZIP</label>
                      <input 
                        type="text" 
                        value={settingsForm.addressState}
                        onChange={(e) => setSettingsForm({ ...settingsForm, addressState: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>WEEKDAY HOURS</label>
                      <input 
                        type="text" 
                        value={settingsForm.hoursWeekday}
                        onChange={(e) => setSettingsForm({ ...settingsForm, hoursWeekday: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>WEEKEND HOURS</label>
                      <input 
                        type="text" 
                        value={settingsForm.hoursWeekend}
                        onChange={(e) => setSettingsForm({ ...settingsForm, hoursWeekend: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Feature Toggles & Social */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '20px'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--white)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="eye" size={16} color="var(--gold)" /> Platform Preferences
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={settingsForm.enableReviews}
                        onChange={(e) => setSettingsForm({ ...settingsForm, enableReviews: e.target.checked })}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }}
                      />
                      <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--white)', display: 'block' }}>Enable Reviews & Ratings</span>
                        <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)' }}>Allow visitors to see ratings and post new customer reviews.</span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={settingsForm.enableCalculator}
                        onChange={(e) => setSettingsForm({ ...settingsForm, enableCalculator: e.target.checked })}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }}
                      />
                      <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--white)', display: 'block' }}>Estimated Quote pricing valuation</span>
                        <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)' }}>Display item price estimation inside the admin Quote detailed pane.</span>
                      </div>
                    </label>
                  </div>

                  <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.05em' }}>SOCIAL CHANNELS</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>FACEBOOK LINK</label>
                      <input 
                        type="text" 
                        value={settingsForm.socialFacebook}
                        onChange={(e) => setSettingsForm({ ...settingsForm, socialFacebook: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '6px 10px', fontSize: '12.5px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>INSTAGRAM LINK</label>
                      <input 
                        type="text" 
                        value={settingsForm.socialInstagram}
                        onChange={(e) => setSettingsForm({ ...settingsForm, socialInstagram: e.target.value })}
                        className="admin-table-input"
                        style={{ width: '100%', padding: '6px 10px', fontSize: '12.5px' }}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Form Footer Action Buttons */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginTop: '16px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <button 
                  type="button" 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to reset all configurations to their original system defaults? This will erase your overrides.")) {
                      resetSettingsMutation.mutate();
                    }
                  }}
                  className="btn-detail-outline"
                  style={{ borderColor: 'rgba(255, 107, 107, 0.4)', color: '#ff6b6b', padding: '10px 20px', borderRadius: '8px' }}
                >
                  Reset to System Defaults
                </button>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="submit" 
                    className="btn-detail-primary"
                    disabled={saveSettingsMutation.isPending}
                    style={{ padding: '10px 28px', borderRadius: '8px', fontSize: '13.5px', fontWeight: 600 }}
                  >
                    {saveSettingsMutation.isPending ? 'Saving...' : 'Save configuration'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {(activeTab !== 'products' && activeTab !== 'displayManager' && activeTab !== 'quotes' && activeTab !== 'dashboard' && activeTab !== 'settings') && (
          <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--mid-gray)' }}>
            <Icon name={activeTab === 'dashboard' ? 'home' : 'settings'} size={48} color="var(--light-gray)" />
            <h3 style={{ marginTop: '16px', color: 'var(--dark-gray)' }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h3>
            <p style={{ maxWidth: '400px', margin: '8px auto', fontSize: '14px' }}>
              This section is under development.
            </p>
          </div>
        )}
      </div>


      {/* Global premium glassmorphic Edit Product Modal Overlay */}
      {editingProduct && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="edit" size={20} color="var(--gold-dark)" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--obsidian)', fontFamily: 'Outfit, sans-serif' }}>Edit Product</h3>
              </div>
              <button 
                onClick={() => setEditingProduct(null)} 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--mid-gray)', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({
                id: editingProduct.id,
                data: {
                  name: editingProduct.name,
                  brand: editingProduct.brand,
                  categoryId: editingProduct.categoryId,
                  price: parseFloat(editingProduct.price) || 0,
                  stock: editingProduct.stock,
                  stockQty: parseInt(editingProduct.stockQty) || 0,
                  indoorOutdoor: editingProduct.indoorOutdoor || '',
                  resolution: editingProduct.resolution || '',
                  type: editingProduct.type || ''
                }
              }, {
                onSuccess: () => {
                  setEditingProduct(null);
                }
              });
            }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--mid-gray)', marginBottom: '6px', letterSpacing: '0.02em' }}>PRODUCT NAME</label>
                <input 
                  type="text" 
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="admin-table-input"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '13.5px', borderRadius: '6px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--mid-gray)', marginBottom: '6px', letterSpacing: '0.02em' }}>BRAND</label>
                  <input 
                    type="text" 
                    value={editingProduct.brand}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="admin-table-input"
                    style={{ width: '100%', padding: '10px 14px', fontSize: '13.5px', borderRadius: '6px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--mid-gray)', marginBottom: '6px', letterSpacing: '0.02em' }}>CATEGORY (GENRE)</label>
                  <select 
                    value={editingProduct.categoryId}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className="admin-table-input"
                    style={{ width: '100%', padding: '10px 14px', fontSize: '13.5px', borderRadius: '6px', height: '40px' }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--mid-gray)', marginBottom: '6px', letterSpacing: '0.02em' }}>PRICE (₹) (Text Input - No Arrows)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2400" 
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className="admin-table-input"
                    style={{ width: '100%', padding: '10px 14px', fontSize: '13.5px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--mid-gray)', marginBottom: '6px', letterSpacing: '0.02em' }}>STOCK STATUS</label>
                  <select 
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    className="admin-table-input"
                    style={{ width: '100%', padding: '10px 14px', fontSize: '13.5px', borderRadius: '6px', height: '40px' }}
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                    <option value="Call for Availability">Call for Availability</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--mid-gray)', marginBottom: '6px', letterSpacing: '0.02em' }}>STOCK QUANTITY</label>
                  <input 
                    type="text" 
                    value={editingProduct.stockQty}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQty: e.target.value })}
                    className="admin-table-input"
                    style={{ width: '100%', padding: '10px 14px', fontSize: '13.5px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--mid-gray)', marginBottom: '6px', letterSpacing: '0.02em' }}>INDOOR/OUTDOOR</label>
                  <select 
                    value={editingProduct.indoorOutdoor || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, indoorOutdoor: e.target.value })}
                    className="admin-table-input"
                    style={{ width: '100%', padding: '10px 14px', fontSize: '13.5px', borderRadius: '6px', height: '40px' }}
                  >
                    <option value="">N/A</option>
                    <option value="Indoor">Indoor</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Indoor/Outdoor">Indoor/Outdoor</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${editingProduct.name}"?`)) {
                      deleteMutation.mutate(editingProduct.id, {
                        onSuccess: () => {
                          setEditingProduct(null);
                        }
                      });
                    }
                  }}
                  className="btn-detail-outline"
                  style={{ borderColor: '#d93025', color: '#d93025', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px' }}
                >
                  <Icon name="trash" size={14} /> Remove Product
                </button>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => setEditingProduct(null)} 
                    className="btn-link"
                    style={{ color: 'var(--mid-gray)', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-detail-primary"
                    style={{ padding: '8px 24px', borderRadius: '6px' }}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
