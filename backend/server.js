import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Odoo Configuration
const ODOO_URL = process.env.ODOO_URL || 'http://localhost:8069';
const ODOO_DB = process.env.ODOO_DB || 'tmc_db';
const ODOO_USER = process.env.ODOO_USER || 'admin';
const ODOO_PASSWORD = process.env.ODOO_PASSWORD || 'admin';

// Caching System
let productsCache = {
  data: null,
  lastFetch: 0
};
const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour in milliseconds

// Helper function to authenticate with Odoo JSON-2 API
async function authenticateOdoo() {
  const authPayload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service: 'common',
      method: 'login',
      args: [ODOO_DB, ODOO_USER, ODOO_PASSWORD]
    },
    id: Math.floor(Math.random() * 1000000)
  };

  try {
    const response = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload)
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Odoo Auth Error: ${data.error.data.message}`);
    }
    
    return data.result; // This is the user ID (uid)
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

// Routes
app.get('/api/products', async (req, res) => {
  try {
    const now = Date.now();
    
    // Check if we have valid cache
    if (productsCache.data && (now - productsCache.lastFetch < CACHE_DURATION)) {
      console.log('Serving products from cache');
      return res.json({
        status: 'success',
        source: 'cache',
        data: productsCache.data
      });
    }

    console.log('Fetching fresh products from Odoo...');
    const uid = await authenticateOdoo();
    
    if (!uid) {
      return res.status(401).json({ status: 'error', message: 'Failed to authenticate with Odoo' });
    }

    // Query Odoo for products using JSON-2 API
    // We will fetch product template data including categ_id for grid positioning
    const searchPayload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          uid,
          ODOO_PASSWORD,
          'product.template',
          'search_read',
          [
            [
              ['sale_ok', '=', true],
              // Add specific category IDs based on the strategy document
              // Networking (8), Servers (17), Wireless (9)
              ['categ_id', 'in', [8, 17, 9]] 
            ]
          ],
          {
            // Add attribute_line_ids to the requested fields
            fields: ['id', 'display_name', 'list_price', 'description_sale', 'image_512', 'categ_id', 'attribute_line_ids'],
            limit: 15 // Limit the number of 3D objects to avoid performance issues
          }
        ]
      },
      id: Math.floor(Math.random() * 1000000)
    };

    const response = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchPayload)
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ status: 'error', message: data.error.data.message });
    }

    // Transform Odoo data to match our frontend contract
    const products = data.result.map(product => {
      // Determine the vertical track X position based on Category ID (Strategy Rule)
      let trackX = 0; // Default (Servers)
      const catId = product.categ_id ? product.categ_id[0] : 0;
      if (catId === 8) trackX = -3; // Networking
      if (catId === 9) trackX = 3;  // Wireless

      return {
        id: product.id,
        name: product.display_name,
        price: product.list_price,
        description: product.description_sale || 'مواصفات تقنية متقدمة.',
        image: product.image_512 ? `data:image/png;base64,${product.image_512}` : null,
        category: product.categ_id ? product.categ_id[1] : 'عام',
        categoryId: catId,
        trackX: trackX,
        attributes: product.attribute_line_ids || [] // Pass attributes for modal display
      };
    });

    // Update Cache
    if (products.length > 0) {
      productsCache.data = products;
      productsCache.lastFetch = Date.now();
    }

    // If Odoo is not reachable or empty during development, fallback to mock data
    if (products.length === 0 && process.env.NODE_ENV !== 'production') {
       console.log("No products found, falling back to mock data for development");
       return res.json({
          status: 'success',
          is_mock: true,
          data: [
            {
              id: 101,
              name: "سيرفر TMC المتقدم (Server)",
              price: 15000.00,
              description: "أداء فائق للشركات الكبيرة.",
              image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
              category: "Servers",
              categoryId: 17,
              trackX: 0,
              attributes: []
            },
            {
              id: 103,
              name: "نقاط وصول شبكية (Wireless)",
              price: 800.00,
              description: "تغطية واي فاي شاملة وآمنة.",
              image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
              category: "Wireless",
              categoryId: 9,
              trackX: 3,
              attributes: []
            },
            {
              id: 104,
              name: "معدات شبكات (Networking)",
              price: 1200.00,
              description: "بنية تحتية متينة للشبكات.",
              image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
              category: "Networking",
              categoryId: 8,
              trackX: -3,
              attributes: []
            }
          ]
       });
    }

    res.json({
      status: 'success',
      data: products
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'TMC 3D Integration API' });
});

app.listen(PORT, () => {
  console.log(`Backend integration service running on port ${PORT}`);
});