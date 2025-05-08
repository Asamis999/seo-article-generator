const Article = require('../models/Article');
const articleService = require('../services/articleService');

// MongoDB接続状態の確認
const isMongoConnected = () => {
  try {
    return Article.db.readyState === 1; // 1 = connected
  } catch (err) {
    return false;
  }
};

// インメモリストレージ参照用
exports.inMemoryArticles = [];
if (global.inMemoryArticles) {
  exports.inMemoryArticles = global.inMemoryArticles;
} else {
  global.inMemoryArticles = exports.inMemoryArticles;
}

/**
 * SEOチェックを行うコントローラー
 */
exports.checkSEO = async (req, res) => {
  try {
    const { articleId } = req.params;
    
    let article;
    
    console.log(`checkSEO: 記事を取得中... ID=${articleId}`);
    
    // MongoDB接続状態に応じて取得方法を切り替え
    if (isMongoConnected()) {
      // 記事の存在確認
      article = await Article.findById(articleId);
      console.log(`MongoDBから記事を探しています: ${articleId}`);
    } else {
      // IDタイプを数値に変換して比較
      const numericId = parseInt(articleId, 10);
      console.log(`インメモリストレージから記事を探しています: ID=${articleId}, 数値ID=${numericId}`);
      console.log(`利用可能な記事: ${JSON.stringify(global.inMemoryArticles.map(a => ({ id: a._id, type: typeof a._id })))}`);      
      
      // 複数の比較方法を試す
      article = global.inMemoryArticles.find(a => {
        // 型を含めた詳細比較情報をログ出力
        console.log(`比較: ${a._id} (${typeof a._id}) vs ${articleId} (${typeof articleId})`);
        
        return (
          a._id === articleId || // 型の原則比較
          a._id == articleId || // 型変換あり比較
          String(a._id) === String(articleId) || // 文字列変換後比較
          (Number.isInteger(a._id) && a._id === numericId) // 数値なら数値変換後比較
        );
      });
    }
    
    if (!article) {
      return res.status(404).json({ 
        status: 'error', 
        message: '指定されたIDの記事が見つかりません' 
      });
    }
    
    // SEOチェックを実行
    const seoResult = await articleService.checkSEO(
      article.generatedArticle.content, 
      article.targetKeywords
    );
    
    // MongoDB接続状態に応じて保存方法を切り替え
    if (isMongoConnected()) {
      // 記事にSEOスコアと改善提案を保存
      article.seoScore = seoResult.seoScore;
      article.seoRecommendations = seoResult.recommendations;
      article.updatedAt = Date.now();
      
      await article.save();
    } else {
      // インメモリストレージの記事を更新
      const articleIndex = global.inMemoryArticles.findIndex(a => a._id.toString() === articleId.toString());
      
      if (articleIndex !== -1) {
        global.inMemoryArticles[articleIndex].seoScore = seoResult.seoScore;
        global.inMemoryArticles[articleIndex].seoRecommendations = seoResult.recommendations;
        global.inMemoryArticles[articleIndex].updatedAt = new Date();
        
        console.log(`MongoDB接続がないため、インメモリストレージでSEOチェック結果を保存しました。ID: ${articleId}`);
      }
    }
    
    // レスポンスを返す
    res.status(200).json({
      status: 'success',
      data: {
        seoScore: seoResult.seoScore,
        recommendations: seoResult.recommendations
      }
    });
  } catch (error) {
    console.error('SEOチェック中にエラーが発生しました:', error);
    res.status(500).json({
      status: 'error',
      message: 'SEOチェック中にエラーが発生しました',
      error: error.message
    });
  }
};

/**
 * メタ情報を生成するコントローラー
 */
