/**
 * Ollama Service - AI-powered natural language summaries
 * Uses qwen3.5 model for generating detailed astrology predictions
 */

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'llama3';  // Faster model, good for text generation
const TIMEOUT_MS = 60000; // 1 minute timeout

export interface OllamaSummaryData {
  profileName: string;
  date: string;
  timezone: string;
  natalLagnaSign: number;
  natalMoonNakshatra: number;
  currentMahadasha: string;
  currentAntardasha: string;
  birthChartSummary: string;
  predictions: Array<{
    hour: number;
    pranaDashaPlanet: string;
    sookshmaDashaPlanet: string;
    moonNakshatra: number;
    moonSign: number;
    transitLagnaSign: number;
    hourlyScore: number;
  }>;
}

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

/**
 * Check if Ollama is available and responsive
 */
export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate AI-powered natural language summary using Ollama
 */
export async function generateAISummary(data: OllamaSummaryData): Promise<string | null> {
  const prompt = buildPrompt(data);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 600,  // Limit output length for faster response
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Ollama error: ${response.status}`);
      return null;
    }

    const result: OllamaResponse = await response.json();
    return result.response.trim();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Ollama request timed out');
    } else {
      console.error('Ollama error:', error);
    }
    return null;
  }
}

function buildPrompt(data: OllamaSummaryData): string {
  const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const NAKSHATRA_NAMES = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];

  const predictionsText = data.predictions
    .map(p => `Hour ${String(p.hour).padStart(2, '0')}:00 - Score: ${p.hourlyScore}/100 | Prana Dasha: ${p.pranaDashaPlanet} | Moon: ${NAKSHATRA_NAMES[p.moonNakshatra]} (${SIGN_NAMES[p.moonSign]}) | Transit Lagna: ${SIGN_NAMES[p.transitLagnaSign]}`)
    .join('\n');

  return `You are an expert Vedic astrology analyst. Generate a detailed, personalized daily prediction summary for the following person and date.

PROFILE:
- Name: ${data.profileName}
- Date: ${data.date}
- Timezone: ${data.timezone}
- Natal Lagna (Ascendant): ${SIGN_NAMES[data.natalLagnaSign]}
- Natal Moon Nakshatra: ${NAKSHATRA_NAMES[data.natalMoonNakshatra]}
- Current Mahadasha: ${data.currentMahadasha}
- Current Antardasha: ${data.currentAntardasha}

BIRTH CHART SUMMARY:
${data.birthChartSummary}

HOURLY PREDICTIONS FOR ${data.date}:
${predictionsText}

INSTRUCTIONS:
Generate a natural language summary in exactly this format with 5 sections:

Career: [2-3 sentences analyzing career prospects based on transit Lagna positions, any Saturn influences, and dasha periods. Include specific auspicious hours if identified.]

Finance: [2-3 sentences analyzing financial prospects based on Venus/Jupiter influences, 2nd/11th house indicators, Moon strength, and dasha periods. Mention caution or opportunities as appropriate.]

Health: [2-3 sentences analyzing health based on Mars/Rahu periods, Moon placement for mental peace, and overall vitality indicators. Include practical advice.]

Relationships: [2-3 sentences analyzing relationships based on Venus dasha, Moon nakshatra friendship from birth star, and partnership indicators. Include best times for social activities.]

Education: [2-3 sentences analyzing education/learning prospects based on Jupiter/Mercury influences, 4th/5th house lord positions, and intellectual capacity indicators.]

IMPORTANT:
- Write in second person (address the person directly)
- Be specific about hours and planetary positions when relevant
- Use accessible language while being astrologically accurate
- Do not repeat generic phrases - make each section unique to this person's chart and date
- Keep each section to 2-3 sentences maximum
- Do not add any headers, labels, or explanations outside the 5 sections
- Start directly with "Career:" on the first line`;
}

/**
 * Parse AI response into structured summary object
 */
export function parseAIResponse(response: string): Record<string, string> {
  const result: Record<string, string> = {
    career: '',
    finance: '',
    health: '',
    relationships: '',
    education: '',
  };

  const lines = response.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();

    if (lowerLine.startsWith('career:')) {
      currentSection = 'career';
      result[currentSection] = line.substring(7).trim();
    } else if (lowerLine.startsWith('finance:')) {
      currentSection = 'finance';
      result[currentSection] = line.substring(8).trim();
    } else if (lowerLine.startsWith('health:')) {
      currentSection = 'health';
      result[currentSection] = line.substring(7).trim();
    } else if (lowerLine.startsWith('relationships:')) {
      currentSection = 'relationships';
      result[currentSection] = line.substring(14).trim();
    } else if (lowerLine.startsWith('education:')) {
      currentSection = 'education';
      result[currentSection] = line.substring(10).trim();
    } else if (currentSection && line.trim()) {
      // Continuation of current section
      result[currentSection] += ' ' + line.trim();
    }
  }

  // If parsing failed, try alternative format
  if (!result.career && response.trim()) {
    const sections = response.split(/(?=Career:|Finance:|Health:|Relationships:|Education:)/i);
    for (const section of sections) {
      const lower = section.toLowerCase();
      if (lower.startsWith('career:')) result.career = section.substring(6).trim();
      else if (lower.startsWith('finance:')) result.finance = section.substring(7).trim();
      else if (lower.startsWith('health:')) result.health = section.substring(7).trim();
      else if (lower.startsWith('relationships:')) result.relationships = section.substring(14).trim();
      else if (lower.startsWith('education:')) result.education = section.substring(10).trim();
    }
  }

  return result;
}
