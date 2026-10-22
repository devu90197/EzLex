import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const hfTokenMatch = envFile.match(/GOOGLE_API_KEY=(.+)/);
const token = hfTokenMatch ? hfTokenMatch[1].trim() : '';

const genAI = new GoogleGenerativeAI(token);

async function testEmbedding(modelName: string) {
  console.log(`Testing ${modelName}...`);
  try {
    const embeddingModel = genAI.getGenerativeModel({ model: modelName });
    const result = await embeddingModel.embedContent("Hello world");
    console.log(`SUCCESS. Dimension: ${result.embedding.values.length}`);
  } catch (error: any) {
    console.error(`FAILED ${modelName}:`, error.message);
  }
}

async function main() {
    await testEmbedding("text-embedding-004");
    await testEmbedding("models/text-embedding-004");
    await testEmbedding("text-embedding-004");
    await testEmbedding("embedding-001");
}

main();
