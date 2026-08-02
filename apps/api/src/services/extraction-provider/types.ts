export type ExtractionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ExtractionRequest = {
  messages: ExtractionMessage[];
  model: string;
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: 'json_object' };
};

export type ExtractionResponse = {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export type ExtractionProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};
