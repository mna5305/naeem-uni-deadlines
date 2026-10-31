import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initialize Google GenAI client per skill guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint to scan university fee voucher screenshot
app.post('/api/scan-voucher', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const cleanMime = mimeType || 'image/jpeg';

    const promptText = `
You are analyzing a university fee voucher, fee challan, LMS installment plan, or academic deadline schedule table (e.g. from Virtual University of Pakistan or similar).
Examine the image carefully for:
1. Every fee installment row (Installment Number, Due Date, Amount in Rs/PKR).
2. The total voucher amount if indicated.

Return structured JSON with:
- installments: array of objects { no: number or null, amount: number (pure integer without currency/commas), due: string "YYYY-MM-DD" }
- total: number or null (total amount of all installments or full voucher amount)
- studentInfo: optional string if student name, ID or semester is legible, else null

If no installment schedule is found, return { "installments": [], "total": null }.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            installments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  no: { type: Type.INTEGER },
                  amount: { type: Type.NUMBER },
                  due: { type: Type.STRING, description: 'Due date in YYYY-MM-DD' },
                },
                required: ['amount', 'due'],
              },
            },
            total: { type: Type.NUMBER },
            studentInfo: { type: Type.STRING },
          },
          required: ['installments'],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error scanning voucher screenshot:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process screenshot with AI',
      installments: [],
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'uni-deadlines-backend', timestamp: new Date().toISOString() });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Uni Deadlines app listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
