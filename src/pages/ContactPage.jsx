import { useState } from "react";
import { Icon } from "../components/ui";
import { Footer } from "../components/layout";
import products from "../data/products";
import siteConfig from "../data/siteConfig";

export default function ContactPage({ showToast }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", product: "", message: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.match(/^[6-9]\d{9}$/)) e.phone = "Enter a valid 10-digit Indian mobile number";
    if (form.message.length < 10) e.message = "Please describe your requirements (min 10 chars)";
    return e;
  };

  const submit = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForm({ name: "", phone: "", email: "", product: "", message: "" });
      showToast("Enquiry sent! We'll contact you shortly.");
    }, 800);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-header-label">Get in touch</div>
          <h1 className="page-header-title">Contact & Request Quote</h1>
        </div>
      </div>
      <div className="contact-page">
        <div className="contact-grid">
          <div className="contact-form-wrap">
            <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 20 }}>Send Enquiry</h2>
            <div className="form-field">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <span style={{ fontSize: 11, color: "#791F1F" }}>{errors.name}</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-field">
                <label className="form-label">Phone Number *</label>
                <input className="form-input" placeholder="10-digit mobile" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                {errors.phone && <span style={{ fontSize: 11, color: "#791F1F" }}>{errors.phone}</span>}
              </div>
              <div className="form-field">
                <label className="form-label">Email (optional)</label>
                <input className="form-input" placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Product of Interest</label>
              <select className="filter-select" style={{ width: "100%", padding: "10px 14px", border: "0.5px solid var(--light-gray)", background: "var(--off-white)" }} value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                <option value="">Select a product...</option>
                {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                <option value="bundle_home">Package: Home Security Starter Kit</option>
                <option value="bundle_shop">Package: Shop Security Pro Kit</option>
                <option value="bundle_parking">Package: Parking & Perimeter Kit</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Message / Requirements *</label>
              <textarea className="form-textarea" rows={5} placeholder="Describe your security requirements, premises size, number of cameras needed, etc." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              {errors.message && <span style={{ fontSize: 11, color: "#791F1F" }}>{errors.message}</span>}
            </div>
            <button className="btn-submit-review" style={{ padding: "12px 32px", fontSize: 14 }} onClick={submit} disabled={loading}>
              {loading ? "Sending..." : "Send Enquiry"}
            </button>
          </div>

          <div className="contact-info-wrap">
            <div className="contact-info-card">
              <div className="contact-info-icon"><Icon name="mapPin" size={20} color="var(--gold)" /></div>
              <div>
                <div className="contact-info-title">Store Address</div>
                <div className="contact-info-text">{siteConfig.address.line1}<br />{siteConfig.address.line2}<br />{siteConfig.address.state}</div>
              </div>
            </div>
            <div className="contact-info-card">
              <div className="contact-info-icon"><Icon name="phone" size={20} color="var(--gold)" /></div>
              <div>
                <div className="contact-info-title">Phone & WhatsApp</div>
                <div className="contact-info-text">
                  {siteConfig.phoneNumber}<br />
                  <span style={{ color: "var(--whatsapp)", cursor: "pointer" }} onClick={() => window.open(`https://wa.me/${siteConfig.whatsappNumber}`, "_blank")}>Chat on WhatsApp →</span>
                </div>
              </div>
            </div>
            <div className="contact-info-card">
              <div className="contact-info-icon"><Icon name="clock" size={20} color="var(--gold)" /></div>
              <div>
                <div className="contact-info-title">Business Hours</div>
                <div className="contact-info-text">{siteConfig.hours.weekday}<br />{siteConfig.hours.weekend}<br />Public holidays may vary</div>
              </div>
            </div>
            <div className="contact-info-card">
              <div className="contact-info-icon"><Icon name="mail" size={20} color="var(--gold)" /></div>
              <div>
                <div className="contact-info-title">Email</div>
                <div className="contact-info-text">{siteConfig.email}<br />{siteConfig.salesEmail}</div>
              </div>
            </div>
            <div className="map-placeholder">
              <Icon name="mapPin" size={24} color="var(--light-gray)" />
              <span>Google Maps Embed</span>
              <span style={{ fontSize: 10 }}>Add your Google Maps embed code here</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
