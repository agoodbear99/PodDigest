const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

const SUMMARY_MODEL = 'claude-opus-4-8';

const SUPPORTED_LANGUAGES = new Set(['zh-TW', 'en']);
const DEFAULT_LANGUAGE = 'zh-TW';

const GUESS_DISCLAIMERS = {
  'zh-TW': '以下為根據標題推測的內容摘要',
  en: 'The following is a best-guess summary based on the title alone',
};

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    bullet_points: {
      type: 'array',
      items: { type: 'string' },
      description: 'Concise, scannable bullet-point takeaways from the episode, most important first.',
    },
    short_summary: {
      type: 'string',
      description:
        'A magazine-style feature summary of about 300-400 words. This must NOT be a prose rephrasing ' +
        'of the bullet points — it should open with an engaging hook, add narrative context/background the ' +
        'bullets omit, include supporting detail or nuance from the source material, and close with a short ' +
        "take on the episode's significance for the listener.",
    },
  },
  required: ['bullet_points', 'short_summary'],
  additionalProperties: false,
};

// Shared style guidance for `short_summary` so the essay view reads as a distinct,
// richer piece rather than the bullet points restated in sentence form.
const SHORT_SUMMARY_STYLE = `short_summary — a magazine-style feature piece of about 300-400 words. This is NOT a prose version of
   the bullet points; it should read like an engaging editorial write-up:
   - Open with a compelling hook sentence that draws the reader in (never start with "This episode discusses..." or similar).
   - Add narrative context and background the bullet points don't cover — who the guests/hosts are, why the
     topic matters right now, how the ideas connect.
   - Include supporting detail, anecdotes, or nuance from the source material that the bullets leave out.
   - Close with a short closing take: what this episode means for the listener, or its broader significance.`;

// Enforced unconditionally — the source text is very often in English (most podcast
// show notes are), and a conditional "match the source language" rule was the reason
// summaries flip-flopped between Chinese and English depending on the episode.
function buildLanguageInstruction(language) {
  if (language === 'en') {
    return `Output language — follow this exactly, with no exceptions:
- Always write the ENTIRE output — every bullet_point and the full short_summary — in English.
- This applies no matter what language the source text, show name, or episode title is written in. If the source
  material is in Chinese (or any other language), translate and summarize it into English — never leave any
  sentence untranslated or switch languages partway through.
- Proper nouns (person names, place names, company/brand/product names) should use their standard English form
  where a common one exists, and otherwise be kept as they are commonly rendered in English-language media.`;
  }

  return `Output language — follow this exactly, with no exceptions:
- Always write the ENTIRE output — every bullet_point and the full short_summary — in Traditional Chinese (繁體中文).
- This applies no matter what language the source text, show name, or episode title is written in. If the source
  material is in English (or any other language), translate and summarize it into Traditional Chinese — never
  reply in English or leave any sentence untranslated.
- The one exception: proper nouns — person names, place names, and company/brand/product names — stay in their
  original language instead of being translated or transliterated (e.g. keep "Elon Musk", "OpenAI", "The New York
  Times" as written, inside otherwise Traditional Chinese sentences).`;
}

function buildSystemPrompt(language) {
  return `You summarize podcast episodes for a listener deciding whether to invest their time.
You will be given the episode title, show name, and whatever show notes / description / transcript text is available.
Produce two genuinely different outputs, grounded only in the given text — do not invent details that are not
supported by the source material:

1. bullet_points — concise, scannable takeaways, most important first.
2. ${SHORT_SUMMARY_STYLE}

${buildLanguageInstruction(language)}`;
}

function buildGuessSystemPrompt(language) {
  return `You help a listener decide whether a podcast episode is worth their time. For this
request, no show notes, description, or transcript is available — only the show name and episode title.

Infer the most likely topic and content of the episode from the title and show name alone, drawing on general
knowledge of the show if you recognize it. Clearly signal in the writing itself that this is an inferred guess,
not confirmed content — do not present guessed details as established fact.

Produce two outputs in the same style you would for a real summary:

1. bullet_points — concise, scannable best-guess takeaways, most important first.
2. ${SHORT_SUMMARY_STYLE} (here: your best-guess narrative, clearly framed as inference)

${buildLanguageInstruction(language)}`;
}

/**
 * @param {{ showTitle?: string, episodeTitle?: string, sourceText?: string, isGuess?: boolean, language?: 'zh-TW'|'en' }} input
 * @returns {Promise<{ bulletPoints: string[], shortSummary: string }>}
 */
async function summarizeEpisode({ showTitle, episodeTitle, sourceText, isGuess = false, language = DEFAULT_LANGUAGE }) {
  if (!isGuess && (!sourceText || !sourceText.trim())) {
    const err = new Error('No source text to summarize (empty show notes / transcript).');
    err.status = 400;
    throw err;
  }

  const resolvedLanguage = SUPPORTED_LANGUAGES.has(language) ? language : DEFAULT_LANGUAGE;

  const userContent = isGuess
    ? [
        showTitle ? `Show: ${showTitle}` : null,
        episodeTitle ? `Episode: ${episodeTitle}` : null,
        '---',
        'No show notes, description, or transcript is available for this episode. Infer the likely content ' +
          'from the show name and episode title alone.',
      ]
        .filter(Boolean)
        .join('\n')
    : [
        showTitle ? `Show: ${showTitle}` : null,
        episodeTitle ? `Episode: ${episodeTitle}` : null,
        '---',
        sourceText,
      ]
        .filter(Boolean)
        .join('\n');

  const response = await client.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 3072,
    system: isGuess ? buildGuessSystemPrompt(resolvedLanguage) : buildSystemPrompt(resolvedLanguage),
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SUMMARY_SCHEMA },
    },
    messages: [{ role: 'user', content: userContent }],
  });

  if (response.stop_reason === 'refusal') {
    const err = new Error('The summarization request was declined by Claude’s safety systems.');
    err.status = 422;
    throw err;
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    const err = new Error('Claude returned no text content.');
    err.status = 502;
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (parseError) {
    const err = new Error('Failed to parse structured summary response from Claude.');
    err.status = 502;
    throw err;
  }

  if (isGuess) {
    const disclaimer = GUESS_DISCLAIMERS[resolvedLanguage];
    const separator = resolvedLanguage === 'zh-TW' ? '：' : ':';
    return {
      bulletPoints: [`⚠️ ${disclaimer}`, ...parsed.bullet_points],
      shortSummary: `${disclaimer}${separator}\n\n${parsed.short_summary}`,
    };
  }

  return {
    bulletPoints: parsed.bullet_points,
    shortSummary: parsed.short_summary,
  };
}

module.exports = { summarizeEpisode };
