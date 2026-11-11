const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { FRONTEND_ORIGIN, RPC_URL, CONTRACT_ADDRESS, CHAIN_ID, NODE_ENV } = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const chain = require('./services/blockchain.service');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: [FRONTEND_ORIGIN, 'http://127.0.0.1:5173', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);

/** Liveness + readiness: reports whether the backend can actually reach the chain. */
app.get('/api/health', async (_req, res) => {
  let chainOk = false;
  let blockNumber = null;
  try {
    blockNumber = await chain.provider.getBlockNumber();
    chainOk = true;
  } catch {
    chainOk = false;
  }
  res.json({
    status: 'ok',
    service: 'certichain-api',
    env: NODE_ENV,
    time: new Date().toISOString(),
    blockchain: { connected: chainOk, rpc: RPC_URL, chainId: CHAIN_ID, contract: CONTRACT_ADDRESS, blockNumber },
  });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/certificates', require('./routes/certificate.routes'));
app.use('/api/verify', require('./routes/verify.routes'));

// 404 for anything unmatched
app.use((req, _res, next) => next(ApiError.notFound(`No such route: ${req.method} ${req.path}`)));

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;
