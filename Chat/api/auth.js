import { v4 as uuidv4 } from 'uuid';

// In-memory storage (for demo - use database in production)
const users = new Map();
const sessions = new Map();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, username, password, sessionId } = req.body;

  try {
    if (req.method === 'POST') {
      if (action === 'signup') {
        // Signup logic
        if (users.has(username)) {
          return res.status(400).json({ error: 'Username already exists' });
        }

        const userCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        users.set(username, { password, userCode });
        
        return res.json({
          success: true,
          username,
          userCode,
          message: 'Account created successfully!'
        });
      }

      if (action === 'login') {
        // Login logic
        const user = users.get(username);
        if (!user || user.password !== password) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const sessionId = uuidv4();
        sessions.set(sessionId, { username, userCode: user.userCode });
        
        return res.json({
          success: true,
          username,
          userCode: user.userCode,
          sessionId,
          message: 'Login successful!'
        });
      }

      if (action === 'validate') {
        // Validate session
        const session = sessions.get(sessionId);
        if (!session) {
          return res.status(401).json({ error: 'Invalid session' });
        }
        return res.json({ success: true, user: session });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}