exports.generateMeta = async (req, res) => {
  try {
    const { articleId } = req.params;
    
    let article;
    
    console.log(`generateMeta: 記事を取得中... ID=${articleId}`);
    
    // MongoDB接続状態に応じて取得方法を切り替え
    if (isMongoConnected()) {
      // 記事の存在確認
      article = await Article.findById(articleId);
      console.log(`MongoDBから記事を探しています: ${articleId}`);
    } else {
      // IDタイプを数値に変換して比較
      const numericId = parseInt(articleId, 10);
      console.log(`インメモリストレージから記事を探しています: ID=${articleId}, 数値ID=${numericId}`);
      console.log(`利用可能な記事: ${JSON.stringify(global.inMemoryArticles.map(a => ({ id: a._id, type: typeof a._id })))}`);      
      
      // 複数の比較方法を試す
      article = global.inMemoryArticles.find(a => {
        // 型を含めた詳細比較情報をログ出力
        console.log(`比較: ${a._id} (${typeof a._id}) vs ${articleId} (${typeof articleId})`);
        
        return (
          a._id === articleId || // 型の原則比較
          a._id == articleId || // 型変換あり比較
          String(a._id) === String(articleId) || // 文字列変換後比較
          (Number.isInteger(a._id) && a._id === numericId) // 数値なら数値変換後比較
        );
      });
    }
    
    if (!article) {
      return res.status(404).json({ 
        status: 'error', 
        message: '指定されたIDの記事が見つかりません' 
      });
    }
    
    // OpenAI APIを使用してメタ情報を生成するプロンプト
    const prompt = `
    以下の記事のタイトルと内容に基づいて、SEO最適化されたメタタイトルとメタディスクリプションを生成してください。
    
    記事タイトル: ${article.generatedArticle.title}
    ターゲットキーワード: ${article.targetKeywords.join(', ')}
    
    記事内容の一部:
    ${article.generatedArticle.content.substring(0, 1000)}...
    
    以下の形式で返してください：
    メタタイトル：（60文字以内）
    メタディスクリプション：（160文字以内）
    `;
    
    // OpenAI APIを呼び出す（articleServiceのメソッドを拡張するか、ここで直接実装）
    const { OpenAI } = require('openai');
    const dotenv = require('dotenv');
    dotenv.config();
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "あなたはSEOに最適化されたメタタグを生成する専門家です。" },
        { role: "user", content: prompt }
      ],
      model: process.env.OPENAI_MODEL || "gpt-4o",
    });
    
    const metaContent = completion.choices[0].message.content;
    
    // メタタイトルとメタディスクリプションを抽出
    const metaTitleMatch = metaContent.match(/メタタイトル[：:]\s*(.+)/);
    const metaDescMatch = metaContent.match(/メタディスクリプション[：:]\s*(.+)/);
    
    const metaTitle = metaTitleMatch ? metaTitleMatch[1].trim() : article.generatedArticle.title;
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : article.generatedArticle.content.substring(0, 160);
    
    // 記事のメタデータを更新
    article.generatedArticle.metadata = {
      ...article.generatedArticle.metadata,
      metaTitle,
      metaDescription
    };
    
    // MongoDB接続状態に応じて保存方法を切り替え
    if (isMongoConnected()) {
      article.updatedAt = Date.now();
      await article.save();
      console.log(`MongoDBにメタ情報を保存しました。ID: ${articleId}`);
    } else {
      // インメモリストレージの記事を更新
      const articleIndex = global.inMemoryArticles.findIndex(a => a._id == articleId);
      
      if (articleIndex !== -1) {
        // メタデータがない場合は初期化
        if (!global.inMemoryArticles[articleIndex].generatedArticle.metadata) {
          global.inMemoryArticles[articleIndex].generatedArticle.metadata = {};
        }
        
        global.inMemoryArticles[articleIndex].generatedArticle.metadata.metaTitle = metaTitle;
        global.inMemoryArticles[articleIndex].generatedArticle.metadata.metaDescription = metaDescription;
        global.inMemoryArticles[articleIndex].updatedAt = new Date();
        
        console.log(`インメモリストレージにメタ情報を保存しました。ID: ${articleId}`);
      }
    }
    
    // レスポンスを返す
    res.status(200).json({
      status: 'success',
      data: {
        metaTitle,
        metaDescription
      }
    });
  } catch (error) {
    console.error('メタ情報生成中にエラーが発生しました:', error);
    res.status(500).json({
      status: 'error',
      message: 'メタ情報生成中にエラーが発生しました',
      error: error.message
    });
  }
};
