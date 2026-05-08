const express = require('express');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const itemsController = require('../controllers/items.controller');
const db = require('../config/database');

const router = express.Router();

router.get('/lost', itemsController.getLostItems);
router.post('/lost', authenticate, upload.single('image'), itemsController.createLostItem);
router.get('/lost/:id', itemsController.getLostItemById);
router.put('/lost/:id', authenticate, upload.single('image'), itemsController.updateLostItem);

router.get('/found', itemsController.getFoundItems);
router.post('/found', authenticate, upload.single('image'), itemsController.createFoundItem);
router.get('/found/:id', itemsController.getFoundItemById);
router.put('/found/:id', authenticate, upload.single('image'), itemsController.updateFoundItem);

router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY category_name ASC').all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories.' });
  }
});

router.get('/matches', authenticate, (req, res) => {
  try {
    const matches = db.prepare(
      `SELECT im.*, li.item_name as lost_item_name, fi.item_name as found_item_name
       FROM item_matches im
       LEFT JOIN lost_items li ON im.lost_item_id = li.id
       LEFT JOIN found_items fi ON im.found_item_id = fi.id
       WHERE li.user_id = ? OR fi.user_id = ?
       ORDER BY im.confidence_score DESC`
    ).all(req.user.id, req.user.id);
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch matches.' });
  }
});

module.exports = router;
