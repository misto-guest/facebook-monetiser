/**
 * Runware.ai Service (z.ai)
 * AI content generation with model testing and performance tracking
 */

class RunwareService {
  constructor() {
    this.baseUrl = 'https://api.runware.ai/v1';
    this.apiKey = process.env.RUNWARE_API_KEY || null;

    // Model configurations
    this.models = {
      text: {
        glm4: 'z.ai/glm-4'
      },
      image: {
        dall_e: 'openai/dall-e-3',
        sdxl: 'stability/sdxl-turbo'
      }
    };

    this.defaultTextModel = this.models.text.glm4;
    this.defaultImageModel = this.models.image.dall_e;

    this.modelPerformance = {
      text: {},
      image: {}
    };
  }

  /**
   * Generate text content with z.ai GLM-4
   */
  async generateText(prompt, model = null, options = {}) {
    if (!this.apiKey) {
      console.warn('RUNWARE_API_KEY not configured, using mock responses');
      return this._mockGenerateText(prompt, options);
    }

    const selectedModel = model || this.defaultTextModel;

    try {
      const response = await fetch(`${this.baseUrl}/text/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          max_tokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Runware API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      this._trackModelPerformance('text', selectedModel, data);

      return {
        content: data.text || data.content || data.choices?.[0]?.message?.content,
        model: selectedModel,
        tokens_used: data.usage?.total_tokens,
        cost: data.cost || null
      };
    } catch (error) {
      console.error('Runware text generation error:', error.message);
      return this._mockGenerateText(prompt, options);
    }
  }

  /**
   * Generate image with z.ai
   */
  async generateImage(prompt, model = null, options = {}) {
    if (!this.apiKey) {
      return this._mockGenerateImage(prompt, options);
    }

    const selectedModel = model || this.defaultImageModel;

    try {
      const response = await fetch(`${this.baseUrl}/image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          width: options.width || 1024,
          height: options.height || 1024,
          num_images: options.numImages || 1
        })
      });

      if (!response.ok) {
        throw new Error(`Runware API error: ${response.status}`);
      }

      const data = await response.json();

      this._trackModelPerformance('image', selectedModel, data);

      return {
        image_url: data.images?.[0]?.url || data.image_url || data.url,
        model: selectedModel,
        generation_time: data.generation_time || null,
        cost: data.cost || null
      };
    } catch (error) {
      console.error('Runware image generation error:', error.message);
      return this._mockGenerateImage(prompt, options);
    }
  }

  /**
   * Get best performing model
   */
  getBestModel(type) {
    const performance = this.modelPerformance[type];

    if (!performance || Object.keys(performance).length === 0) {
      return type === 'text' ? this.defaultTextModel : this.defaultImageModel;
    }

    let bestModel = null;
    let bestScore = -1;

    for (const [model, stats] of Object.entries(performance)) {
      const score = stats.success_rate - (stats.avg_cost * 0.1);
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    return bestModel || (type === 'text' ? this.defaultTextModel : this.defaultImageModel);
  }

  /**
   * Track model performance
   */
  _trackModelPerformance(type, model, response) {
    if (!this.modelPerformance[type][model]) {
      this.modelPerformance[type][model] = {
        requests: 0,
        successes: 0,
        total_cost: 0,
        avg_cost: 0,
        success_rate: 0
      };
    }

    const perf = this.modelPerformance[type][model];
    perf.requests++;
    perf.successes++;
    perf.total_cost += response.cost || 0;
    perf.avg_cost = perf.total_cost / perf.requests;
    perf.success_rate = perf.successes / perf.requests;
  }

  /**
   * Mock text generation (fallback)
   */
  _mockGenerateText(prompt, options) {
    const mockResponses = {
      '90s nostalgia': [
        "Remember when life was simpler? 📼 Saturday morning cartoons, dial-up internet, and the sweet sound of a CD player clicking shut. Share your favorite 90s memory below! 👇 #90sKids #Nostalgia #Throwback",
        "POV: You just finished watching TGIF on a Friday night in 1997. The Blockbuster trip awaits, your Walkman is loaded with fresh batteries, and life is good. 💿✨ Who else misses this vibe? #90sNostalgia #ChildhoodMemories"
      ],
      'political': [
        "The political landscape has shifted dramatically in recent years. What changes have you noticed in your community? Drop your thoughts below - let's have a respectful conversation. 🗳️ #PoliticalDiscussion #CommunityVoice",
        "Regardless of where you stand on the issues, we can all agree that civic engagement matters more than ever. Make your voice heard this election season. 🇺🇸 #Vote #CivicEngagement #Democracy"
      ],
      'emotional': [
        "To anyone going through a tough time right now: Your story isn't over. The darkest moments often lead to the brightest dawns. Keep going, keep believing, keep fighting. 💪✨ #Motivation #NeverGiveUp #YouGotThis",
        "Sometimes the strongest thing you can do is ask for help. It's not weakness - it's courage. You deserve support, and there are people who care. Reach out. ❤️ #MentalHealthMatters #YouAreNotAlone #ItsOkayToNotBeOkay"
      ]
    };

    let niche = 'emotional';
    if (prompt.toLowerCase().includes('90s') || prompt.toLowerCase().includes('nostalgia')) {
      niche = '90s nostalgia';
    } else if (prompt.toLowerCase().includes('political') || prompt.toLowerCase().includes('government')) {
      niche = 'political';
    }

    const responses = mockResponses[niche] || mockResponses['emotional'];
    const content = responses[Math.floor(Math.random() * responses.length)];

    return {
      content,
      model: 'mock',
      tokens_used: Math.floor(Math.random() * 100) + 50,
      cost: 0
    };
  }

  /**
   * Mock image generation
   */
  _mockGenerateImage(prompt, options) {
    return {
      image_url: `https://picsum.photos/1024/1024?random=${Date.now()}`,
      model: 'mock',
      generation_time: 2.5,
      cost: 0
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.apiKey) {
      return { status: 'mock_mode', message: 'Using mock responses (no API key configured)' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return { status: 'ok', api_reachable: response.ok };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Get model performance stats
   */
  getModelPerformance() {
    return this.modelPerformance;
  }
}

module.exports = new RunwareService();
