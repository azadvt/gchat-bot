const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/chatbot', (req, res) => {
  const message = req.body.message?.text || '';
  const email = req.body.message?.sender?.email || '';

  // Basic email auth (replace with real logic)
  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    return res.json({ text: 'Unauthorized access.' });
  }

  // Handle the message
  let reply = '';
  if (message.toLowerCase().includes('hello')) {
    reply = `Hi ${email.split('@')[0]}! 👋`;
  } else {
    reply = `You said: "${message}"`;
  }

  res.json({ text: reply });
});

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
