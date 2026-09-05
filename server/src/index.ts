import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { MarketDataProviderFactory } from './providers/MarketDataProviderFactory';
import { createApiRouter } from './routes/api';

// Load environment variables from .env if present
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & Body Parser
app.use(cors({
  origin: '*', // Allow all origins for dev/demo mode
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));
app.use(express.json());

// Initialize Market Data Provider via Factory
const marketProvider = MarketDataProviderFactory.createProvider();

// Attach API Routes
app.use('/api', createApiRouter(marketProvider));

// Fallback index route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to MarketPulse API Service',
    health: '/api/health',
    dashboard: '/api/dashboard',
    rewind: '/api/dashboard/rewind',
    stocks: '/api/stocks'
  });
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 MarketPulse Server running on http://localhost:${PORT}`);
  console.log(`=================================================`);
});

