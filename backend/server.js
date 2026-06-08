const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// Sanitize connection strings to remove any accidental wrapping quotes or spaces from Vercel dashboard
if (process.env.MONGODB_URI) {
  process.env.MONGODB_URI = process.env.MONGODB_URI.trim().replace(/^["']|["']$/g, '');
}
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.trim().replace(/^["']|["']$/g, '');
}


const app = express();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MONGODB_URI
    }
  },
  log: ['error']
});
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_MONGO_URL = process.env.MONGODB_URI || process.env.DATABASE_URL;
const GOOGLE_AUTH_CONFIGURED = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const USE_MONGO_SESSION_STORE = process.env.SESSION_STORE === 'mongo' && !(process.env.VERCEL || process.env.NOW_BUILDER);
const logRouteError = (label, error) => {
  console.error(`${label}:`, error?.message || error);
};
const withTimeout = (promise, ms, message) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
]);

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'digitron-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
};
if (USE_MONGO_SESSION_STORE) {
  if (!SESSION_MONGO_URL) {
    throw new Error('SESSION_STORE=mongo requires MONGODB_URI or DATABASE_URL in backend/.env');
  }
  sessionConfig.store = MongoStore.create({ mongoUrl: SESSION_MONGO_URL });
}
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

if (GOOGLE_AUTH_CONFIGURED) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('Google account email is required'));

      let customer = await prisma.customer.findUnique({ where: { googleId: profile.id } });
      if (!customer) {
        const existingByEmail = await prisma.customer.findUnique({ where: { email } });
        customer = existingByEmail
          ? await prisma.customer.update({
              where: { id: existingByEmail.id },
              data: {
                googleId: profile.id,
                name: existingByEmail.name || profile.displayName,
                avatar: profile.photos?.[0]?.value || existingByEmail.avatar || null,
              }
            })
          : await prisma.customer.create({
              data: {
                googleId: profile.id,
                email,
                name: profile.displayName || email.split('@')[0],
                avatar: profile.photos?.[0]?.value || null,
              }
            });
      }
      return done(null, customer);
    } catch (err) {
      return done(err);
    }
  }));
} else {
  console.warn('Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env to enable customer login.');
}

passport.serializeUser((customer, done) => done(null, customer.id));
passport.deserializeUser(async (id, done) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id } });
    done(null, customer);
  } catch (err) {
    done(err);
  }
});

console.log('--- Server Configuration ---');
console.log('Email User:', process.env.EMAIL_USER ? 'Configured' : 'Missing');
console.log('Email Pass:', process.env.EMAIL_PASS ? 'Configured' : 'Missing');

// --- Authentication Middleware ---
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.admin = decoded;
    next();
  });
};

const requireCustomer = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Login required' });
};

const fs = require('fs');
const path = require('path');

const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const VISITS_FILE = isVercel ? path.join('/tmp', 'product_visits.json') : path.join(__dirname, 'product_visits.json');
const HIDDEN_FILE = isVercel ? path.join('/tmp', 'hidden_products.json') : path.join(__dirname, 'hidden_products.json');
const SETTINGS_FILE = isVercel ? path.join('/tmp', 'site_settings.json') : path.join(__dirname, 'site_settings.json');

if (isVercel) {
  const filesToCopy = ['product_visits.json', 'hidden_products.json', 'site_settings.json'];
  filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join('/tmp', file);
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      try {
        fs.copyFileSync(src, dest);
      } catch (err) {
        console.error(`Failed to copy ${file} to /tmp:`, err);
      }
    }
  });
}

let productVisits = {};
try {
  if (fs.existsSync(VISITS_FILE)) {
    productVisits = JSON.parse(fs.readFileSync(VISITS_FILE, 'utf8'));
  }
} catch (err) {
  console.error('Error loading visits file:', err);
}

const saveVisits = () => {
  try {
    fs.writeFileSync(VISITS_FILE, JSON.stringify(productVisits), 'utf8');
  } catch (err) {
    console.error('Error saving visits file:', err);
  }
};

