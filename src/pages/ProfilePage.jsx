import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { DigitronLoader, Icon, ImagePlaceholder, StarRating } from "../components/ui";
import { Footer } from "../components/layout";
import {
  addAddress,
  deleteAddress,
  fetchProductById,
  getMyReviews,
  getProfile,
  getWishlist,
  toggleWishlist,
  updateProfile,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const TABS = [
  ["overview", "Overview"],
  ["reviews", "My Orders / Reviews"],
  ["wishlist", "Wishlist"],
  ["addresses", "Saved Addresses"],
  ["settings", "Account Settings"],
];

export default function ProfilePage({ showToast }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading, logout, refetch } = useAuth();
  const { cartCount, addToCart } = useCart();
  const [activeTab, setActiveTab] = useState("overview");
  const [name, setName] = useState("");
  const [addressForm, setAddressForm] = useState({ label: "Home", line1: "", line2: "", city: "", state: "", pincode: "", phone: "" });

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) setName(user.name || "");
  }, [user]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: getProfile,
    enabled: !!user
  });

  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlist,
    enabled: !!user
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["my-reviews"],
    queryFn: getMyReviews,
    enabled: !!user
  });

  const wishlistQueries = useQueries({
    queries: wishlist.map((productId) => ({
      queryKey: ["product", productId],
      queryFn: () => fetchProductById(productId),
      enabled: !!user
    }))
  });

  const wishlistProducts = useMemo(
    () => wishlistQueries.map((query) => query.data).filter(Boolean),
    [wishlistQueries]
  );

  const saveProfileMutation = useMutation({
    mutationFn: () => updateProfile({ name }),
    onSuccess: async () => {
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      showToast("Profile updated");
    },
    onError: () => showToast("Could not update profile.")
  });

  const addressMutation = useMutation({
    mutationFn: addAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      setAddressForm({ label: "Home", line1: "", line2: "", city: "", state: "", pincode: "", phone: "" });
      showToast("Address saved");
    },
    onError: (err) => showToast(err.message || "Could not save address.")
  });

  const deleteAddressMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      showToast("Address removed");
    }
  });

  const wishlistMutation = useMutation({
    mutationFn: toggleWishlist,
    onSuccess: (data) => {
      queryClient.setQueryData(["wishlist"], data.wishlist || []);
      showToast("Wishlist updated");
    }
  });

  if (loading || profileLoading || !user) {
    return <div className="page"><DigitronLoader label="loading profile" /></div>;
  }

  const addresses = profile?.addresses || [];
  const initials = (user.name || "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="page">
      <div className="customer-page">
        <div className="profile-layout">
          <aside className="profile-sidebar">
            <div className="profile-avatar profile-avatar-lg">
              {user.avatar ? <img src={user.avatar} alt={user.name} /> : initials}
            </div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <button className="btn-detail-outline" onClick={logout}><Icon name="logOut" size={14} /> Logout</button>
            <nav className="profile-tabs">
              {TABS.map(([key, label]) => (
                <button key={key} className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="profile-main">
            {activeTab === "overview" && (
              <>
                <section className="profile-panel">
                  <h1>Hello, {user.name}! Welcome back.</h1>
                  <div className="profile-stats">
                    <div><strong>{cartCount}</strong><span>items in cart</span></div>
                    <div><strong>{wishlist.length}</strong><span>saved items</span></div>
                    <div><strong>{reviews.length}</strong><span>reviews written</span></div>
                  </div>
                </section>
                <section className="profile-panel">
                  <h2>Recent Activity</h2>
                  <div className="activity-list">
                    {wishlistProducts.slice(0, 3).map((product) => <button key={product.id} onClick={() => navigate(`/product/${product.id}`)}>{product.name}</button>)}
                    {reviews.slice(0, 2).map((review) => <button key={`${review.productId}-${review.createdAt}`} onClick={() => navigate(`/product/${review.productId}`)}>{review.productName} review</button>)}
                    {wishlist.length === 0 && reviews.length === 0 && <p>No recent activity yet.</p>}
                  </div>
                </section>
              </>
            )}

            {activeTab === "reviews" && (
              <section className="profile-panel">
                <h1>My Reviews</h1>
                {reviews.length === 0 ? (
                  <div className="empty-state"><h3>No reviews yet</h3><button className="btn-detail-primary" onClick={() => navigate("/")}>Browse Products</button></div>
                ) : reviews.map((review) => (
                  <div className="profile-review" key={`${review.productId}-${review.createdAt}`}>
                    <button onClick={() => navigate(`/product/${review.productId}`)}>{review.productName}</button>
                    <StarRating rating={review.rating} size={13} />
                    <p>{review.text}</p>
                    <span>{new Date(review.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                ))}
              </section>
            )}

            {activeTab === "wishlist" && (
              <section className="profile-panel">
                <h1>Wishlist</h1>
                {wishlistProducts.length === 0 ? (
                  <div className="empty-state"><h3>No saved items yet</h3></div>
                ) : (
                  <div className="wishlist-grid">
                    {wishlistProducts.map((product) => (
                      <div className="wishlist-card" key={product.id}>
                        <div style={{ width: "100%", height: "140px", backgroundColor: "#ffffff", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", borderTopLeftRadius: "var(--radius-md)", borderTopRightRadius: "var(--radius-md)" }}>
                          {product.images && product.images[0] && product.images[0] !== "product" ? (
                            <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "16px" }} />
                          ) : (
                            <ImagePlaceholder label={product.category} />
                          )}
                        </div>
                        <h3>{product.name}</h3>
                        <p>{product.category}</p>
                        <div className="wishlist-actions">
                          <button className="btn-detail-outline" onClick={() => navigate(`/product/${product.id}`)}>View Product</button>
                          <button className="btn-detail-primary" onClick={() => addToCart(product.id).then(() => showToast("Added to cart!"))}><Icon name="shoppingCart" size={14} color="white" /> Add</button>
                          <button className="icon-soft-btn selected" onClick={() => wishlistMutation.mutate(product.id)}><Icon name="heart" size={15} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "addresses" && (
              <section className="profile-panel">
                <h1>Saved Addresses</h1>
                <div className="address-list">
                  {addresses.map((address, index) => (
                    <div className="address-card" key={`${address.label}-${index}`}>
                      <strong>{address.label}</strong>
                      <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} - {address.pincode}</p>
                      <span>{address.phone}</span>
                      <button onClick={() => deleteAddressMutation.mutate(index)}><Icon name="trash" size={14} /> Delete</button>
                    </div>
                  ))}
                </div>
                {addresses.length < 5 && (
                  <div className="address-form">
                    {Object.keys(addressForm).map((field) => (
                      field === "label" ? (
                        <select key={field} value={addressForm[field]} onChange={(e) => setAddressForm({ ...addressForm, [field]: e.target.value })}>
                          <option>Home</option><option>Work</option><option>Other</option>
                        </select>
                      ) : (
                        <input key={field} placeholder={field.replace("line", "Line ")} value={addressForm[field]} onChange={(e) => setAddressForm({ ...addressForm, [field]: e.target.value })} />
                      )
                    ))}
                    <button className="btn-detail-primary" onClick={() => addressMutation.mutate(addressForm)}>Add New Address</button>
                  </div>
                )}
              </section>
            )}

            {activeTab === "settings" && (
              <section className="profile-panel">
                <h1>Account Settings</h1>
                <div className="settings-form">
                  <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
                  <label>Email<input value={user.email} readOnly /></label>
                  <button className="btn-detail-primary" onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending}>Save</button>
                </div>
                <div className="connected-account"><span className="google-mark">G</span> {user.email}<strong>Connected via Google</strong></div>
                <div className="danger-zone">
                  <h2>Danger Zone</h2>
                  <button className="btn-detail-outline" onClick={logout}>Logout of all devices</button>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
