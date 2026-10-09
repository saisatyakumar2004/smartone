const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_NAME = 'token';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true, // JavaScript in the browser cannot read this cookie
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
});

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

// Only accept plain strings so objects like {"$ne": ""} can't be used for NoSQL injection.
const str = (v) => (typeof v === 'string' ? v.trim() : '');

exports.register = async (req, res, next) => {
  try {
    const name = str(req.body.name);
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const confirmPassword = typeof req.body.confirmPassword === 'string' ? req.body.confirmPassword : '';

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (password.length > 72) return res.status(400).json({ message: 'Password must be at most 72 characters.' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' });

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    res.status(201).json({ message: 'Registration successful.', user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email }).select('+password');
    // Same message for unknown email and wrong password, so attackers can't tell which accounts exist.
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: SEVEN_DAYS });
    res.json({ message: 'Login successful.', user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ message: 'Logged out.' });
};

exports.me = (req, res) => {
  res.json({ user: publicUser(req.user) });
};
