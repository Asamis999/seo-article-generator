const { OpenAI } = require('openai');
const dotenv = require('dotenv');

dotenv.config();

// 説明用定数
const SERVICE_NAME = 'ArticleService';

/**
 * 記事タイプと文字数に基づいて生成指示を返す
 */
const getArticleTypeInstructions = (articleType, wordCount) => {
  // 基本的な指示内容を初期化
  let structure = '';
  let headings = 'H2, H3';
  let additionalGuidance = '';
  
  // 記事タイプに基づいて指示を設定
  switch (articleType) {
    case 'pillar': // ピラー記事（親記事）
      structure = `以下の構造で包括的なピラー記事を生成してください：
      1. 導入：読者の関心を引く魅力的な導入とトピックの重要性の説明（ターゲットキーワードを含める）
      2. 目次：記事の全体構造を簡潔に紹介
      3. トピックの完全な背景と歴史
      4. 主要なサブトピックを8-10個詳細に解説
      5. 実用的なアドバイスとベストプラクティス
      6. ケーススタディや成功事例
      7. 読者が行動を起こすための具体的な手順
      8. 詳細なFAQセクション
      9. 結論：主要ポイントの要約と次のステップへの促し`;
      headings = 'H1, H2, H3, H4';
      additionalGuidance = `このピラー記事は包括的で深い内容にしてください。小規模なクラスター記事への内部リンクの配置場所を提案し、約${wordCount}字程度で作成してください。また、メタディスクリプションとメタタイトルの候補も提案してください。`;
      break;
    
    case 'cluster': // クラスター記事（子記事）
      structure = `以下の構造で特定トピックに特化したクラスター記事を生成してください：
      1. 導入：トピックの特定の側面に焦点を当てる（ターゲットキーワードを含める）
      2. なぜこのトピックが重要なのかという概要
      3. ターゲットキーワードに関する具体的な説明・手順
      4. 実用的な例と具体的なアドバイス
      5. よくある質問とトラブルシューティング
      6. 結論：メインポイントの要約と読者へのアクションの呼びかけ`;
      headings = 'H2, H3';
      additionalGuidance = `このクラスター記事はピラー記事にリンクされる子記事として機能します。ピラー記事への内部リンクを適切な箇所に配置し、約${wordCount}字程度で作成してください。`;
      break;
    
    case 'column': // コラム記事
      structure = `以下の構造で読者に役立つコラム記事を生成してください：
      1. 魅力的な導入：読者の関心を引く論点や逸話（ターゲットキーワードを含める）
      2. 議論の概要：コラムで扱う主要トピックの紹介
      3. 主要ポイントの展開：状況記述、分析、活用できるインサイト
      4. 実用的なアドバイスと読者がすぐに実行できるヒント
      5. 結論：読者が次にとるべきアクションと考えるべき質問`;
      headings = 'H2, H3';
      additionalGuidance = `このコラム記事は読者との対話的なトーンで、活用できるインサイトと参考情報を提供します。実例や具体的な事例を組み込み、約${wordCount}字程度で作成してください。`;
      break;
    
    case 'lp': // ランディングページ用記事
      structure = `以下の構造でコンバージョンを促すランディングページ用記事を生成してください：
      1. インパクトのある見出しとリード文（ターゲットキーワードを含める）
      2. 読者の課題とペインポイントの明確な記述
      3. ソリューションの紹介：主要なベネフィットと特徴
      4. 信頼性の証明：具体的な成果やデータ
      5. お客様の声や証言
      6. FAQセクション
      7. 明確な行動喚起（CTA）と次のステップ`;
      headings = 'H2, H3, H4';
      additionalGuidance = `このランディングページ用記事は読者の行動を促す説得力の高い内容にしてください。短めの段落、箱書き、箇条リスト、引用を適切に使い、約${wordCount}字程度で作成してください。複数のCTAを記事内に配置してください。`;
      break;
    
    case 'qa': // Q&A形式記事
      structure = `以下の構造で質問と回答形式の記事を生成してください：
      1. 導入：トピックの概要と認識（ターゲットキーワードを含める）
      2. 主要な質問と回答（10-15個程度）：
         - 各質問は見出しとして表示
         - 各回答は具体的で実用的な内容
      3. 補足情報や関連リソース
      4. 結論：主要ポイントのまとめと次のステップ`;
      headings = 'H2(質問), H3(サブセクション)';
      additionalGuidance = `このQ&A形式記事は、検索者が具体的に知りたい情報に焦点を当て、整理された情報を提供します。FAQスキーママークアップに対応できる形式で、約${wordCount}字程度で作成してください。`;
      break;
      
    default: // 標準記事
      structure = `以下の構造で記事を生成してください：
      1. 魅力的な導入部（ターゲットキーワードを含める）
      2. 問題提起と解決策の概要
      3. ユースケースに基づいた詳細な解決策の説明
      4. 成功事例（追加情報から引用）
      5. 読者へのアクションの呼びかけ`;
      headings = 'H2, H3';
      additionalGuidance = `この標準記事は読者に役立つ情報をわかりやすく提供します。約${wordCount}字程度で作成し、内部リンクの配置場所も提案してください。`;
  }
  
  return {
    structure,
    headings,
    additionalGuidance
  };
};

