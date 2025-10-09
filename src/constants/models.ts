export const models = [
  // { id: 'openai/gpt-4o', name: 'GPT 4o', speed: 193, intelligence: 50, creditCost: 2 },
  // { id: 'openai/gpt-4o-mini', name: 'GPT 4o Mini', speed: 68, intelligence: 36, creditCost: 1 },
  { id: "openai/gpt-4.1", name: "GPT 4.1", speed: 132, intelligence: 53 },
  {
    id: "openai/gpt-4.1-mini",
    name: "GPT 4.1 Mini",
    speed: 229,
    intelligence: 53,
  },
  {
    id: "openai/gpt-4.1-nano",
    name: "GPT 4.1 Nano",
    speed: 293,
    intelligence: 41,
    free: true,
  },
  { id: "openai/o3", name: "o3", speed: 130, intelligence: 72 },
  { id: "openai/o4-mini", name: "o4 Mini", speed: 139, intelligence: 70 },
  // { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', speed: 77, intelligence: 44, creditCost: 1 },
  {
    id: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    speed: 250,
    intelligence: 48,
    free: true,
  },
  {
    id: "google/gemini-2.5-pro-exp-03-25",
    name: "Gemini 2.5 Pro Experimental",
    speed: 162,
    intelligence: 68,
  },
  { id: "xai/grok-3", name: "Grok 3", speed: 80, intelligence: 51 },
  { id: "xai/grok-3-mini", name: "Grok 3 Mini", speed: 115, intelligence: 67 },
  {
    id: "anthropic/claude-4-opus-20250514",
    name: "Claude 4 Opus",
    speed: 65,
    intelligence: 64,
  },
  {
    id: "anthropic/claude-4-sonnet-20250514",
    name: "Claude 4 Sonnet",
    speed: 65,
    intelligence: 61,
  },
];

// pricing in dollars per 1M tokens
export const modelPricing = {
  "openai/gpt-4.1": {
    input: 2.0,
    output: 8.0,
  },
  "openai/gpt-4.1-mini": {
    input: 0.4,
    output: 1.6,
  },
  "openai/gpt-4.1-nano": {
    input: 0.1,
    output: 0.4,
  },
  "openai/o3": {
    input: 10.0,
    output: 40.0,
  },
  "openai/o4-mini": {
    input: 1.1,
    output: 4.4,
  },
  "anthropic/claude-3-7-sonnet-20250219": {
    input: 3.0,
    output: 15.0,
  },
  "google/gemini-2.0-flash": {
    input: 0.15,
    output: 0.6,
  },
  "google/gemini-2.5-pro-exp-03-25": {
    input: 2.5,
    output: 15.0,
  },
  "xai/grok-3": {
    input: 3.0,
    output: 15.0,
  },
  "xai/grok-3-mini": {
    input: 0.3,
    output: 0.5,
  },
};

export const calculateCreditCost = (model: string, usage: any) => {
  // calculate the cost of the usage
  const pricing = modelPricing[model as keyof typeof modelPricing];
  const inputCost = pricing.input * (usage.promptTokens / 1000000);
  const outputCost = pricing.output * (usage.completionTokens / 1000000);
  const totalCost = inputCost + outputCost;

  const totalCostWithMarkup = totalCost * 2;

  // round up to the nearest mill
  const totalCostWithMarkupRounded =
    Math.ceil(totalCostWithMarkup * 1000) / 1000;

  // total credit cost
  const totalCreditCost = totalCostWithMarkupRounded * 1000;

  return totalCreditCost;
};

export const providers = [
  {
    id: "openai",
    name: "OpenAI",
    models: [
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/o3",
      "openai/o4-mini",
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: ["anthropic/claude-3-7-sonnet-20250219"],
  },
  {
    id: "google",
    name: "Google",
    models: ["google/gemini-2.0-flash", "google/gemini-2.5-pro-exp-03-25"],
  },
  {
    id: "xai",
    name: "xAI",
    models: ["xai/grok-3", "xai/grok-3-mini"],
  },
];
