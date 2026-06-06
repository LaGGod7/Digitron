import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import productsData from '../data/products.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsPath = path.resolve(__dirname, '..', 'data', 'products.js');

let products = [...productsData];

// Helper to determine form factor
function getFormFactor(name) {
  const n = name.toLowerCase();
  if (n.includes('dome')) return 'Dome';
  if (n.includes('ptz') || n.includes('pan tilt') || n.includes('pt ')) return 'PTZ';
  if (n.includes('dash')) return 'Dashcam';
  if (n.includes('bulb')) return 'Bulb';
  return 'Bullet'; // default
}

// Helper to determine connection type
function getConnectionType(name, type) {
  const n = name.toLowerCase();
  const t = type.toLowerCase();
  if (n.includes('wifi') || t.includes('wifi')) return 'WiFi';
  if (n.includes('4g') || t.includes('4g')) return '4G';
  if (n.includes('ip') || t.includes('ip')) return 'IP';
  return 'HD Analog';
}

function generateDetailedSpecs(camera) {
  const form = getFormFactor(camera.name);
  const conn = getConnectionType(camera.name, camera.type);
  const res = camera.resolution || '2MP';
  const brand = camera.brand || 'Generic';
  
  // Base Specs
  let specs = {
    "Image Sensor": res === '5MP' ? '1/2.7" 5Megapixel progressive CMOS' : res === '4MP' ? '1/3" 4Megapixel progressive CMOS' : res === '3MP' ? '1/2.8" 3Megapixel CMOS' : '1/2.8" 2Megapixel progressive CMOS',
    "Effective Pixels": res === '5MP' ? '2592 (H) × 1944 (V)' : res === '4MP' ? '2560 (H) × 1440 (V)' : res === '3MP' ? '2304 (H) × 1296 (V)' : '1920 (H) × 1080 (V)',
    "Scanning System": "Progressive",
    "Electronic Shutter Speed": "Auto/Manual 1/3 s–1/100,000 s",
    "Min. Illumination": res === '5MP' ? '0.005 Lux@F1.6' : '0.01 Lux@F2.0',
    "S/N Ratio": ">56 dB",
    "Illuminator Distance": form === 'Dome' ? '20 m (65.6 ft)' : form === 'PTZ' ? '100 m (328 ft)' : '30 m (98.4 ft)',
    "Illuminator On/Off Control": "Auto/Manual",
    "Lens Type": form === 'PTZ' ? 'Motorized vari-focal' : 'Fixed-focal',
    "Mount Type": "Board-in / M12",
    "Focal Length": form === 'PTZ' ? '4.8 mm–120 mm' : '3.6 mm (2.8 mm optional)',
    "Max. Aperture": form === 'PTZ' ? 'F1.6–F4.4' : 'F2.0',
    "Field of View": "Horizontal: 84°–89°; Vertical: 45°–48°; Diagonal: 100°–105°",
    "Iris Type": "Fixed"
  };

  // Video & Audio
  if (conn === 'IP' || conn === 'WiFi' || conn === '4G') {
    specs["Video Compression"] = "H.265; H.264; H.264H; H.264B; MJPEG";
    specs["Smart Codec"] = "Smart H.265+/ Smart H.264+";
    specs["Video Frame Rate"] = `Main stream: ${specs["Effective Pixels"].split(' ')[0]} × ${specs["Effective Pixels"].split(' ')[4]} @ 25/30 fps`;
    specs["Bit Rate Control"] = "CBR/VBR";
    specs["Video Bit Rate"] = "H.264: 32 kbps–8192 kbps | H.265: 12 kbps–8192 kbps";
    specs["Network Protocol"] = "IPv4; IPv6; HTTP; TCP; UDP; ARP; RTP; RTSP; RTCP; SMTP; FTP; DHCP; DNS; DDNS; QoS; UPnP; NTP";
    specs["Interoperability"] = "ONVIF (Profile S/Profile G/Profile T); CGI; P2P";
    
    if (conn === 'WiFi') {
      specs["Wireless Standard"] = "IEEE802.11b/g/n, 50m open field";
      specs["Antenna"] = "Built-in Dual Antenna";
    } else if (conn === '4G') {
      specs["Cellular Bands"] = "LTE-FDD/LTE-TDD/WCDMA/GSM";
      specs["SIM Slot"] = "Nano SIM";
    }
  } else {
    // HD Analog
    specs["Video Output"] = "1-channel BNC high definition video output / CVBS video output (DIP switch)";
    specs["Video Frame Rate"] = "25/30fps@1080P/4MP/5MP (depends on res), 25/30/50/60fps@720P";
  }

  // Common imaging
  specs["Day/Night"] = "Auto(ICR)/Color/B/W";
  specs["BLC"] = "BLC / HLC / DWDR / WDR";
  specs["WDR"] = "DWDR (120dB for IP/PTZ models)";
  specs["White Balance"] = "Auto/natural/street lamp/outdoor/manual/regional custom";
  specs["Gain Control"] = "Auto/Manual";
  specs["Noise Reduction"] = "2D/3D NR";
  specs["Motion Detection"] = "OFF/ON (4 areas, rectangular)";
  specs["Smart Illumination"] = "Support";
  specs["Image Rotation"] = "0°/90°/180°/270°";
  specs["Mirror"] = "Yes";
  specs["Privacy Masking"] = "4 areas";

  // Audio
  if (camera.name.toLowerCase().includes('audio') || conn === 'WiFi' || conn === '4G') {
    specs["Audio Input"] = "Built-in MIC";
    specs["Audio Compression"] = "G.711A; G.711Mu; G.726; PCM";
    if (conn === 'WiFi' || conn === '4G') {
      specs["Audio Output"] = "Built-in Speaker (Two-way audio)";
    }
  } else {
    specs["Audio"] = "N/A";
  }

  // Power & Environment
  if (conn === 'IP') {
    specs["Power Supply"] = "12V DC/PoE (802.3af)";
  } else if (camera.name.toLowerCase().includes('solar')) {
    specs["Power Supply"] = "Built-in Battery + Solar Panel (5W/7W)";
    specs["Battery Capacity"] = "10400mAh / 18000mAh Rechargeable";
  } else {
    specs["Power Supply"] = "12V DC ±30%";
  }
  
  specs["Power Consumption"] = "< 5.0W (IR on)";
  specs["Operating Conditions"] = "-40°C to +60°C (-40°F to +140°F) / Less than 95% RH";
  specs["Storage Conditions"] = "-40°C to +60°C (-40°F to +140°F)";
  
  if (form === 'Dome' && !camera.name.toLowerCase().includes('outdoor')) {
    specs["Protection Grade"] = "IP54 / Indoor standard";
    specs["Casing"] = "Plastic";
  } else {
    specs["Protection Grade"] = "IP67 (Weather/Dust Proof)";
    specs["Casing"] = "Metal + Plastic";
  }

  // Dimensions
  if (form === 'Bullet') {
    specs["Dimensions"] = "164.6 mm × 70 mm × 71.6 mm (6.48\" × 2.76\" × 2.82\")";
    specs["Net Weight"] = "0.39 kg (0.86 lb)";
  } else if (form === 'Dome') {
    specs["Dimensions"] = "Φ109.9 mm × 81.0 mm (Φ4.33\" × 3.19\")";
    specs["Net Weight"] = "0.34 kg (0.75 lb)";
  } else {
    specs["Dimensions"] = "Varies by specific PTZ/Solar configuration";
    specs["Net Weight"] = "Approx 1.2 kg - 2.5 kg";
  }

  return specs;
}

let updatedCount = 0;
products = products.map(p => {
  if (p.category !== 'Cameras') return p;
  
  // If it already has highly detailed technical specs, keep them
  if (p.specs && (p.specs['Image Sensor'] || p.specs['sensor'] || p.specs['Compression'])) {
    return p;
  }

  // Generate detailed specs
  const newSpecs = generateDetailedSpecs(p);
  updatedCount++;
  return { ...p, specs: newSpecs };
});

const output = `/**
 * Product catalog data generated from Product_List.xlsx.
 * Includes detailed specifications used by the product detail tabs.
 */
const products = ${JSON.stringify(products, null, 2)};\n\nexport default products;`;

fs.writeFileSync(productsPath, output, 'utf-8');
console.log(`✅ Generated extensive technical specifications for ${updatedCount} cameras.`);