let hiddenProductIds = [];
try {
  if (fs.existsSync(HIDDEN_FILE)) {
    hiddenProductIds = JSON.parse(fs.readFileSync(HIDDEN_FILE, 'utf8'));
  }
} catch (err) {
  console.error('Error loading hidden products:', err);
}

const saveHidden = () => {
  try {
    fs.writeFileSync(HIDDEN_FILE, JSON.stringify(hiddenProductIds), 'utf8');
  } catch (err) {
    console.error('Error saving hidden products:', err);
  }
};

const defaultSettings = {
  storeName: "Digitron Associates",
  storeTagline: "CCTV & Security Solutions",
  whatsappNumber: "919876543210",
  phoneNumber: "+91 98765 43210",
  email: "info@digitronassociates.in",
  salesEmail: "sales@digitronassociates.in",
  address: {
    line1: "Shop No. 12, Electronics Hub",
    line2: "Lamington Road, Hubbali",
    state: "Karnataka - 580029",
  },
  hours: {
    weekday: "Mon-Sat: 9 AM - 7 PM",
    weekend: "Sunday: 10 AM - 4 PM",
  },
  social: {
    facebook: "#",
    instagram: "#",
    youtube: "#",
  },
  features: {
    enableReviews: true,
    enableCalculator: true,
  }
};

const mergeSettings = (settings = {}) => ({
  ...defaultSettings,
  ...settings,
  address: { ...defaultSettings.address, ...(settings.address || {}) },
  hours: { ...defaultSettings.hours, ...(settings.hours || {}) },
  social: { ...defaultSettings.social, ...(settings.social || {}) },
  features: { ...defaultSettings.features, ...(settings.features || {}) },
});

const loadSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return mergeSettings(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')));
    }
  } catch (err) {
    console.error('Error loading site settings:', err);
  }
  return mergeSettings();
};

let siteSettings = loadSettings();

const saveSettings = () => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(siteSettings, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving site settings:', err);
  }
};

const isMongoId = (value) => typeof value === 'string' && OBJECT_ID_RE.test(value);
const numericId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const productIdentifierWhere = (id) => {
  const clauses = [];
  if (isMongoId(id)) clauses.push({ id });
  const legacyId = numericId(id);
  if (legacyId !== null) clauses.push({ legacyId });
  return clauses.length ? { OR: clauses } : { legacyId: -1 };
};

const findProductByIdentifier = (id, include = {}) => {
  return prisma.product.findFirst({
    where: productIdentifierWhere(id),
    include
  });
};

const asArray = (value) => Array.isArray(value) ? value : [];
const sanitizeQuantity = (quantity) => Math.max(0, parseInt(quantity, 10) || 0);
const customerProfilePayload = (customer) => ({
  id: customer.id,
  email: customer.email,
  name: customer.name,
  avatar: customer.avatar,
  createdAt: customer.createdAt,
  addresses: asArray(customer.addresses)
});

// Helper to map DB review to Frontend expected format
const mapReview = (r) => ({
  id: r.id,
  product_id: r.productId,
  customerId: r.customerId,
  customerName: r.customerName,
  reviewer_name: r.reviewerName,
  rating: r.rating,
  review_text: r.reviewText,
  is_verified: r.isVerified,
  is_approved: r.isApproved,
  helpful_yes: r.helpfulYes,
  helpful_no: r.helpfulNo,
  created_at: r.createdAt
});

// Helper to map DB product to Frontend expected format
const mapProduct = (p) => {
  const reviewsMapped = p.reviews ? p.reviews.map(mapReview) : [];
  const avg_rating = reviewsMapped.length > 0
    ? parseFloat((reviewsMapped.reduce((sum, r) => sum + r.rating, 0) / reviewsMapped.length).toFixed(1))
    : 4.5;
  return {
    ...p,
    category: p.category?.name || 'Accessories',
    categoryId: p.categoryId,
    stock: p.stockStatus,
    stock_qty: p.stockQty,
    indoor_outdoor: p.indoorOutdoor,
    best_for: p.bestFor,
    reviews: reviewsMapped,
    avg_rating,
    review_count: reviewsMapped.length,
    is_visible: !hiddenProductIds.includes(p.id)
  };
};

