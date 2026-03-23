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
    const uid = await authenticateOdoo();
    
    if (!uid) {
      return res.status(401).json({ status: 'error', message: 'Failed to authenticate with Odoo' });
    }

    // Query Odoo for products using JSON-2 API
    // Filtering by a custom tag or flag indicating it should be shown on the 3D website
    // Example: searching for product.template where 'is_published' is true (or a custom 'website_3d_visible' field)
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
              // Add your specific filter here. For example, if you have a tag for 3D:
              // ['product_tag_ids.name', 'in', ['Website_3D']] 
            ]
          ],
          {
            fields: ['id', 'display_name', 'list_price', 'description_sale', 'image_1920', 'categ_id'],
            limit: 10 // Limit the number of 3D objects to avoid performance issues
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
    const products = data.result.map(product => ({
      id: product.id,
      name: product.display_name,
      price: product.list_price,
      description: product.description_sale || 'لا يوجد وصف متاح.',
      // Odoo sends image_1920 as base64 string without the data URI prefix
      image: product.image_1920 ? `data:image/png;base64,${product.image_1920}` : null,
      category: product.categ_id ? product.categ_id[1] : 'عام'
    }));

    // If Odoo is not reachable or empty during development, fallback to mock data
    if (products.length === 0 && process.env.NODE_ENV !== 'production') {
       console.log("No products found, falling back to mock data for development");
       return res.json({
          status: 'success',
          is_mock: true,
          data: [
            {
              id: 101,
              name: "تصميم الهوية البصرية (Branding)",
              price: 500.00,
              description: "نبني لك هوية بصرية متكاملة تعكس رؤية شركتك وتجذب عملاءك.",
              image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
              category: "Design"
            },
            {
              id: 102,
              name: "تطوير تطبيقات الويب (Web App)",
              price: 1200.00,
              description: "تطبيقات ويب سريعة، آمنة، ومبنية بأحدث التقنيات.",
              image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
              category: "Development"
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