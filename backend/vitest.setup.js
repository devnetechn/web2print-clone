import dotenv from 'dotenv';
// Load test env BEFORE any app module imports config/env.js.
// dotenv does not override already-set process.env vars.
dotenv.config({ path: '.env.test' });