// --- Auth Routes ---
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'Admin@1234') {
    const token = jwt.sign({ user: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/auth/google', (req, res, next) => {
  if (!GOOGLE_AUTH_CONFIGURED) {
    return res.status(503).json({ error: 'Google login is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env.' });
  }
  req.session.returnTo = req.query.returnTo || '/profile';
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/api/auth/google/callback',
  (req, res, next) => {
    if (!GOOGLE_AUTH_CONFIGURED) {
      return res.redirect(`${FRONTEND_URL}/?auth=google-not-configured`);
    }
    next();
  },
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const returnTo = req.session.returnTo || '/profile';
    delete req.session.returnTo;
    res.redirect(`${FRONTEND_URL}${returnTo.startsWith('/') ? returnTo : '/profile'}`);
  }
);

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user ? customerProfilePayload(req.user) : null });
});

app.get('/api/db-debug', async (req, res) => {
  const dns = require('dns');
  const debugInfo = {
    hasUri: Boolean(process.env.MONGODB_URI),
    uriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
    uriStart: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 25) + '...' : 'none',
    uriEnd: process.env.MONGODB_URI ? '...' + process.env.MONGODB_URI.substring(process.env.MONGODB_URI.length - 25) : 'none',
    dnsResolution: {},
    dnsError: null
  };

  try {
    const hosts = [
      'ac-fw06elh-shard-00-00.osj0ebt.mongodb.net',
      'digitron.osj0ebt.mongodb.net'
    ];
    for (const host of hosts) {
      try {
        const addresses = await new Promise((resolve, reject) => {
          dns.resolve4(host, (err, addrs) => err ? reject(err) : resolve(addrs));
        });
        debugInfo.dnsResolution[host] = addresses;
      } catch (e) {
        debugInfo.dnsResolution[host] = `Error: ${e.message}`;
      }
    }
  } catch (err) {
    debugInfo.dnsError = err.message;
  }

  res.json(debugInfo);
});

app.get('/api/health', async (req, res) => {
  try {
    await withTimeout(
      prisma.$runCommandRaw({ ping: 1 }),
      5000,
      'MongoDB did not respond within 5 seconds. Check MONGODB_URI, network access, and Atlas IP allowlist.'
    );
    res.json({
      ok: true,
      database: 'connected',
      googleAuth: GOOGLE_AUTH_CONFIGURED ? 'configured' : 'missing credentials'
    });
  } catch (error) {
    logRouteError('Health check failed', error);
    res.status(500).json({
      ok: false,
      database: 'unreachable',
      error: error.message
    });
  }
});

app.post('/api/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });
});

app.get('/api/customer/cart', requireCustomer, (req, res) => {
  res.json(asArray(req.user.cart));
});

