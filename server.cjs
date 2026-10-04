const { createApp } = require('./server/app.cjs');
const { port } = require('./server/config.cjs');

const app = createApp();
app.listen(port, () => {
  console.log(`FX API listening on http://localhost:${port}`);
});
