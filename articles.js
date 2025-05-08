const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');

// 記事を生成
router.post('/generate', articleController.generateArticle);

// 記事を取得
router.get('/:id', articleController.getArticle);

// すべての記事を取得
router.get('/', articleController.getAllArticles);

// 記事を更新
router.put('/:id', articleController.updateArticle);

// 記事を削除
router.delete('/:id', articleController.deleteArticle);

// デバッグ用: インメモリストレージを表示
router.get('/debug/memory-store', (req, res) => {
  const inMemoryArticles = global.inMemoryArticles || [];
  res.status(200).json({
    count: inMemoryArticles.length,
    articles: inMemoryArticles.map(a => ({
      id: a._id,
      title: a.title,
      createdAt: a.createdAt
    }))
  });
});

module.exports = router;