app.post('/api/customer/cart', requireCustomer, async (req, res) => {
  const { productId } = req.body;
  const quantity = sanitizeQuantity(req.body.quantity || 1);
  if (!productId || quantity < 1) return res.status(400).json({ error: 'Valid productId and quantity required' });

  const product = await findProductByIdentifier(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const cart = asArray(req.user.cart);
  const existing = cart.find((item) => item.productId === product.id);
  if (existing) {
    existing.quantity = quantity;
  } else {
    cart.push({ productId: product.id, quantity, addedAt: new Date().toISOString() });
  }
  const customer = await prisma.customer.update({ where: { id: req.user.id }, data: { cart } });
  req.user = customer;
  res.json(asArray(customer.cart));
});

app.delete('/api/customer/cart/:productId', requireCustomer, async (req, res) => {
  const cart = asArray(req.user.cart).filter((item) => item.productId !== req.params.productId);
  const customer = await prisma.customer.update({ where: { id: req.user.id }, data: { cart } });
  req.user = customer;
  res.json(asArray(customer.cart));
});

app.put('/api/customer/cart/:productId/quantity', requireCustomer, async (req, res) => {
  const quantity = sanitizeQuantity(req.body.quantity);
  let cart = asArray(req.user.cart);
  if (quantity === 0) {
    cart = cart.filter((item) => item.productId !== req.params.productId);
  } else {
    cart = cart.map((item) => item.productId === req.params.productId ? { ...item, quantity } : item);
  }
  const customer = await prisma.customer.update({ where: { id: req.user.id }, data: { cart } });
  req.user = customer;
  res.json(asArray(customer.cart));
});

app.delete('/api/customer/cart', requireCustomer, async (req, res) => {
  const customer = await prisma.customer.update({ where: { id: req.user.id }, data: { cart: [] } });
  req.user = customer;
  res.json([]);
});

app.get('/api/customer/wishlist', requireCustomer, (req, res) => {
  res.json(asArray(req.user.wishlist));
});

app.post('/api/customer/wishlist', requireCustomer, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const product = await findProductByIdentifier(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const current = asArray(req.user.wishlist);
  const wishlisted = !current.includes(product.id);
  const wishlist = wishlisted ? [...current, product.id] : current.filter((id) => id !== product.id);
  const customer = await prisma.customer.update({ where: { id: req.user.id }, data: { wishlist } });
  req.user = customer;
  res.json({ wishlisted, wishlist: asArray(customer.wishlist) });
});

app.get('/api/customer/profile', requireCustomer, (req, res) => {
  res.json(customerProfilePayload(req.user));
});

app.put('/api/customer/profile', requireCustomer, async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
  const customer = await prisma.customer.update({ where: { id: req.user.id }, data: { name } });
  req.user = customer;
  res.json(customerProfilePayload(customer));
});

app.post('/api/customer/addresses', requireCustomer, async (req, res) => {
  const addresses = asArray(req.user.addresses);
  if (addresses.length >= 5) return res.status(400).json({ error: 'Maximum 5 addresses allowed' });
  const address = {
    label: String(req.body.label || 'Home').trim(),
    line1: String(req.body.line1 || '').trim(),
    line2: String(req.body.line2 || '').trim(),
    city: String(req.body.city || '').trim(),
    state: String(req.body.state || '').trim(),
    pincode: String(req.body.pincode || '').trim(),
    phone: String(req.body.phone || '').trim(),
  };
  if (!address.line1 || !address.city || !address.state || !address.pincode || !address.phone) {
    return res.status(400).json({ error: 'Required address fields missing' });
  }
  const customer = await prisma.customer.update({
    where: { id: req.user.id },
    data: { addresses: [...addresses, address] }
  });
  req.user = customer;
  res.json(asArray(customer.addresses));
});

app.delete('/api/customer/addresses/:index', requireCustomer, async (req, res) => {
  const index = parseInt(req.params.index, 10);
  const addresses = asArray(req.user.addresses);
  if (!Number.isInteger(index) || index < 0 || index >= addresses.length) {
    return res.status(400).json({ error: 'Invalid address index' });
  }
  addresses.splice(index, 1);
  const customer = await prisma.customer.update({ where: { id: req.user.id }, data: { addresses } });
  req.user = customer;
  res.json(asArray(customer.addresses));
});

