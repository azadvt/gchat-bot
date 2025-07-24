const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/chatbot', (req, res) => {
  // Onboarding: Send welcome message when added to a space
  if (req.body.type === 'ADDED_TO_SPACE') {
    return res.json({
      text: 'Hi, GChat bot at your service! Type "hello" to greet me, or just send a message and I will echo it back. To restrict access, only certain emails are allowed.'
    });
  }

  const message = req.body.message?.text || '';
  const email = req.body.message?.sender?.email || '';

  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    return res.json({
      text: '❌ Unauthorized access.'
    });
  }

  let reply = '';
  if (message.toLowerCase().includes('hello')) {
    reply = `Hi ${email.split('@')[0]}! 👋`;
  } else {
    reply = `You said: "${message}"`;
  }

  res.json({
    text: reply
  });
});

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
