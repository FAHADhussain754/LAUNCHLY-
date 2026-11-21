import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'launchly.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      is_demo INTEGER NOT NULL DEFAULT 0,
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_expires TEXT,
      country TEXT DEFAULT 'United States',
      language TEXT DEFAULT 'English',
      notification_prefs TEXT DEFAULT '{"store":true,"ai":true,"tasks":true,"billing":true,"marketing":false}',
      deletion_requested INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'General E-commerce',
      niche TEXT DEFAULT '',
      target_countries TEXT DEFAULT 'United States',
      stage TEXT NOT NULL DEFAULT 'Planning',
      launch_progress INTEGER NOT NULL DEFAULT 15,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS onboarding_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      experience_level TEXT DEFAULT '',
      budget TEXT DEFAULT '',
      target_countries TEXT DEFAULT '',
      preferred_categories TEXT DEFAULT '',
      weekly_hours TEXT DEFAULT '',
      has_existing_store TEXT DEFAULT 'no',
      marketing_experience TEXT DEFAULT '',
      goals TEXT DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'starter',
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      status TEXT NOT NULL DEFAULT 'trialing',
      ai_credits_limit INTEGER NOT NULL DEFAULT 40,
      ai_credits_used INTEGER NOT NULL DEFAULT 0,
      current_period_end TEXT NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'sandbox',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      plan TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      status TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'sandbox_adapter',
      provider_ref TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      active_agent TEXT NOT NULL DEFAULT 'Manager',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      agent_type TEXT DEFAULT 'Manager',
      content TEXT NOT NULL,
      saved INTEGER NOT NULL DEFAULT 0,
      feedback TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      feature TEXT NOT NULL,
      model TEXT NOT NULL,
      tokens_approx INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      website TEXT NOT NULL,
      categories TEXT NOT NULL,
      shipping_regions TEXT NOT NULL,
      delivery_estimate TEXT NOT NULL,
      moq TEXT NOT NULL,
      return_policy TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      integration_type TEXT NOT NULL DEFAULT 'manual_workflow',
      verification_status TEXT NOT NULL DEFAULT 'unverified',
      pricing_tier TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      business_model TEXT NOT NULL,
      image_url TEXT NOT NULL,
      supplier_id INTEGER,
      supplier_name TEXT NOT NULL,
      supplier_cost REAL,
      suggested_price REAL,
      shipping_info TEXT NOT NULL,
      target_country TEXT NOT NULL,
      competitor_summary TEXT NOT NULL,
      research_date TEXT NOT NULL,
      source_url TEXT NOT NULL,
      data_status TEXT NOT NULL DEFAULT 'verified_catalog',
      opportunity_criteria TEXT NOT NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS saved_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      collection_name TEXT NOT NULL DEFAULT 'Shortlist',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS supplier_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'manual_active',
      notes TEXT DEFAULT '',
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, supplier_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      platform TEXT NOT NULL DEFAULT 'shopify',
      shop_domain TEXT NOT NULL,
      store_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'awaiting_oauth_config',
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS imported_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      product_id INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'draft',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS marketing_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tool_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      folder TEXT NOT NULL DEFAULT 'General',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS financial_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      record_type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      record_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      phase TEXT NOT NULL,
      title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      dismissed INTEGER NOT NULL DEFAULT 0,
      is_ai_suggested INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS experts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      bio TEXT NOT NULL,
      skills TEXT NOT NULL,
      hourly_rate INTEGER NOT NULL,
      availability TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 1,
      verified_reviews_count INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 4.8,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expert_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      expert_id INTEGER,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      budget TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      quote_amount REAL,
      expert_reply TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS learning_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lesson_id TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      saved INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, lesson_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      admin_reply TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedPlatformDefaults();
}

