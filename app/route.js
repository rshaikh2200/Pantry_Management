'use server';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize Groq with the API key from environment variables
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function main() {
  try {
    const chatCompletion = await getGroqChatCompletion();
    // Print the completion returned by the LLM.
    console.log(chatCompletion.choices[0]?.message?.content || 'No content received.');
  } catch (error) {
    console.error('Error getting chat completion:', error);
  }
}

export async function getGroqChatCompletion() {
  return groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: 'Explain the importance of fast language models',
      },
    ],
    model: 'llama3-8b-8192',
  });
}

// Run the main function to get and display the response
main();
