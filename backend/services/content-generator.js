/**
 * Content Generator Service
 * AI-powered content generation using z.ai (Runware GLM-4)
 */

const runwareService = require('./runware-service');

class ContentGenerator {
  constructor() {
    // Fallback templates for when API is not configured
    this.captionTemplates = {
      image: [
        "The secret to {topic}? It's simpler than you think. 🎯 Here's what works:",
        "Most people get {topic} wrong. Here's the truth:",
        "Stop overcomplicating {topic}. Focus on this instead:",
        "{topic} mastered in 3 simple steps:",
        "The {topic} strategy that actually delivers results:"
      ],
      reel: [
        "Watch till the end for the {topic} hack that changed everything 🔥",
        "This {topic} mistake is costing you results:",
        "POV: You finally understood {topic}",
        "The {topic} truth nobody tells you:",
        "3 {topic} tips I wish I knew earlier:"
      ],
      text: [
        "Let's talk about {topic}.\n\nHere's what most people miss:\n\n• Point 1\n• Point 2\n• Point 3\n\nWhat's your experience?",
        "Hot take on {topic}:\n\nThe conventional advice is wrong. Here's why:",
        "{topic} breakdown:\n\n1. The problem\n2. The solution\n3. The result\n\nSave this for later.",
        "Unpopular opinion: {topic} is easier when you:",
        "The complete guide to {topic} 🧵"
      ]
    };

    this.commentTemplates = [
      "👇 What's your take on this?",
      "Drop a comment if this resonates!",
      "Save this for later! 💾",
      "Follow for more {topic} tips",
      "Tag someone who needs to see this!",
      "What would you add to this list?",
      "Double tap if you agree ❤️"
    ];

    this.imagePromptTemplates = {
      professional: [
        "Professional photo showing {topic} concept, clean white background, high quality, modern business aesthetic",
        "Infographic style image about {topic}, minimalist design, blue and white color scheme",
        "Modern business illustration depicting {topic}, clean lines, professional lighting"
      ],
      casual: [
        "Relatable photo about {topic}, warm lighting, friendly atmosphere, lifestyle aesthetic",
        "Candid style image showing {topic}, natural colors, authentic feel",
        "Fun and engaging visual about {topic}, bright colors, modern social media style"
      ],
      bold: [
        "Bold eye-catching image about {topic}, high contrast, dramatic lighting, attention-grabbing",
        "Vibrant photo featuring {topic}, saturated colors, dynamic composition, standout visual",
        "Powerful visual statement about {topic}, strong typography, impactful design"
      ]
    };

    this.recentCaptions = new Map();
  }

  /**
   * Generate caption from context using z.ai API
   */
  async generateCaption(context, options = {}) {
    const {
      content_type = 'image',
      tone = 'professional',
      target_audience = 'general'
    } = options;

    // Try z.ai API first
    try {
      const prompt = this._buildCaptionPrompt(context, content_type);
      const result = await runwareService.generateText(prompt, null, { maxTokens: 500 });
      
      if (result && result.content) {
        // Track for originality checking
        this.recentCaptions.set(result.content, Date.now());
        return result.content;
      }
    } catch (error) {
      console.error('z.ai API error, falling back to templates:', error.message);
    }

    // Fallback to templates
    return await this._generateTemplateCaption(context, content_type);
  }

  /**
   * Build prompt for z.ai API
   */
  _buildCaptionPrompt(context, contentType) {
    let prompt = `Generate a ${contentType} post caption for Facebook.`;
    
    if (context.title) {
      prompt += `\nTopic: ${context.title}`;
    }
    
    if (context.content_text) {
      prompt += `\nSource material: ${context.content_text.substring(0, 500)}`;
    }
    
    if (context.insight_text) {
      prompt += `\nKey insight: ${context.insight_text}`;
    }
    
    prompt += `\n\nRequirements:
- Engaging and conversational tone
- 1-3 emojis maximum
- 2-4 sentences
- Include a call-to-action or question
- Optimize for engagement (likes, comments, shares)`;

    return prompt;
  }

  /**
   * Fallback template-based generation
   */
  async _generateTemplateCaption(context, contentType) {
    const topic = this._extractTopic(context);
    const templates = this.captionTemplates[contentType] || this.captionTemplates.image;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    let caption = template.replace(/{topic}/g, topic || 'this');

    if (context.content_text) {
      const keyPoint = this._extractKeyPoint(context.content_text);
      caption += `\n\n${keyPoint}`;
    }

    if (context.insight_text) {
      caption += `\n\n💡 ${context.insight_text}`;
    }

    return caption;
  }

