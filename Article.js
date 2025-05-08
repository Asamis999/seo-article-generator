const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  targetKeywords: {
    type: [String],
    required: true
  },
  targetAudience: {
    type: String,
    required: true
  },
  userCases: {
    type: [String],
    default: []
  },
  additionalData: {
    type: Object,
    default: {}
  },
  generatedArticle: {
    title: {
      type: String,
      default: ''
    },
    content: {
      type: String,
      default: ''
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  seoScore: {
    type: Number,
    default: 0
  },
  seoRecommendations: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Article', ArticleSchema);