// 使用するモデル名を定数として定義
const MODEL_NAME = process.env.OPENAI_MODEL || 'gpt-4o'; // 最新の高性能モデルGPT-4o

// 設定情報をログに出力
console.log(`OpenAI API設定: モデル=${MODEL_NAME}, APIキー=${process.env.OPENAI_API_KEY ? '設定済み' : '未設定'}`);

// OpenAI APIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * 記事を生成するサービス
 */
const generateArticle = async (articleData) => {
  try {
    const { 
      title, 
      targetKeywords, 
      targetAudience, 
      userCases, 
      additionalData,
      articleType = 'standard', // デフォルトは標準記事
      wordCount = 1500        // デフォルトは1500字
    } = articleData;
    
    // 記事タイプごとの指示を生成
    const typeInstructions = getArticleTypeInstructions(articleType, wordCount);
    
    // プロンプトを構築
    const prompt = `
    以下の情報を基に、SEO最適化された記事を生成してください。

    タイトル: ${title}
    ターゲットキーワード: ${targetKeywords.join(', ')}
    ターゲット読者: ${targetAudience}
    ユースケース: ${userCases.join(', ')}
    追加情報: ${JSON.stringify(additionalData)}
    記事タイプ: ${articleType}
    目標文字数: ${wordCount}字程度

    ${typeInstructions.structure}

    記事は読みやすく、SEO最適化された見出し（${typeInstructions.headings}）を使い、内部リンクの配置場所も提案してください。
    
    ${typeInstructions.additionalGuidance}
    `;

    // デバッグ情報の出力
    console.log(`記事生成開始: モデル=${MODEL_NAME}`);
    
    // OpenAI API呼び出し
    try {
      // プロンプトの生成
      const messages = [
        { role: "system", content: "あなたはSEO最適化された記事を生成する専門家です。" },
        { role: "user", content: prompt }
      ];
      
      // APIリクエスト
      const completion = await openai.chat.completions.create({
        model: MODEL_NAME, // 環境変数から読み込んだモデル名を使用
        messages: messages
      });
      
      console.log('記事生成成功!');
      
      // 生成結果を返す
      return {
        title: title,
        content: completion.choices[0].message.content
      };
    } catch (innerError) {
      console.error('内部エラー詳細:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('記事生成に失敗しました:', error.message);
    throw error;
  }
};

/**
 * SEOチェックを行うサービス
 */
const checkSEO = async (content, keywords) => {
  try {
    // プロンプトを構築
    const prompt = `
    以下の記事内容に対してSEO分析を行い、改善点を提案してください。

    記事内容:
    ${content}

    ターゲットキーワード: ${keywords.join(', ')}

    以下の観点で分析してください：
    1. キーワード密度と配置
    2. メタタイトルとメタディスクリプションの最適化提案
    3. 見出し（H1, H2, H3）の構造と最適化
    4. 内部リンクの追加提案
    5. コンテンツの読みやすさと構造
    
    分析結果は0-100のスコアと、具体的な改善提案リストで返してください。
    `;

    console.log(`SEO分析開始: モデル=gpt-3.5-turbo`);
    
    try {
      // OpenAI API呼び出し
      const completion = await openai.chat.completions.create({
        model: MODEL_NAME, // 環境変数から読み込んだモデル名を使用
        messages: [
          { role: "system", content: "あなたはSEO分析の専門家です。" },
          { role: "user", content: prompt }
        ]
      });
      
      console.log('SEO分析成功!');
      
      // 分析結果を解析
      const analysisResult = completion.choices[0].message.content;
      
      // スコアを抽出（0-100の数値を検出）
      const scoreMatch = analysisResult.match(/(\d{1,3})\/100|スコア[\uff1a:]\s*(\d{1,3})/);
      const seoScore = scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2]) : 70;
      
      // 改善提案を抽出（番号付きリストや箇条書きを検出）
      const recommendationsMatch = analysisResult.match(/(?:[\d\-\.\u30fb\*][\s\.]*)([^\n]+)/g);
      const seoRecommendations = recommendationsMatch 
        ? recommendationsMatch.map(rec => rec.replace(/^[\d\-\.\u30fb\*][\s\.]*/, '').trim())
        : ['メタタイトルにキーワードを追加してください', '内部リンクを増やしてください'];

      // 結果を返す
      return {
        seoScore,
        recommendations: seoRecommendations
      };
    } catch (innerError) {
      console.error('SEO分析APIエラー:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('SEO分析に失敗しました:', error.message);
    throw error;
  }
};

module.exports = {
  generateArticle,
  checkSEO
};
