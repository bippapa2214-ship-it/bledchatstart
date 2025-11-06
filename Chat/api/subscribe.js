// Server-Sent Events for real-time updates
const subscribers = new Map();

export default async function handler(req, res) {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { room } = req.query;

  if (!room) {
    return res.status(400).json({ error: 'Room parameter required' });
  }

  // Store this connection
  if (!subscribers.has(room)) {
    subscribers.set(room, []);
  }

  const subscriber = { res, id: Date.now() };
  subscribers.get(room).push(subscriber);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: `Connected to room: ${room}`,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Send ping every 25 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      clearInterval(pingInterval);
    }
  }, 25000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
    const roomSubscribers = subscribers.get(room) || [];
    const index = roomSubscribers.findIndex(s => s.id === subscriber.id);
    if (index > -1) {
      roomSubscribers.splice(index, 1);
    }
  });
}