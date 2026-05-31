const express = require('express');
const cors = require('cors');
const net = require('net');

const app = express();
const PORT = 5050;

const ZEBRA_IP = '10.1.1.9';
const ZEBRA_PORT = 9100;

app.use(cors());
app.use(express.text({ type: '*/*' }));

app.post('/print', (req, res) => {
  const zpl = req.body;

  if (!zpl) {
    return res.status(400).send('No ZPL received');
  }

  const client = new net.Socket();

  client.connect(ZEBRA_PORT, ZEBRA_IP, () => {
    client.write(zpl);
    client.end();
    res.send('Printed successfully');
  });

  client.on('error', (err) => {
    console.error('Zebra print error:', err.message);
    res.status(500).send('Printer error: ' + err.message);
  });
});

app.listen(PORT, () => {
  console.log(`Zebra print server running on http://localhost:${PORT}`);
});