/**
 * Enhanced Content Generation Service (SMV Compliant)
 * Focused on 3 primary niches: 90s nostalgia, political, emotional/sentimental
 * Uses runware.ai for AI generation
 * All posts auto-approved for MVP
 */

const runwareService = require('./runware-service');

class ContentGeneratorService {
  constructor() {
    // Primary niches based on x-scraper data
    this.primaryNiches = {
      '90s nostalgia': {
        keywords: ['90s', 'nostalgia', 'throwback', 'vintage', 'retro', 'childhood', 'memories', 'decade', 'millennial'],
        emojis: ['📼', '💿', '📟', '🎮', '📺', '🎬', '✨', '💫'],
        hashtags: ['#90sKids', '#ThrowbackThursday', '#Nostalgia', '#90sChildhood', '#Millennial', '#RetroVibes'],
        sentiment: 'sentimental'
      },
      'political': {
        keywords: ['election', 'government', 'policy', 'political', 'vote', 'congress', 'senate', 'democracy', 'civic'],
        emojis: ['🗳️', '🇺🇸', '⚖️', '📜', '🏛️', '🤝', '💬'],
        hashtags: ['#PoliticalDiscussion', '#CivicEngagement', '#Vote', '#Democracy', '#CommunityVoice'],
        sentiment: 'serious'
      },
      'emotional': {
        keywords: ['motivation', 'inspiration', 'emotional', 'feelings', 'support', 'mental health', 'hope', 'believe', 'strength'],
        emojis: ['💪', '❤️', '✨', '🌟', '💫', '🙏', '🤗', '💕'],
        hashtags: ['#Motivation', '#Inspiration', '#MentalHealthMatters', '#YouGotThis', '#NeverGiveUp'],
        sentiment: 'uplifting'
      }
    };

    // Content templates for each niche
    this.templates = {
      '90s nostalgia': [
        {
          format: 'question',
          template: "Remember when {memory}? {emotion}. Who else misses this? {nostalgia_thing} #90sKids #Throwback"
        },
        {
          format: 'statement',
          template: "POV: {scenario}. The {activity} awaits, your {item} is ready, and life is good. {vibe}"
        },
        {
          format: 'listicle',
          template: "Things that made 90s childhoods unforgettable:\n\n{item1}\n{item2}\n{item3}\n\nWhat would you add? 👇"
        }
      ],
      'political': {
        {
          format: 'discussion',
          template: "The political landscape has {observation}. What {aspect} have you noticed in your community? Let's discuss respectfully below. 🗳️"
        },
        {
          format: 'call_to_action',
          template: "Regardless of where you stand, we can all agree that {value}. Make your voice heard this election season. 🇺🇸"
        },
        {
          format: 'informative',
          template: "{topic} is impacting communities across the country. Here's what you need to know:\n\n{point1}\n{point2}\n{point3}"
        }
      ],
      'emotional': {
        {
          format: 'encouragement',
          template: "To anyone going through {struggle}: Your story isn't over. The {promise}. Keep going, keep believing. 💪✨ #Motivation"
        },
        {
          format: 'support',
          template: "Sometimes the strongest thing you can do is {action}. It's not weakness - it's courage. You deserve support. ❤️"
        },
        {
          format: 'affirmation',
          template: "Reminder: {affirmation}. You are {quality}, and you are {value}. Don't let anyone tell you otherwise. ✨"
        }
      ]
    };

    // Content variables for template filling
    this.variables = {
      '90s nostalgia': {
        memory: ['Saturday morning cartoons were life', 'Blockbuster nights were an event', 'Dial-up internet sounded like music'],
        emotion: ['Simpler times', 'Pure joy', 'Unforgettable moments'],
        nostalgia_thing: ['The VHS tape', 'The Walkman', 'The Game Boy', 'The fluorescent clothing'],
        scenario: ['You just finished watching TGIF on a Friday night in 1997', "You're unwrapping a Game Boy Color on Christmas morning", "You're recording your favorite song off the radio"],
        activity: ['Blockbuster trip', 'friend sleepover', 'mall trip'],
        item: ['Walkman', 'Game Boy', 'Tamagotchi', 'CD player'],
        vibe: ['#90sNostalgia #ChildhoodMemories #SimplerTimes'],
        item1: ['🎞️ Recording songs off the radio', '📼 Rewinding VHS tapes with a pencil', '🎮 Playing GoldenEye 64 with friends'],
        item2: ['📞 Talking on landlines for hours', '💿 Making mix CDs from Napster', '📺 Watching TGIF every Friday'],
        item3: ['🎒 Rolling backpacks to school', '🍭 Buying candy at the corner store', '⚡ Trading Pokemon cards at recess']
      },
      'political': {
        observation: ['shifted dramatically in recent years', 'evolved to meet new challenges', 'become more important than ever'],
        aspect: ['changes', 'trends', 'issues', 'conversations'],
        value: ['civic engagement matters', 'every voice counts', 'democracy requires participation', 'community involvement is essential'],
        topic: ['Education policy', 'Healthcare access', 'Economic opportunity', 'Climate action', 'Infrastructure investment'],
        point1: ['✅ Fact 1 with context', '✅ Key consideration A', '✅ Important detail X'],
        point2: ['✅ Fact 2 with context', '✅ Key consideration B', '✅ Important detail Y'],
        point3: ['✅ Fact 3 with context', '✅ Key consideration C', '✅ Important detail Z']
      },
      'emotional': {
        struggle: ['a tough time', 'uncertainty', 'setbacks', 'challenges', 'dark moments'],
        promise: ['the darkest moments often lead to the brightest dawns', 'every setback is a setup for a comeback', 'your breakthrough is coming'],
        action: ['ask for help', 'take a break', 'be kind to yourself', 'reach out', 'keep going'],
        affirmation: ['You are enough', 'You are worthy', 'You are strong', 'You are capable', 'You are loved'],
        quality: ['worthy', 'strong', 'capable', 'resilient', 'enough'],
        value: ['valued', 'needed', 'important', 'deserving of happiness']
      }
    };
  }

