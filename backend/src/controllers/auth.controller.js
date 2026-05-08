const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const jwtConfig = require('../config/jwt');
const activityService = require('../services/activity.service');

const register = async (req, res) => {
  const client = await pool.connect();
  try {
    const { full_name, email, password, role, student_id, department_id, campus_id, phone } = req.body;
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    await client.query('BEGIN');
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await client.query(
      'INSERT INTO users (full_name, email, password, role, student_id, department_id, campus_id, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, full_name, email, role',
      [full_name, email, hashedPassword, role || 'student', student_id, department_id, campus_id, phone]
    );
    await client.query('COMMIT');
    await activityService.log(result.rows[0].id, 'User registered', 'user', result.rows[0].id);
    const token = jwt.sign({ userId: result.rows[0].id, role: result.rows[0].role }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
    res.status(201).json({ message: 'Registration successful', user: result.rows[0], token });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed.' });
  } finally {
    client.release();
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      'SELECT u.*, d.name as department_name, c.campus_name FROM users u LEFT JOIN departments d ON u.department_id = d.id LEFT JOIN campuses c ON u.campus_id = c.id WHERE u.email = $1 AND u.is_active = true',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
    await activityService.log(user.id, 'User logged in', 'user', user.id);
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
    const result = await pool.query('SELECT id, full_name FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }
    const resetToken = uuidv4();
    const expires = new Date(Date.now() + 3600000);
    await pool.query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3', [resetToken, expires, email]);
    res.json({ message: 'If the email exists, a reset link has been sent.', resetToken });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred.' });
  }
};

const resetPassword = async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, newPassword } = req.body;
    await client.query('BEGIN');
    const result = await client.query('SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()', [token]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await client.query('UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2', [hashedPassword, result.rows[0].id]);
    await activityService.log(result.rows[0].id, 'Password reset', 'user', result.rows[0].id);
    await client.query('COMMIT');
    res.json({ message: 'Password reset successful.' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Password reset failed.' });
  } finally {
    client.release();
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.full_name, u.email, u.role, u.student_id, u.phone, u.avatar, u.created_at, d.name as department_name, c.campus_name FROM users u LEFT JOIN departments d ON u.department_id = d.id LEFT JOIN campuses c ON u.campus_id = c.id WHERE u.id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, department_id, campus_id } = req.body;
    const result = await pool.query(
      'UPDATE users SET full_name=$1, phone=$2, department_id=$3, campus_id=$4, updated_at=NOW() WHERE id=$5 RETURNING id, full_name, email, role, phone, avatar',
      [full_name, phone, department_id, campus_id, req.user.id]
    );
    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};

module.exports = { register, login, forgotPassword, resetPassword, getProfile, updateProfile };
