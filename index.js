const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.post('/gchat-bot', (req, res) => {
  console.log('[RAW EVENT] Received:', JSON.stringify(req.body, null, 2));

  const eventType = req.body?.type || 'UNKNOWN';
  console.log('[EVENT TYPE]', eventType);

  if (eventType === 'MESSAGE') {
    const userMessage = req.body.message?.text || 'No message';
    const botReply = `You said: "${userMessage}"`;
    console.log('[MESSAGE] Replying:', botReply);
    return res.status(200).json({ text: botReply });
  }

  // You can handle other types here if needed
  if (eventType === 'ADDED_TO_SPACE') {
    console.log('[EVENT] Bot was added to space.');
    return res.status(200).json({ text: 'Thanks for adding me to this space!' });
  }

  if (eventType === 'REMOVED_FROM_SPACE') {
    console.log('[EVENT] Bot was removed from space.');
    return res.sendStatus(200);
  }

  console.log('[EVENT] Unknown or unsupported type');
  return res.status(200).json({ text: `Event received: ${eventType}` });
});


// 🔹 When app is added to a space
app.post('/added', (req, res) => {
  console.log('[ADDED EVENT] Bot added to a space:', req.body.space?.name);
  res.status(200).json({ text: 'Thanks for adding me to this space!' });
});

// 🔹 When app is removed from a space
app.post('/removed', (req, res) => {
  console.log('[REMOVED EVENT] Bot removed from a space:', req.body.space?.name);
  res.sendStatus(200); // No reply needed
});

// 🔹 When a slash command is used
app.post('/command', (req, res) => {
  console.log('[COMMAND EVENT] Received:', req.body);
  
  const command = req.body?.message?.argumentText || '(no command)';
  console.log('[COMMAND EVENT] Command text:', command);

  res.status(200).json({ text: `You used a command: ${command}` });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`🚀 Bot server running on port ${PORT}`);
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
