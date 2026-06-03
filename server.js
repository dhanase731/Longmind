require('dotenv').config();
// Override DNS to use Google's public resolver (required in restricted network environments)
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const app = require('./src/app');
const { PORT } = require('./src/config/env');

const port = PORT || 3000;

app.listen(port, () => {
  console.log(`LongMind backend listening on port ${port}`);
});
