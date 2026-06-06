/**
 * Site-wide configuration.
 * Centralised place for store info, WhatsApp number, etc.
 * Future: pulled from a CMS / backend settings API.
 */
const siteConfig = {
  storeName: "Annapoorneshwari",
  storeTagline: "CCTV & Security Solutions",
  whatsappNumber: "919876543210",      // Update with real number
  phoneNumber: "+91 98765 43210",
  email: "info@annapoorneshwari.in",
  salesEmail: "sales@annapoorneshwari.in",
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

export default siteConfig;
