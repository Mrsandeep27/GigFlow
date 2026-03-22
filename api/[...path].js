// Vercel Serverless Function — wraps the Express app as a catch-all handler
// All requests to /api/* are handled by this single function

const app = require('../gigflow-backend/src/app');

module.exports = app;