app.get('/api/customer/reviews', requireCustomer, async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { customerId: req.user.id },
    include: { product: { include: { category: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(reviews.map((review) => ({
    productId: review.productId,
    productName: review.product?.name || 'Product',
    rating: review.rating,
    text: review.reviewText,
    createdAt: review.createdAt
  })));
});

// --- Public Routes ---
app.get('/api/settings', async (req, res) => {
  res.json(siteSettings);
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    logRouteError('Error fetching categories', error);
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, search, limit = 50, offset = 0, admin, includeReviews } = req.query;
    const where = {};
    const andFilters = [];
    
    if (!admin && hiddenProductIds.length > 0) {
      const hiddenMongoIds = hiddenProductIds.filter(isMongoId);
      const hiddenLegacyIds = hiddenProductIds.map(numericId).filter(id => id !== null);
      if (hiddenMongoIds.length) andFilters.push({ id: { notIn: hiddenMongoIds } });
      if (hiddenLegacyIds.length) andFilters.push({ legacyId: { notIn: hiddenLegacyIds } });
    }

    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (andFilters.length) where.AND = andFilters;
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          reviews: includeReviews === 'true' ? { where: { isApproved: true } } : false
        },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { id: 'asc' }
      }),
      prisma.product.count({ where })
    ]);

    // Track searches
    if (search && products.length > 0) {
      products.forEach(p => {
        productVisits[p.id] = (productVisits[p.id] || 0) + 1;
      });
      saveVisits();
    }

    res.json({ products: products.map(mapProduct), total });
  } catch (error) {
    logRouteError('Error fetching products', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

app.get('/api/products/popular', async (req, res) => {
  try {
    const sortedKeys = Object.entries(productVisits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
    const mongoIds = sortedKeys.filter(isMongoId);
    const legacyIds = sortedKeys.map(numericId).filter(id => id !== null);

    let products = [];
    if (sortedKeys.length > 0) {
      products = await prisma.product.findMany({
        where: {
          OR: [
            ...(mongoIds.length ? [{ id: { in: mongoIds } }] : []),
            ...(legacyIds.length ? [{ legacyId: { in: legacyIds } }] : [])
          ]
        },
        include: { category: true, reviews: { where: { isApproved: true } } }
      });
      products.sort((a, b) => {
        const aKey = productVisits[a.id] ? a.id : String(a.legacyId);
        const bKey = productVisits[b.id] ? b.id : String(b.legacyId);
        return sortedKeys.indexOf(aKey) - sortedKeys.indexOf(bKey);
      });
    } else {
      // Fallback: return top 5 products if no views yet
      products = await prisma.product.findMany({
        take: 5,
        include: { category: true, reviews: { where: { isApproved: true } } }
      });
    }
    
    res.json(products.map(p => ({
      ...mapProduct(p),
      visits: productVisits[p.id] || productVisits[p.legacyId] || 0
    })));
  } catch (error) {
    console.error('Popular products error:', error);
    res.status(500).json({ error: 'Error fetching popular products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await findProductByIdentifier(req.params.id, { category: true, reviews: { where: { isApproved: true } } });
    if (!product) return res.status(404).json({ error: 'Not found' });

    // Track visit
    productVisits[product.id] = (productVisits[product.id] || 0) + 1;
    saveVisits();

    res.json(mapProduct(product));
  } catch (error) {
    logRouteError('Error fetching product', error);
    res.status(500).json({ error: 'Error fetching product' });
  }
});

app.post('/api/reviews', async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Please login to submit a review' });
  }
  const { productId, rating, reviewText } = req.body;
  try {
    const product = await findProductByIdentifier(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        customerId: req.user.id,
        customerName: req.user.name,
        reviewerName: req.user.name,
        rating: parseInt(rating),
        reviewText,
        isVerified: true,
        isApproved: true // Auto-approved!
      }
    });
    res.json({ success: true, review: mapReview(review) });
  } catch (error) {
    res.status(500).json({ error: 'Error saving review' });
  }
});

app.patch('/api/reviews/:id', requireCustomer, async (req, res) => {
  const { rating, reviewText, text } = req.body;
  try {
    const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Review not found' });
    if (existing.customerId !== req.user.id) return res.status(403).json({ error: 'You can only edit your own review' });

    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: {
        rating: parseInt(rating),
        reviewText: reviewText || text
      }
    });
    res.json({ success: true, review: mapReview(review) });
  } catch (error) {
    res.status(500).json({ error: 'Error updating review' });
  }
});

