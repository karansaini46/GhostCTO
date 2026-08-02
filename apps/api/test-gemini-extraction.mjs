import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const envStr = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  envStr.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
  return env;
}

const env = loadEnv();
const API_KEY = env.EXTRACTION_PROVIDER_API_KEY;
const BASE_URL = env.EXTRACTION_PROVIDER_BASE_URL?.replace(/\/+$/, '');
const MODEL = env.EXTRACTION_PROVIDER_MODEL || 'gemini-2.5-flash';

console.log('🔧 Config:');
console.log(`   Base URL: ${BASE_URL}`);
console.log(`   Model: ${MODEL}`);
console.log(`   API Key: ${API_KEY ? API_KEY.slice(0, 10) + '...' : '❌ MISSING'}`);

// Logic from openai-adapter.ts
const url = BASE_URL.includes('googleapis.com') 
  ? `${BASE_URL}/chat/completions`
  : `${BASE_URL}/v1/chat/completions`;

console.log(`\n📤 POST ${url}`);

const body = {
  model: MODEL,
  messages: [
    { role: 'system', content: 'You must respond with valid JSON only. Do not include markdown, code fences, or explanatory text.' },
    { role: 'user', content: 'Extract structured project context from the founder\'s description below. Return a JSON object with exactly these keys:\n- ideaSummary\n- targetCustomer\n- industry\n\nFounder description:\nI want to build a SaaS platform for freelance designers to send invoices and track payments.' },
  ],
  max_tokens: 1024,
  temperature: 0.1,
  response_format: { type: 'json_object' },
};

async function testGemini() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`\n📥 Status: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    console.log(`\n📋 Raw response body:`);
    console.log(text.slice(0, 2000));
  } catch (err) {
    console.error('❌ Fetch error:', err.message);
  }
}

testGemini();