  /**
   * Generate caption for a specific niche
   */
  async generateCaption(niche = 'emotional', model = null) {
    const selectedNiche = this.primaryNiches[niche] || this.primaryNiches['emotional'];
    const templates = this.templates[niche] || this.templates['emotional'];
    const variables = this.variables[niche] || this.variables['emotional'];

    // Select random template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Fill template with random variables
    let caption = template.template;

    for (const [key, values] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      if (caption.includes(placeholder)) {
        const value = Array.isArray(values) ? values[Math.floor(Math.random() * values.length)] : values;
        caption = caption.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    // Add random emojis
    const emojiCount = Math.floor(Math.random() * 3) + 2;
    const emojis = selectedNiche.emojis;
    for (let i = 0; i < emojiCount; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      if (!caption.includes(emoji)) {
        caption += ` ${emoji}`;
      }
    }

    // Add hashtags
    const hashtagCount = Math.floor(Math.random() * 3) + 2;
    const hashtags = selectedNiche.hashtags;
    const shuffledHashtags = hashtags.sort(() => 0.5 - Math.random()).slice(0, hashtagCount);
    caption += '\n\n' + shuffledHashtags.join(' ');

    // For MVP: Auto-approve all content
    const result = {
      caption,
      niche,
      format: template.format,
      sentiment: selectedNiche.sentiment,
      approval_status: 'auto_approved', // MVP: Auto-approve all
      risk_score: 0, // MVP: No risk scoring
      originality_score: 0.8 // MVP: Assume good originality
    };

    return result;
  }

  /**
   * Generate first comment with CTA
   */
  async generateComment(caption, includeCTA = true) {
    const ctas = [
      'Link in bio! 👆',
      'Follow for more! 🙌',
      'Save this for later! 📌',
      'Share with someone who needs this! 💬',
      'Comment your thoughts below! 👇',
      'Double tap if you agree! ❤️'
    ];

    const questions = [
      'What do you think?',
      'Let me know your thoughts!',
      'Drop a comment below!',
      'What\'s your take on this?',
      'Tell me your experience!'
    ];

    let comment = '';

    // Detect niche from caption
    let selectedCTA = ctas[0];
    let selectedQuestion = questions[0];

    if (caption.toLowerCase().includes('90s') || caption.toLowerCase().includes('nostalgia')) {
      selectedCTA = ctas[Math.floor(Math.random() * ctas.length)];
      selectedQuestion = 'What\'s your favorite 90s memory?';
    } else if (caption.toLowerCase().includes('political') || caption.toLowerCase().includes('election')) {
      selectedCTA = 'Follow for more updates! 🗳️';
      selectedQuestion = 'What\'s your perspective? Let\'s discuss respectfully.';
    } else if (caption.toLowerCase().includes('motivation') || caption.toLowerCase().includes('emotional')) {
      selectedCTA = 'Save this for when you need a reminder! 💪';
      selectedQuestion = 'Tag someone who needs to see this! 👇';
    }

    comment = selectedQuestion;

    if (includeCTA) {
      comment += '\n\n' + selectedCTA;
    }

    return {
      comment,
      has_cta: includeCTA
    };
  }

  /**
   * Generate image prompt for a niche
   */
  async generateImagePrompt(niche = 'emotional') {
    const imagePrompts = {
      '90s nostalgia': [
        'Retro 90s aesthetic, VHS tape filter, vintage technology, warm nostalgic colors, 1990s style, grainy film look',
        'Childhood bedroom from the 90s, posters on walls, cassette tapes, Game Boy, warm sunset lighting, nostalgic atmosphere',
        '90s arcade scene, neon lights, retro gaming machines, teens hanging out, vintage clothing, nostalgic mood'
      ],
      'political': [
        'Professional American flag background, patriotic colors, dignified atmosphere, voting imagery, civic engagement theme',
        'Community gathering, diverse people talking respectfully, town hall setting, democratic process illustration',
        'Ballot box and voting materials, clean professional design, red white and blue theme, civic duty concept'
      ],
      'emotional': [
        'Person silhouetted against sunrise, hopeful atmosphere, golden hour lighting, inspirational mood, motivational scene',
        'Hands reaching out to help each other, warm lighting, supportive atmosphere, connection and community theme',
        'Mountain peak with sunrise, achievement and success symbolism, breathtaking view, goal accomplishment metaphor'
      ]
    };

    const prompts = imagePrompts[niche] || imagePrompts['emotional'];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    return {
      prompt,
      niche,
      style: niche === '90s nostalgia' ? 'retro' : niche === 'political' ? 'professional' : 'inspirational'
    };
  }

  /**
   * Generate complete post (caption + comment + image prompt)
   */
  async generateCompletePost(niche = 'emotional') {
    const captionResult = await this.generateCaption(niche);
    const commentResult = await this.generateComment(captionResult.caption);
    const imagePromptResult = await this.generateImagePrompt(niche);

    return {
      niche,
      caption: captionResult.caption,
      first_comment: commentResult.comment,
      image_prompt: imagePromptResult.prompt,
      approval_status: 'auto_approved', // MVP: Auto-approve
      risk_score: 0,
      originality_score: 0.8,
      content_type: 'image',
      format: captionResult.format
    };
  }

  /**
   * Batch generate posts for testing
   */
  async batchGeneratePosts(count = 5) {
    const niches = Object.keys(this.primaryNiches);
    const posts = [];

    for (let i = 0; i < count; i++) {
      const niche = niches[i % niches.length];
      const post = await this.generateCompletePost(niche);
      posts.push(post);
    }

    return posts;
  }

  /**
   * Analyze content (simplified for MVP - no risk scoring)
   */
  async analyzeContent(caption, firstComment = null) {
    return {
      caption_risk_score: 0, // MVP: No risk scoring
      comment_risk_score: 0,
      overall_risk_score: 0,
      recommendation: 'Auto-approved for MVP',
      approval_status: 'auto_approved',
      niche: this._detectNiche(caption)
    };
  }

  /**
   * Detect niche from caption
   */
  _detectNiche(caption) {
    const lowerCaption = caption.toLowerCase();

    for (const [niche, config] of Object.entries(this.primaryNiches)) {
      const matchCount = config.keywords.filter(keyword => lowerCaption.includes(keyword)).length;
      if (matchCount >= 2) {
        return niche;
      }
    }

    return 'general';
  }

  /**
   * Get available niches
   */
  getNiches() {
    return Object.keys(this.primaryNiches);
  }

  /**
   * Get niche configuration
   */
  getNicheConfig(niche) {
    return this.primaryNiches[niche] || null;
  }
}

module.exports = new ContentGeneratorService();