  /**
   * Generate first comment using z.ai API
   */
  async generateFirstComment(caption, options = {}) {
    const { include_cta = true } = options;

    if (!include_cta) {
      return null;
    }

    // Try z.ai API
    try {
      const prompt = `Generate a short, engaging first comment for this Facebook post:\n\n${caption}\n\nRequirements:
- 1-2 sentences
- Include a call-to-action or question
- Encourage engagement
- Under 100 characters`;

      const result = await runwareService.generateText(prompt, null, { maxTokens: 150 });
      
      if (result && result.content) {
        return result.content;
      }
    } catch (error) {
      console.error('z.ai API error for comment, using template:', error.message);
    }

    // Fallback to template
    const template = this.commentTemplates[Math.floor(Math.random() * this.commentTemplates.length)];
    const topic = this._extractTopicFromCaption(caption);
    return template.replace(/{topic}/g, topic || 'this');
  }

  /**
   * Generate image prompt using z.ai API
   */
  async generateImagePrompt(caption, options = {}) {
    const {
      style = 'professional',
      mood = 'neutral',
      content_type = 'image'
    } = options;

    // Try z.ai API
    try {
      const prompt = `Generate a detailed image generation prompt for DALL-E 3 based on this Facebook post caption:\n\n${caption}\n\nRequirements:
- Describe the visual style: ${style}
- Mood: ${mood}
- Content type: ${content_type}
- Be specific about composition, lighting, colors
- Keep prompt under 200 words`;

      const result = await runwareService.generateText(prompt, null, { maxTokens: 300 });
      
      if (result && result.content) {
        return result.content;
      }
    } catch (error) {
      console.error('z.ai API error for image prompt, using template:', error.message);
    }

    // Fallback to template
    const templates = this.imagePromptTemplates[style] || this.imagePromptTemplates.professional;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const topic = this._extractTopicFromCaption(caption);
    return template.replace(/{topic}/g, topic || 'the concept');
  }

  /**
   * Calculate originality score
   */
  calculateOriginalityScore(caption) {
    if (!caption) {
      return 0;
    }

    const words = caption.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);

    const uniqueWordRatio = uniqueWords.size / words.length;
    const lengthScore = Math.min(words.length / 50, 1);

    let similarityScore = 0;
    for (const [recentCaption] of this.recentCaptions) {
      const recentWords = recentCaption.toLowerCase().split(/\s+/);
      const intersection = words.filter(w => recentWords.includes(w));
      const jaccard = intersection.length / (uniqueWords.size + recentWords.length - intersection.length);
      similarityScore = Math.max(similarityScore, jaccard);
    }

    this.recentCaptions.set(caption, Date.now());

    if (this.recentCaptions.size > 100) {
      const oldest = Array.from(this.recentCaptions.entries()).sort((a, b) => a[1] - b[1])[0];
      this.recentCaptions.delete(oldest[0]);
    }

    const originality = (uniqueWordRatio * 0.4) + (lengthScore * 0.3) + ((1 - similarityScore) * 0.3);
    return Math.max(0, Math.min(1, originality));
  }

  /**
   * Extract topic from context
   */
  _extractTopic(context) {
    if (!context) {
      return 'success';
    }

    if (context.title) {
      const words = context.title.split(' ');
      return words.slice(0, 3).join(' ');
    }

    if (context.insight_text) {
      const words = context.insight_text.split(' ');
      return words.slice(0, 3).join(' ');
    }

    if (context.content_text) {
      const sentences = context.content_text.split('.');
      return sentences[0].split(' ').slice(0, 3).join(' ');
    }

    return context.category || 'this topic';
  }

  /**
   * Extract key point from content
   */
  _extractKeyPoint(content) {
    if (!content) {
      return '';
    }

    const firstSentence = content.split('.')[0];
    return firstSentence.length > 150 ? firstSentence.substring(0, 147) + '...' : firstSentence;
  }

  /**
   * Extract topic from caption
   */
  _extractTopicFromCaption(caption) {
    if (!caption) {
      return null;
    }

    const words = caption.match(/\b[a-zA-Z]{4,}\b/g) || [];
    const stopWords = ['this', 'that', 'with', 'from', 'have', 'been', 'they', 'their', 'what', 'when', 'your', 'will'];

    const significantWords = words.filter(w => !stopWords.includes(w.toLowerCase()));

    if (significantWords.length > 0) {
      return significantWords.slice(0, 2).join(' ');
    }

    return null;
  }
}

module.exports = new ContentGenerator();
