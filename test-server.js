const express = require('express');
const { registerRoutes } = require('./server/routes');
const { createServer } = require('http');

// Create Express app
const app = express();
app.use(express.json());

// Register routes
const server = createServer(app);
registerRoutes(app).then(() => {
  // Start the server
  const PORT = process.env.PORT || 3002;
  server.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log(`  POST http://localhost:${PORT}/api/contact`);
    console.log(`  GET  http://localhost:${PORT}/api/contacts`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
