const express = require('express');
const router = express.Router();
const seoController = require('../controllers/seoController');

// SEOチェック
router.get('/check/:articleId', seoController.checkSEO);

// メタ情報生成
router.get('/generate-meta/:articleId', seoController.generateMeta);

module.exports = router;
