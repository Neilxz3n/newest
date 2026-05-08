const pool = require('../config/database');
const notificationService = require('./notification.service');

class MatchingService {
  async findMatches(item, type) {
    const matches = [];

    if (type === 'lost') {
      const result = await pool.query(
        "SELECT * FROM found_items WHERE category_id = $1 AND status = 'pending'",
        [item.category_id]
      );
      for (const foundItem of result.rows) {
        const score = this.calculateConfidence(item, foundItem);
        if (score >= 50) {
          matches.push({ foundItem, score });
        }
      }
    } else {
      const result = await pool.query(
        "SELECT * FROM lost_items WHERE category_id = $1 AND status = 'pending'",
        [item.category_id]
      );
      for (const lostItem of result.rows) {
        const score = this.calculateConfidence(lostItem, item);
        if (score >= 50) {
          matches.push({ lostItem, score });
        }
      }
    }

    return matches;
  }

  calculateConfidence(lostItem, foundItem) {
    let score = 0;

    if (lostItem.category_id === foundItem.category_id) {
      score += 30;
    }

    const lostWords = (lostItem.item_name + ' ' + lostItem.description).toLowerCase().split(/\s+/);
    const foundWords = (foundItem.item_name + ' ' + foundItem.description).toLowerCase().split(/\s+/);
    const commonWords = lostWords.filter(function(w) { return foundWords.includes(w) && w.length > 3; });
    const keywordScore = Math.min(30, (commonWords.length / Math.max(lostWords.length, 1)) * 60);
    score += keywordScore;

    const lostLoc = (lostItem.location || '').toLowerCase();
    const foundLoc = (foundItem.location || '').toLowerCase();
    const locWords = lostLoc.split(/\s+/).filter(function(w) { return foundLoc.includes(w) && w.length > 2; });
    if (locWords.length > 0) {
      score += Math.min(20, locWords.length * 7);
    }

    const dateLost = new Date(lostItem.date_lost);
    const dateFound = new Date(foundItem.date_found);
    const daysDiff = Math.abs((dateFound - dateLost) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 1) score += 20;
    else if (daysDiff <= 3) score += 15;
    else if (daysDiff <= 7) score += 10;
    else if (daysDiff <= 14) score += 5;

    return Math.min(100, Math.round(score * 100) / 100);
  }

  async saveAndNotifyMatches(item, matches, type) {
    for (const match of matches) {
      const lostItemId = type === 'lost' ? item.id : match.lostItem.id;
      const foundItemId = type === 'lost' ? match.foundItem.id : item.id;

      const existing = await pool.query(
        'SELECT id FROM item_matches WHERE lost_item_id = $1 AND found_item_id = $2',
        [lostItemId, foundItemId]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO item_matches (lost_item_id, found_item_id, confidence_score, match_reason) VALUES ($1, $2, $3, $4)',
          [lostItemId, foundItemId, match.score, 'Auto-matched by system']
        );

        const notifyUserId = type === 'lost' ? item.user_id : match.lostItem.user_id;
        await notificationService.createNotification(
          notifyUserId,
          'Possible Match Found!',
          'A potential match has been found with ' + match.score + '% confidence.',
          'match_found',
          lostItemId,
          'lost_item'
        );
      }
    }
  }
}

module.exports = new MatchingService();
