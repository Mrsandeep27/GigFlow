// Next.js API Route — wraps Express app as a catch-all
// pages/api/ works alongside App Router and is the correct
// way to run Express on Vercel with Next.js

const app = require('../../gigflow-backend/src/app');

module.exports = app;
