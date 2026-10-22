import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const envFile = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envFile.match(/GOOGLE_API_KEY=(.+)/);
const key = keyMatch ? keyMatch[1].trim() : '';

const genAI = new GoogleGenerativeAI(key);

async function main() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const pdfData = fs.readFileSync('d:\\EzLex\\rent.pdf');
        
        const result = await model.generateContent([
            "Extract all the text from this PDF EXACTLY as it is formatted. Maintain all paragraphs, headings, bullet points, and the overall structure. Do not summarize. Just output the text of the agreement.",
            {
                inlineData: {
                    data: pdfData.toString("base64"),
                    mimeType: "application/pdf"
                }
            }
        ]);
        console.log("--- START ---\n" + result.response.text() + "\n--- END ---");
    } catch (e) {
        console.error(e);
    }
}
main();
