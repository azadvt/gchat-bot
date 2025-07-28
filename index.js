const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// 🔹 Respond to messages
app.post('/gchat-bot', (req, res) => {
  const { type, message } = req.body;

  if (type === 'MESSAGE') {
    const userMessage = message?.text || 'No message';
    const botReply = `You said: "${userMessage}"`;
    console.log('botReply:', botReply);
    res.status(200).json({ text: botReply });
  } else {
    res.sendStatus(200);
  }
});

// 🔹 When app is added to a space
app.post('/added', (req, res) => {
  console.log('Bot added to space');
  res.status(200).json({ text: 'Thanks for adding me to this space!' });
});

// 🔹 When app is removed from a space
app.post('/removed', (req, res) => {
  console.log('Bot removed from space');
  res.sendStatus(200); // No reply needed
});

// 🔹 When a slash command is used (if configured)
app.post('/command', (req, res) => {
  const command = req.body?.message?.argumentText || '(no command)';
  console.log('Command received:', command);
  res.status(200).json({ text: `You used a command: ${command}` });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => process.exit(0));
});