function seedPlatformDefaults(): void {
  const existingPlans = db.prepare('SELECT key FROM platform_settings WHERE key = ?').get('plans_config');
  if (!existingPlans) {
    const defaultPlans = {
      starter: { name: 'Starter', monthlyPrice: 29, annualPrice: 24, aiCredits: 40, trialDays: 14 },
      builder: { name: 'Builder', monthlyPrice: 79, annualPrice: 64, aiCredits: 200, trialDays: 14 },
      professional: { name: 'Professional', monthlyPrice: 199, annualPrice: 159, aiCredits: 1000, trialDays: 14 },
    };
    db.prepare('INSERT INTO platform_settings (key, value) VALUES (?, ?)').run('plans_config', JSON.stringify(defaultPlans));
  }

  const supplierCount = (db.prepare('SELECT COUNT(*) as c FROM suppliers').get() as { c: number }).c;
  if (supplierCount === 0) {
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (name, country, website, categories, shipping_regions, delivery_estimate, moq, return_policy, contact_email, integration_type, verification_status, pricing_tier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSupplier.run(
      'Nordic Vessel Manufacturing',
      'United States',
      'https://example-supplier.launchly.invalid/nordic-vessel',
      'Lifestyle, Kitchen, Fitness',
      'United States, Canada, United Kingdom',
      '4-7 business days (Domestic US)',
      '25 units (Private Label) / 1 unit (Dropship)',
      '30-day defective replacement guarantee',
      'orders@nordicvessel-catalog.example',
      'api_available',
      'verified',
      'Wholesale Tier A'
    );
    insertSupplier.run(
      'Lumiere Deskworks Co.',
      'Germany',
      'https://example-supplier.launchly.invalid/lumiere',
      'Home and Living, Electronics Accessories',
      'EU, United Kingdom, United States',
      '5-9 business days (EU / US Air)',
      '10 units',
      '14-day unopened return with 10% restocking fee',
      'trade@lumiere-deskworks.example',
      'manual_workflow',
      'manually_reviewed',
      'Direct Manufacturer'
    );
    insertSupplier.run(
      'Atelier Loom Printworks',
      'United Kingdom',
      'https://example-supplier.launchly.invalid/atelier-loom',
      'Fashion, Lifestyle',
      'United Kingdom, Europe, North America',
      '3-6 business days (Print on Demand)',
      '1 unit (Print on Demand)',
      'Free reprint for misprints within 14 days',
      'fulfillment@atelierloom.example',
      'api_available',
      'verified',
      'POD Standard'
    );
    insertSupplier.run(
      'Hearth & Hound Ceramics',
      'Portugal',
      'https://example-supplier.launchly.invalid/hearth-hound',
      'Pet Products, Home and Living',
      'Europe, United States',
      '7-12 business days',
      '20 units',
      'Breakage replacement with photo proof within 7 days',
      'wholesale@hearthandhound.example',
      'manual_workflow',
      'manually_reviewed',
      'Boutique Wholesale'
    );
    insertSupplier.run(
      'Veridian Botanical Tools',
      'South Korea',
      'https://example-supplier.launchly.invalid/veridian',
      'Beauty and Personal Care',
      'Global (Tracked Air)',
      '6-11 business days',
      '50 units (Private Label)',
      'Strict hygiene policy: defective items only',
      'export@veridian-tools.example',
      'manual_workflow',
      'verified',
      'Private Label OEM'
    );
    insertSupplier.run(
      'Pacific Rim Sourcing Hub',
      'China',
      'https://example-supplier.launchly.invalid/pacific-rim',
      'Electronics Accessories, Kitchen, Lifestyle',
      'Global',
      'Unavailable — confirm quote directly with supplier',
      'Varies by SKU (unverified directory listing)',
      'Pending supplier verification',
      'sourcing@pacificrim-directory.example',
      'manual_workflow',
      'unverified',
      'Unverified Marketplace'
    );
  }

  const productCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, category, business_model, image_url, supplier_id, supplier_name, supplier_cost, suggested_price, shipping_info, target_country, competitor_summary, research_date, source_url, data_status, opportunity_criteria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertProduct.run(
      'Matte Charcoal Insulated Bottle (750ml)',
      'Fitness',
      'Private Label',
      '/src/assets/images/product_smart_bottle_1795275754164.jpg',
      1,
      'Nordic Vessel Manufacturing',
      11.50,
      34.00,
      '$4.20 domestic US ground (4-7 business days)',
      'United States',
      'Established athletic hydration brands price between $28 and $44; differentiation relies on laser-engraved branding.',
      '2026-11-18',
      'https://launchly.app/research/methodology#supplier-quote',
      'verified_catalog',
      JSON.stringify({ marginHealth: 'High (66% gross before shipping)', supplierVerification: 'Verified US facility', fulfillmentSpeed: '4-7 days', entryBarrier: 'Moderate (25-unit MOQ)' })
    );
    insertProduct.run(
      'Anodized Architectural LED Desk Lamp',
      'Home and Living',
      'General E-commerce',
      '/src/assets/images/product_desk_lamp_1795275754273.jpg',
      2,
      'Lumiere Deskworks Co.',
      26.00,
      78.00,
      '$9.50 tracked EU/US air freight (5-9 business days)',
      'United Kingdom',
      'Home-office lighting competitors range from $55 to $110; USB-C dimming and CRI 95+ specs drive positioning.',
      '2026-11-17',
      'https://launchly.app/research/methodology#manual-review',
      'verified_catalog',
      JSON.stringify({ marginHealth: 'High (67% gross before shipping)', supplierVerification: 'Manually reviewed EU maker', fulfillmentSpeed: '5-9 days', entryBarrier: 'Low-moderate (10-unit MOQ)' })
    );
    insertProduct.run(
      'Organic Heavyweight Canvas Carryall Tote',
      'Fashion',
      'Print on Demand',
      '/src/assets/images/product_linen_tote_1795275754859.jpg',
      3,
      'Atelier Loom Printworks',
      14.80,
      42.00,
      '$5.10 UK/EU/US fulfillment (3-6 business days)',
      'United States',
      'Minimalist everyday totes compete on fabric weight (16oz+) and stitched trim rather than thin promo bags.',
      '2026-11-19',
      'https://launchly.app/research/methodology#pod-catalog',
      'verified_catalog',
      JSON.stringify({ marginHealth: 'Healthy (65% gross before shipping)', supplierVerification: 'Verified POD partner', fulfillmentSpeed: '3-6 days', entryBarrier: 'Very Low (1-unit POD)' })
    );
    insertProduct.run(
      'Ceramic & Bamboo Elevated Pet Bowl Set',
      'Pet Products',
      'Dropshipping',
      '/src/assets/images/product_pet_feeder_1795275754921.jpg',
      4,
      'Hearth & Hound Ceramics',
      16.20,
      46.00,
      '$7.80 insured parcel (7-12 business days)',
      'Canada',
      'Mid-tier pet accessories average $35-$55; dishwasher-safe ceramic bowls outperform plastic feeders in reviews.',
      '2026-11-15',
      'https://launchly.app/research/methodology#manual-review',
      'verified_catalog',
      JSON.stringify({ marginHealth: 'Healthy (65% gross before shipping)', supplierVerification: 'Manually reviewed Portugal maker', fulfillmentSpeed: '7-12 days', entryBarrier: 'Moderate (20-unit MOQ or sample order)' })
    );
    insertProduct.run(
      'Sculpted Jade & Steel Facial Roller Set',
      'Beauty and Personal Care',
      'Private Label',
      '/src/assets/images/product_skincare_roller_1795275755366.jpg',
      5,
      'Veridian Botanical Tools',
      8.40,
      32.00,
      '$4.60 tracked air parcel (6-11 business days)',
      'Australia',
      'Crowded entry-level market; higher margin requires rigid gift-box packaging and stone authenticity documentation.',
      '2026-11-16',
      'https://launchly.app/research/methodology#oem-quote',
      'verified_catalog',
      JSON.stringify({ marginHealth: 'High (74% gross before shipping)', supplierVerification: 'Verified OEM partner', fulfillmentSpeed: '6-11 days', entryBarrier: 'Moderate (50-unit MOQ)' })
    );
    insertProduct.run(
      'Modular Countertop Pour-Over Kettle',
      'Kitchen',
      'Dropshipping',
      '/src/assets/images/product_smart_bottle_1795275754164.jpg',
      6,
      'Pacific Rim Sourcing Hub',
      null,
      49.00,
      'Shipping rate unavailable — awaiting verified supplier quote',
      'United States',
      'Specialty coffee hardware prices at $45-$85; supplier cost and duty rates are not yet verified.',
      '2026-11-20',
      'https://launchly.app/research/methodology#unverified-lead',
      'unavailable_partial',
      JSON.stringify({ marginHealth: 'Unavailable (supplier cost pending)', supplierVerification: 'Unverified directory lead', fulfillmentSpeed: 'Unconfirmed', entryBarrier: 'Requires quotation before listing' })
    );
  }

  const expertCount = (db.prepare('SELECT COUNT(*) as c FROM experts').get() as { c: number }).c;
  if (expertCount === 0) {
    const insertExpert = db.prepare(`
      INSERT INTO experts (name, category, bio, skills, hourly_rate, availability, approved, verified_reviews_count, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertExpert.run(
      'Nadia Al-Mansoor',
      'Shopify Developers',
      'Former agency lead building fast, accessible Online Store 2.0 storefronts with clean Liquid themes and zero bloated apps.',
      'Shopify Liquid, Checkout Extensibility, Speed Optimization, Product Metafields',
      85,
      'Available this week',
      1,
      19,
      4.9
    );
    insertExpert.run(
      'Daniel Lindqvist',
      'Product Researchers',
      'Supply-chain analyst specializing in unit-economics validation, landed cost modeling, and EU/US compliance checks.',
      'Unit Economics, Supplier Vetting, Landed Cost Modeling, Competitor Audits',
      70,
      'Available in 2 days',
      1,
      14,
      4.8
    );
    insertExpert.run(
      'Priya Nair',
      'Marketing Specialists',
      'Performance creative strategist focused on organic TikTok hooks, Meta acquisition testing, and retention email flows.',
      'TikTok Creative, Meta Ads Structure, Klaviyo Flows, Offer Positioning',
      75,
      'Available this week',
      1,
      23,
      4.9
    );
    insertExpert.run(
      'Tomasz Kowalski',
      'Graphic Designers',
      'Brand identity and packaging designer creating cohesive logos, product render guidelines, and print-ready dielines.',
      'Brand Identity, Packaging Design, Product Mockups, Social Templates',
      65,
      'Next week',
      1,
      11,
      4.8
    );
    insertExpert.run(
      'Hannah Brooks',
      'E-commerce Consultants',
      'Helps first-time founders move from concept to launch checklist without overbuying inventory or apps.',
      'Launch Roadmaps, Business Model Selection, Pricing Strategy, Operations',
      90,
      'Available this week',
      1,
      27,
      5.0
    );
    insertExpert.run(
      'Kenji Takahashi',
      'SEO Specialists',
      'Technical and collection-page SEO specialist for Shopify and WooCommerce catalogs.',
      'Keyword Architecture, Collection SEO, Schema Markup, Content Audits',
      65,
      'Available in 3 days',
      1,
      8,
      4.7
    );
    insertExpert.run(
      'Marcus Vance',
      'Advertising Experts',
      'Applicant awaiting admin verification — specializes in Google Shopping feeds and Meta catalog campaigns.',
      'Google Shopping, Feed Optimization, ROAS Diagnostics',
      80,
      'Pending approval',
      0,
      0,
      0
    );
  }

  // Seed clearly-labeled Sample Demo Workspace account
  const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@launchly.app') as { id: number } | undefined;
  if (!demoUser) {
    const res = db.prepare(`
      INSERT INTO users (email, password_hash, name, role, is_demo, email_verified, country, language)
      VALUES (?, ?, ?, 'customer', 1, 1, 'United States', 'English')
    `).run('demo@launchly.app', hashPassword('LaunchlyDemo2026!'), 'Alex Rivera (Demo)');
    const demoId = Number(res.lastInsertRowid);

    db.prepare(`
      INSERT INTO businesses (user_id, name, model, niche, target_countries, stage, launch_progress)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(demoId, 'Vespera Home Goods (Sample)', 'Private Label', 'Minimalist Home & Desk Accessories', 'United States, Canada', 'Store Setup', 62);

    db.prepare(`
      INSERT INTO onboarding_responses (user_id, experience_level, budget, target_countries, preferred_categories, weekly_hours, has_existing_store, marketing_experience, goals, completed)
      VALUES (?, 'Beginner', '$1,000 - $3,000', 'United States, Canada', 'Home and Living, Fitness', '10-15 hours/week', 'no', 'Basic social media', 'Launch a focused 3-SKU brand within 60 days', 1)
    `).run(demoId);

    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString();
    db.prepare(`
      INSERT INTO subscriptions (user_id, plan, billing_cycle, status, ai_credits_limit, ai_credits_used, current_period_end, payment_mode)
      VALUES (?, 'builder', 'monthly', 'active', 200, 14, ?, 'sandbox')
    `).run(demoId, nextMonth);

    db.prepare(`INSERT INTO saved_products (user_id, product_id, collection_name, notes) VALUES (?, 1, 'Q4 Launch Candidates', 'Strong margin after engraving quote')`).run(demoId);
    db.prepare(`INSERT INTO saved_products (user_id, product_id, collection_name, notes) VALUES (?, 2, 'Q4 Launch Candidates', 'Confirm UL/CE adapter specs before import')`).run(demoId);
    db.prepare(`INSERT INTO supplier_connections (user_id, supplier_id, status, notes, last_synced_at) VALUES (?, 1, 'connected_api', 'Sample API catalog sync enabled', datetime('now'))`).run(demoId);

    const insertTask = db.prepare(`INSERT INTO tasks (user_id, phase, title, priority, due_date, completed, is_ai_suggested) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insertTask.run(demoId, 'Planning', 'Finalize brand name and domain availability', 'high', '2026-11-24', 1, 0);
    insertTask.run(demoId, 'Product research', 'Compare landed unit cost for 2 shortlisted SKUs', 'high', '2026-11-26', 1, 1);
    insertTask.run(demoId, 'Suppliers', 'Request sample unit from Nordic Vessel Manufacturing', 'high', '2026-11-29', 0, 1);
    insertTask.run(demoId, 'Store setup', 'Connect Shopify store via OAuth and review shipping zones', 'medium', '2026-12-03', 0, 0);
    insertTask.run(demoId, 'Marketing', 'Draft 3 TikTok product launch scripts in Marketing Studio', 'medium', '2026-12-06', 0, 1);

    const insertFin = db.prepare(`INSERT INTO financial_records (user_id, record_type, category, description, amount, currency, record_date) VALUES (?, ?, ?, ?, ?, 'USD', ?)`);
    insertFin.run(demoId, 'actual_expense', 'Samples', 'Product sample units + express shipping (Demo sample)', 142.00, '2026-11-10');
    insertFin.run(demoId, 'actual_expense', 'Software', 'Domain registration + LAUNCHLY Builder sandbox (Demo sample)', 91.00, '2026-11-12');
    insertFin.run(demoId, 'projection', 'Projected Launch Budget', 'Initial 25-unit inventory batch estimate', 520.00, '2026-12-01');

    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (?, 'ai_research', 'Sample Demo Workspace Active', 'You are viewing clearly labeled sample data. Register your own account to start a clean business workspace.')
    `).run(demoId);
  }
}

export function logAudit(userId: number | null, actorEmail: string, action: string, details: string): void {
  try {
    db.prepare('INSERT INTO audit_logs (user_id, actor_email, action, details) VALUES (?, ?, ?, ?)').run(
      userId,
      actorEmail,
      action,
      details
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
