// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(bodyParser.json());

// Custom middleware: Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Simple authentication middleware
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === 'mysecretkey') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Missing or invalid API key.' });
  }
};

// Sample in-memory products database
let products = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop with 16GB RAM',
    price: 1200,
    category: 'electronics',
    inStock: true
  },
  {
    id: '2',
    name: 'Smartphone',
    description: 'Latest model with 128GB storage',
    price: 800,
    category: 'electronics',
    inStock: true
  },
  {
    id: '3',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with timer',
    price: 50,
    category: 'kitchen',
    inStock: false
  }
];

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Product API! Go to /api/products to see all products.');
});

// Validation middleware for product creation and updates
const validateProduct = (req, res, next) => {
  const { name, description, price, category, inStock } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Product name is required and must be a string.' });
  }
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'Product description is required and must be a string.' });
  }
  if (price === undefined || typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'Product price is required and must be a non-negative number.' });
  }
  if (!category || typeof category !== 'string') {
    return res.status(400).json({ error: 'Product category is required and must be a string.' });
  }
  if (inStock === undefined || typeof inStock !== 'boolean') {
    return res.status(400).json({ error: 'Product inStock status is required and must be a boolean.' });
  }

  next();
};

// GET /api/products
// Supports filtering (category, inStock), search (name), pagination (page, limit)
app.get('/api/products', (req, res) => {
  let results = [...products];

  // Filtering
  if (req.query.category) {
    results = results.filter(p => p.category.toLowerCase() === req.query.category.toLowerCase());
  }
  if (req.query.inStock) {
    const inStock = req.query.inStock.toLowerCase();
    if (inStock === 'true' || inStock === 'false') {
      results = results.filter(p => p.inStock === (inStock === 'true'));
    }
  }

  // Search by name (case-insensitive)
  if (req.query.search) {
    const searchTerm = req.query.search.toLowerCase();
    results = results.filter(p => p.name.toLowerCase().includes(searchTerm));
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedResults = results.slice(startIndex, endIndex);

  res.json({
    page,
    limit,
    total: results.length,
    data: paginatedResults,
  });
});

// GET /api/products/:id
app.get('/api/products/:id', (req, res, next) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json(product);
});

// POST /api/products
app.post('/api/products', authenticate, validateProduct, (req, res) => {
  const { name, description, price, category, inStock } = req.body;
  const newProduct = {
    id: uuidv4(),
    name,
    description,
