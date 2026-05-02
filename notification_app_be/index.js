const express = require('express');
const cors = require('cors');

const routes = require('./routes/notificationRoutes');
const { Log } = require('../logging_middleware');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/v1/notifications', routes);

app.get('/health', async (req, res) => {
    await Log('backend', 'info', 'route', 'health api hit');
    res.json({ ok: true });
});

app.use(async (req, res) => {
    await Log('backend', 'error', 'route', 'not found url: ' + req.url);
    res.status(404).json({ error: 'not found' });
});

app.listen(port, () => {
    console.log("running on 3000");
});
