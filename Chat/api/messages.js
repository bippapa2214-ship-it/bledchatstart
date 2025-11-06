// In-memory storage for messages and rooms
const messages = new Map(); // room -> messages array
const rooms = new Map(); // roomCode -> room data
const subscribers = new Map(); // room -> array of response objects

// Initialize general room
messages.set('general', []);
rooms.set('general', { users: new Set(), isPrivate: false });

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, room, message, username, roomCode } = req.body;

  try {
    if (req.method === 'POST') {
      if (action === 'send_message') {
        // Send message to room
        if (!messages.has(room)) {
          messages.set(room, []);
        }

        const newMessage = {
          id: Date.now().toString(),
          type: 'message',
          username,
          text: message,
          room,
          timestamp: new Date().toISOString()
        };

        messages.get(room).push(newMessage);
        
        // Broadcast to subscribers
        broadcastToRoom(room, newMessage);
        
        return res.json({ success: true, message: 'Message sent' });
      }

      if (action === 'get_messages') {
        // Get message history for room
        const roomMessages = messages.get(room) || [];
        return res.json({ success: true, messages: roomMessages.slice(-50) });
      }

      if (action === 'create_room') {
        // Create private room
        const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        messages.set(newRoomCode, []);
        rooms.set(newRoomCode, { users: new Set([username]), isPrivate: true });
        
        return res.json({ 
          success: true, 
          roomCode: newRoomCode,
          message: 'Private room created!'
        });
      }

      if (action === 'join_room') {
        // Join room
        if (!rooms.has(roomCode) && roomCode !== 'general') {
          return res.status(404).json({ error: 'Room not found' });
        }

        if (!rooms.has(roomCode)) {
          rooms.set(roomCode, { users: new Set(), isPrivate: false });
        }
        
        rooms.get(roomCode).users.add(username);
        broadcastToRoom(roomCode, {
          type: 'user_joined',
          username,
          message: `${username} joined the room`,
          timestamp: new Date().toISOString()
        });
        
        return res.json({ success: true, room: roomCode });
      }

      if (action === 'get_rooms') {
        // Get available rooms
        const roomList = Array.from(rooms.entries()).map(([code, data]) => ({
          code,
          userCount: data.users.size,
          isPrivate: data.isPrivate
        }));
        return res.json({ success: true, rooms: roomList });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function broadcastToRoom(room, message) {
  const roomSubscribers = subscribers.get(room) || [];
  roomSubscribers.forEach(subscriber => {
    try {
      subscriber.res.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (error) {
      console.error('Broadcast error:', error);
    }
  });
}