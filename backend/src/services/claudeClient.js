const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

const SUMMARY_MODEL = 'claude-opus-4-8';

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    bullet_points: {
      type: 'array',
      items: { type: 'string' },
      description: 'Concise bullet-point takeaways from the episode, most important first.',
    },
    short_summary: {
      type: 'string',
      description: 'A short-essay style summary (2-4 paragraphs) of the episode.',
    },
  },
  required: ['bullet_points', 'short_summary'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You summarize podcast episodes for a listener deciding whether to invest their time.
You will be given the episode title, show name, and whatever show notes / description / transcript text is available.
Produce both a bullet-point summary and a short-essay summary, grounded only in the given text. Do not invent details
that are not supported by the source material. Write in Traditional Chinese unless the source content is clearly in
another language, in which case match the source language.`;

/**
 * @param {{ showTitle?: string, episodeTitle?: string, sourceText: string }} input
 * @returns {Promise<{ bulletPoints: string[], shortSummary: string }>}
 */
async function summarizeEpisode({ showTitle, episodeTitle, sourceText }) {
  if (!sourceText || !sourceText.trim()) {
    const err = new Error('No source text to summarize (empty show notes / transcript).');
    err.status = 400;
    throw err;
  }

  const userContent = [
    showTitle ? `Show: ${showTitle}` : null,
    episodeTitle ? `Episode: ${episodeTitle}` : null,
    '---',
    sourceText,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
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

  return {
    bulletPoints: parsed.bullet_points,
    shortSummary: parsed.short_summary,
  };
}

module.exports = { summarizeEpisode };
