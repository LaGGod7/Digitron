/**
 * Site-wide configuration.
 * Centralised place for store info, WhatsApp number, etc.
 * Supports dynamic overrides saved in localStorage by the Admin Portal.
 */
const defaultSiteConfig = {
  storeName: "Digitron Associates",
  storeTagline: "CCTV & Security Solutions",
  whatsappNumber: "919876543210",      // Update with real number
  phoneNumber: "+91 98765 43210",
  email: "info@digitronassociates.in",
  salesEmail: "sales@digitronassociates.in",
  address: {
    line1: "Shop No. 12, Electronics Hub",
    line2: "Lamington Road, Hubbali",
    state: "Karnataka — 580029",
  },
  hours: {
    weekday: "Mon–Sat: 9 AM – 7 PM",
    weekend: "Sunday: 10 AM – 4 PM",
  },
  social: {
    facebook: "#",
    instagram: "#",
    youtube: "#",
  },
};

// Check if localStorage has overrides
let siteConfig = { ...defaultSiteConfig };
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("ae_site_config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      siteConfig = {
        ...defaultSiteConfig,
        ...parsed,
        address: { ...defaultSiteConfig.address, ...(parsed.address || {}) },
        hours: { ...defaultSiteConfig.hours, ...(parsed.hours || {}) },
        social: { ...defaultSiteConfig.social, ...(parsed.social || {}) },
      };
    } catch (e) {
      console.error("Error loading config overrides", e);
    }
  }
}

export default siteConfig;