app.post('/api/quotes', async (req, res) => {
  console.log('Received Quote Request:', req.body);
  const { customerName, customerPhone, items } = req.body;
  try {
    const quote = await prisma.quoteRequest.create({
      data: { customerName, customerPhone, items }
    });
    
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log('Attempting to send email to:', process.env.EMAIL_USER);
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { 
          user: process.env.EMAIL_USER, 
          pass: process.env.EMAIL_PASS.replace(/\s+/g, '') // Remove any spaces in app password
        }
      });
      const itemsList = Array.isArray(items) ? items.map(i => {
        const note = i.message || i.requirements || i.notes;
        const email = i.customerEmail ? `\n  Email: ${i.customerEmail}` : '';
        return `- ${i.name} (Qty: ${i.qty || 1})${email}${note ? `\n  Customer wrote: ${note}` : ''}`;
      }).join('\n') : JSON.stringify(items);
      const mailOptions = {
        from: `"Digitron Associates" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `New Quote Request from ${customerName}`,
        text: `Customer Name: ${customerName}\nPhone: ${customerPhone}\n\nItems Requested:\n${itemsList}\n\nView in Admin Panel: http://localhost:5174/admin`
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error('Email Delivery Error:', err);
        else console.log('Email Sent Successfully:', info.response);
      });
    } else {
      console.log('Email credentials missing in .env');
    }
    
    res.json({ success: true, quoteId: quote.id });
  } catch (error) {
    console.error('Quote Creation Error:', error);
    res.status(500).json({ error: 'Error saving quote request' });
  }
});

// --- Admin Routes ---
app.put('/api/admin/settings', authenticateAdmin, async (req, res) => {
  try {
    siteSettings = mergeSettings(req.body);
    saveSettings();
    res.json({ success: true, settings: siteSettings });
  } catch (error) {
    console.error('Error saving site settings:', error);
    res.status(500).json({ error: 'Error saving site settings' });
  }
});

app.delete('/api/admin/settings', authenticateAdmin, async (req, res) => {
  try {
    siteSettings = mergeSettings();
    if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE);
    res.json({ success: true, settings: siteSettings });
  } catch (error) {
    console.error('Error resetting site settings:', error);
    res.status(500).json({ error: 'Error resetting site settings' });
  }
});

app.get('/api/admin/quotes', authenticateAdmin, async (req, res) => {
  try {
    const quotes = await prisma.quoteRequest.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching quotes' });
  }
});

app.patch('/api/admin/quotes/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.quoteRequest.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating quote status:', error);
    res.status(500).json({ error: 'Error updating quote status' });
  }
});

app.patch('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.stock) { data.stockStatus = data.stock; delete data.stock; }
    if (data.stock_qty) { data.stockQty = data.stock_qty; delete data.stock_qty; }
    if (data.indoor_outdoor) { data.indoorOutdoor = data.indoor_outdoor; delete data.indoor_outdoor; }
    if (data.best_for) { data.bestFor = data.best_for; delete data.best_for; }

    const existing = await findProductByIdentifier(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const product = await prisma.product.update({
      where: { id: existing.id },
      data,
      include: { category: true }
    });
    res.json(mapProduct(product));
  } catch (error) {
    res.status(500).json({ error: 'Error updating product' });
  }
});

app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
  const { name, brand, category: categoryName, price, stock } = req.body;
  try {
    // Find or create category
    let category = await prisma.category.findFirst({
      where: { name: { equals: categoryName, mode: 'insensitive' } }
    });
    if (!category) {
      const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      category = await prisma.category.create({
        data: { name: categoryName, slug }
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        brand: brand || 'Generic',
        categoryId: category.id,
        price: parseFloat(price) || 0,
        stockStatus: stock || 'In Stock',
        stockQty: 0,
        images: [],
        bestFor: []
      },
      include: { category: true }
    });

    res.json(mapProduct(product));
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Error creating product' });
  }
});

app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await findProductByIdentifier(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Delete related reviews to prevent foreign key errors
    await prisma.review.deleteMany({ where: { productId: product.id } });

    await prisma.product.delete({
      where: { id: product.id }
    });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Error deleting product' });
  }
});

app.post('/api/admin/products/:id/toggle-visibility', authenticateAdmin, async (req, res) => {
  try {
    const product = await findProductByIdentifier(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const pid = product.id;
    const index = hiddenProductIds.indexOf(pid);
    if (index > -1) {
      // Make visible again
      hiddenProductIds.splice(index, 1);
    } else {
      // Hide product
      hiddenProductIds.push(pid);
    }
    saveHidden();
    res.json({ success: true, is_visible: !hiddenProductIds.includes(pid) });
  } catch (error) {
    console.error('Error toggling product visibility:', error);
    res.status(500).json({ error: 'Error toggling product visibility' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
