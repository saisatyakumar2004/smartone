const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Reads the JWT from the HTTP-only cookie, verifies it, and attaches req.user.
async function protect(req, res, next) {
  try {
    const token = req.cookies && req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated. Please log in.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists.' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session invalid or expired. Please log in again.' });
    }
    next(err);
  }
}

module.exports = { protect };
