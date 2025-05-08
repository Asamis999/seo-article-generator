const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 環境変数の読み込み
dotenv.config();

// Expressアプリの初期化
const app = express();

// より具体的なCORS設定
const corsOptions = {
  origin: function (origin, callback) {
    // ローカル開発環境からのリクエストを許可
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('netlify.app')) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true, // クッキーを含むリクエストを許可
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// CORS設定を適用
app.use(cors(corsOptions));

// 基本的なミドルウェアの設定
app.use(express.json());

// ルートの設定
app.use('/api/articles', require('./routes/articles'));
app.use('/api/seo', require('./routes/seo'));

// 基本のルート
app.get('/', (req, res) => {
  res.send('SEO記事自動生成システムAPIが正常に動作しています');
});

// MongoDBへの接続
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDBに接続しました'))
    .catch(err => console.error('MongoDBへの接続に失敗しました:', err));
} else {
  console.log('MongoDBの接続URIが設定されていないため、DBなしでサーバーを起動します');
}

// サーバーの起動
const PORT = process.env.PORT || 5001; // ポートを5001に変更
app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました`);
});

module.exports = app;
