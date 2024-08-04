'use server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env['GROQ_API_KEY'], // This is the default and can be omitted
});

async function main() {
  const params: Groq.Chat.CompletionCreateParams = {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Explain the importance of low latency LLMs' },
    ],
    model: 'llama3-8b-8192',
  };
  const chatCompletion: Groq.Chat.ChatCompletion = await groq.chat.completions.create(params);
}

main();
