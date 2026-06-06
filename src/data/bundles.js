/**
 * Bundle / Package data.
 * Future: fetched from backend API.
 */
const bundles = [
  { id: 1, name: "Home Security Starter Kit", icon: "home", description: "Perfect for a 2–3BHK home. Covers all entry points and common areas.", components: [{ name: "2MP IP Dome Camera", qty: 4 }, { name: "8Ch NVR", qty: 1 }, { name: "2TB HDD", qty: 1 }, { name: "60m RG59 Cable", qty: 2 }, { name: "Power Supply (4ch)", qty: 1 }], total_price: 22500, original_price: 26000, best_for: ["Home"], image: "bundle_home" },
  { id: 2, name: "Shop Security Pro Kit", icon: "package", description: "Ideal for retail shops and small offices. Full perimeter + interior coverage.", components: [{ name: "4MP IP Dome Camera", qty: 4 }, { name: "4MP Bullet Camera (outdoor)", qty: 2 }, { name: "8Ch NVR", qty: 1 }, { name: "2TB HDD", qty: 1 }, { name: "PoE Switch 8-port", qty: 1 }, { name: "Cable & Accessories", qty: 1 }], total_price: 38000, original_price: 45000, best_for: ["Shop"], image: "bundle_shop" },
  { id: 3, name: "Parking & Perimeter Kit", icon: "zap", description: "Long-range coverage for parking lots, warehouses, and large perimeters.", components: [{ name: "8MP Bullet Camera (outdoor)", qty: 4 }, { name: "2MP PTZ Camera", qty: 1 }, { name: "16Ch NVR", qty: 1 }, { name: "4TB HDD", qty: 1 }, { name: "PoE Switch 8-port", qty: 1 }, { name: "Cable & Accessories", qty: 1 }], total_price: 52000, original_price: 61000, best_for: ["Parking"], image: "bundle_parking" },
];

export default bundles;
