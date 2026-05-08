const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const jwtConfig = require('../config/jwt');
const activityService = require('../services/activity.service');

const register = async (req, res) => {
  try {
    const { full_name, email, password, role, student_id, department_id, campus_id, phone } = req.body;

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const registerTxn = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO users (full_name, email, password, role, student_id, department_id, campus_id, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(full_name, email, hashedPassword, role || 'student', student_id, department_id, campus_id, phone);

      const userId = result.lastInsertRowid;
      const user = db.prepare('SELECT id, full_name, email, role FROM users WHERE id = ?').get(userId);

      activityService.log(user.id, 'User registered', 'user', user.id);

      return user;
    });

    const user = registerTxn();
    const token = jwt.sign({ userId: user.id, role: user.role }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

    res.status(201).json({ message: 'Registration successful', user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare(
      `SELECT u.*, d.name as department_name, c.campus_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN campuses c ON u.campus_id = c.id
       WHERE u.email = ? AND u.is_active = 1`
    ).get(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
    activityService.log(user.id, 'User logged in', 'user', user.id);

    const { password: _, reset_token, reset_token_expires, ...userData } = user;
    res.json({ message: 'Login successful', user: userData, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = db.prepare('SELECT id, full_name FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const resetToken = uuidv4();
    const expires = new Date(Date.now() + 3600000).toISOString();

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?').run(resetToken, expires, email);

    res.json({ message: 'If the email exists, a reset link has been sent.', resetToken });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const resetTxn = db.transaction(() => {
      const user = db.prepare(
        'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > datetime(?)'
      ).get(token, new Date().toISOString());

      if (!user) {
        return null;
      }

      db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hashedPassword, user.id);
      activityService.log(user.id, 'Password reset', 'user', user.id);

      return user;
    });

    const user = resetTxn();
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    res.json({ message: 'Password reset successful.' });
  } catch (error) {
    res.status(500).json({ message: 'Password reset failed.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = db.prepare(
      `SELECT u.id, u.full_name, u.email, u.role, u.student_id, u.phone, u.avatar, u.created_at,
              d.name as department_name, c.campus_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN campuses c ON u.campus_id = c.id
       WHERE u.id = ?`
    ).get(req.user.id);

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, department_id, campus_id } = req.body;

    db.prepare(
      'UPDATE users SET full_name=?, phone=?, department_id=?, campus_id=?, updated_at=datetime(?) WHERE id=?'
    ).run(full_name, phone, department_id, campus_id, new Date().toISOString(), req.user.id);

    const user = db.prepare('SELECT id, full_name, email, role, phone, avatar FROM users WHERE id = ?').get(req.user.id);

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};

module.exports = { register, login, forgotPassword, resetPassword, getProfile, updateProfile };
