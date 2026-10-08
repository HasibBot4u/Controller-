import { describe, it, expect } from 'vitest';
import { VERIFIED_REFERENCE_MODELS } from './models.ts';

describe('Verified Reference AI Models Catalog', () => {
  it('contains current Anthropic models with verified 1M context where applicable', () => {
    const fable = VERIFIED_REFERENCE_MODELS.find((m) => m.modelId === 'claude-fable-5-1');
    const opus = VERIFIED_REFERENCE_MODELS.find((m) => m.modelId === 'claude-opus-5-5');
    const sonnet = VERIFIED_REFERENCE_MODELS.find((m) => m.modelId === 'claude-sonnet-5-5');

    expect(fable).toBeDefined();
    expect(fable?.contextWindow).toBe(1000000);
    expect(opus).toBeDefined();
    expect(opus?.contextWindow).toBe(1000000);
    expect(sonnet).toBeDefined();
    expect(sonnet?.contextWindow).toBe(1000000);
  });

  it('contains correct full official model ID for Claude Haiku 4.5', () => {
    const haiku = VERIFIED_REFERENCE_MODELS.find((m) => m.alias === 'haiku');
    expect(haiku).toBeDefined();
    expect(haiku?.modelId).toBe('claude-haiku-4-5-20251001');
    expect(haiku?.contextWindow).toBe(200000);
  });

  it('contains current Google Gemini model in reference catalog', () => {
    const gemini = VERIFIED_REFERENCE_MODELS.find((m) => m.modelId === 'gemini-3.8-flash');
    expect(gemini).toBeDefined();
    expect(gemini?.provider).toBe('Google');
  });

  it('marks all reference catalog models with status REFERENCE_ONLY and origin VERIFIED_REFERENCE', () => {
    for (const model of VERIFIED_REFERENCE_MODELS) {
      expect(model.status).toBe('REFERENCE_ONLY');
      expect(model.origin).toBe('VERIFIED_REFERENCE');
    }
  });
});
