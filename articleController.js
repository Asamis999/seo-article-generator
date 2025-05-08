const Article = require('../models/Article');
const articleService = require('../services/articleService');

// MongoDB接続が利用できない場合用のインメモリストレージ
// グローバルでアクセスできるようにする
if (!global.inMemoryArticles) {
  global.inMemoryArticles = [];
}
const inMemoryArticles = global.inMemoryArticles;

// IDカウンターもグローバルにする
if (!global.articleIdCounter) {
  global.articleIdCounter = 1;
}
let articleIdCounter = global.articleIdCounter;

// MongoDB接続状態の確認
const isMongoConnected = () => {
  try {
    return Article.db.readyState === 1; // 1 = connected
  } catch (err) {
    return false;
  }
};

/**
 * 記事を生成するコントローラー
 */
exports.generateArticle = async (req, res) => {
  try {
    const articleData = req.body;
    
    // バリデーション
    if (!articleData.title || !articleData.targetKeywords || !articleData.targetAudience) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'タイトル、ターゲットキーワード、ターゲット読者は必須項目です' 
      });
    }
    
    // 記事を生成
    const generatedArticle = await articleService.generateArticle(articleData);
    
    let articleId;
    
    // MongoDB接続状態に応じて保存方法を切り替え
    if (isMongoConnected()) {
      // データベースに保存
      const article = new Article({
        title: articleData.title,
        targetKeywords: articleData.targetKeywords,
        targetAudience: articleData.targetAudience,
        userCases: articleData.userCases || [],
        additionalData: articleData.additionalData || {},
        generatedArticle: generatedArticle
      });
      
      await article.save();
      articleId = article._id;
    } else {
      // インメモリストレージに保存
      // 記事のIDを明示的に数値型として保存
      const newId = articleIdCounter;
      // グローバルカウンターを更新
      articleIdCounter++;
      global.articleIdCounter = articleIdCounter;
      
      const article = {
        _id: newId,  // 数値型として保存します
        title: articleData.title,
        targetKeywords: articleData.targetKeywords,
        targetAudience: articleData.targetAudience,
        userCases: articleData.userCases || [],
        additionalData: articleData.additionalData || {},
        generatedArticle: generatedArticle,
        seoScore: 0,
        seoRecommendations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // グローバル配列に追加
      global.inMemoryArticles.push(article);
      // inMemoryArticlesは定数宣言されているので再代入は不要
      
      articleId = article._id;
      console.log(`MongoDB接続がないため、インメモリストレージに記事を保存しました。ID: ${articleId}`);
      console.log(`現在のインメモリストレージ: ${JSON.stringify(global.inMemoryArticles.map(a => ({ id: a._id, title: a.title })))}`);
    }
    
    // レスポンスを返す
    res.status(201).json({
      status: 'success',
      data: {
        articleId: articleId,
        generatedArticle
      }
    });
  } catch (error) {
    console.error('記事生成中にエラーが発生しました:', error);
    res.status(500).json({
      status: 'error',
      message: '記事生成中にエラーが発生しました',
      error: error.message
    });
  }
};

/**
 * 記事を更新するコントローラー
 */
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    let article;
    let updatedArticle;
    
    // MongoDB接続状態に応じて取得方法を切り替え
    if (isMongoConnected()) {
      // 記事の存在確認
      article = await Article.findById(id);
      if (!article) {
        return res.status(404).json({ 
          status: 'error', 
          message: '指定されたIDの記事が見つかりません' 
        });
      }
      
      // データベースの記事を更新
      updatedArticle = await Article.findByIdAndUpdate(
        id, 
        { 
          ...updates,
          updatedAt: Date.now() 
        }, 
        { new: true }
      );
    } else {
      // インメモリストレージから記事を探す
      const articleIndex = inMemoryArticles.findIndex(a => a._id.toString() === id.toString());
      
      if (articleIndex === -1) {
        return res.status(404).json({ 
          status: 'error', 
          message: '指定されたIDの記事が見つかりません' 
        });
      }
      
      // インメモリストレージの記事を更新
      updatedArticle = {
        ...inMemoryArticles[articleIndex],
        ...updates,
        updatedAt: new Date()
      };
      
      inMemoryArticles[articleIndex] = updatedArticle;
      console.log(`MongoDB接続がないため、インメモリストレージで記事を更新しました。ID: ${id}`);
    }
    
    // レスポンスを返す
    res.status(200).json({
      status: 'success',
      data: {
        article: updatedArticle
      }
    });
  } catch (error) {
    console.error('記事更新中にエラーが発生しました:', error);
    res.status(500).json({
      status: 'error',
      message: '記事更新中にエラーが発生しました',
      error: error.message
    });
  }
};

