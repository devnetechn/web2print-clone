import { createApp } from './app.js';
import { env } from './config/env.js';

createApp().listen(env.port, () => {
  console.log(`web2print API listening on http://localhost:${env.port}`);
});