/**
 * 記事を取得するコントローラー
 */
exports.getArticle = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`getArticle: 記事を取得中... ID=${id}`);
    
    let article;
    
    // MongoDB接続状態に応じて取得方法を切り替え
    if (isMongoConnected()) {
      article = await Article.findById(id);
      console.log(`MongoDBから記事を探しています: ${id}`);
    } else {
      // IDタイプを数値に変換して比較
      const numericId = parseInt(id, 10);
      console.log(`インメモリストレージから記事を探しています: ID=${id}, 数値ID=${numericId}`);
      console.log(`利用可能な記事: ${JSON.stringify(inMemoryArticles.map(a => ({ id: a._id, type: typeof a._id })))}`);      
      
      // 複数の比較方法を試す
      article = inMemoryArticles.find(a => {
        // 型を含めた詳細比較情報をログ出力
        console.log(`比較: ${a._id} (${typeof a._id}) vs ${id} (${typeof id})`);
        
        return (
          a._id === id || // 型の原則比較
          a._id == id || // 型変換あり比較
          String(a._id) === String(id) || // 文字列変換後比較
          (Number.isInteger(a._id) && a._id === numericId) // 数値なら数値変換後比較
        );
      });
    }
    
    if (!article) {
      console.log(`記事が見つかりません: ID=${id}`);
      return res.status(404).json({ 
        status: 'error', 
        message: '指定されたIDの記事が見つかりません' 
      });
    }
    
    console.log(`記事が見つかりました: ID=${id}, タイトル="${article.title}"`);
    
    res.status(200).json({
      status: 'success',
      data: {
        article
      }
    });
  } catch (error) {
    console.error('記事取得中にエラーが発生しました:', error);
    res.status(500).json({
      status: 'error',
      message: '記事取得中にエラーが発生しました',
      error: error.message
    });
  }
};

/**
 * すべての記事を取得するコントローラー
 */
exports.getAllArticles = async (req, res) => {
  try {
    let articles;
    
    // MongoDB接続状態に応じて取得方法を切り替え
    if (isMongoConnected()) {
      // データベースからすべての記事を取得
      articles = await Article.find().sort({ createdAt: -1 });
    } else {
      // インメモリストレージからすべての記事を取得
      articles = [...inMemoryArticles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    // レスポンスを返す
    res.status(200).json({
      status: 'success',
      results: articles.length,
      data: {
        articles
      }
    });
  } catch (error) {
    console.error('記事一覧取得中にエラーが発生しました:', error);
    res.status(500).json({
      status: 'error',
      message: '記事一覧取得中にエラーが発生しました',
      error: error.message
    });
  }
};

/**
 * 記事を削除するコントローラー
 */
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    
    // MongoDB接続状態に応じて取得方法を切り替え
    if (isMongoConnected()) {
      // 記事の存在確認
      const article = await Article.findById(id);
      if (!article) {
        return res.status(404).json({ 
          status: 'error', 
          message: '指定されたIDの記事が見つかりません' 
        });
      }
      
      // 記事を削除
      await Article.findByIdAndDelete(id);
    } else {
      // インメモリストレージから記事を探す
      const articleIndex = inMemoryArticles.findIndex(a => a._id.toString() === id.toString());
      
      if (articleIndex === -1) {
        return res.status(404).json({ 
          status: 'error', 
          message: '指定されたIDの記事が見つかりません' 
        });
      }
      
      // インメモリストレージから削除
      inMemoryArticles.splice(articleIndex, 1);
      console.log(`MongoDB接続がないため、インメモリストレージから記事を削除しました。ID: ${id}`);
    }
    
    // レスポンスを返す
    res.status(200).json({
      status: 'success',
      message: '記事が正常に削除されました'
    });
  } catch (error) {
    console.error('記事削除中にエラーが発生しました:', error);
    res.status(500).json({
      status: 'error',
      message: '記事削除中にエラーが発生しました',
      error: error.message
    });
  }
};
