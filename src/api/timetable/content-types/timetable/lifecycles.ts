import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// --- CONFIGURATION ---
const PDF_FIELD = 'timetableImage'; 
const JSON_FIELD = 'prayerData';     
const COLLECTION_UID = 'api::timetable.timetable'; 
// ---------------------

export default {
  async afterCreate(event: any) {
    await processTimetable(event);
  },

  async afterUpdate(event: any) {
    await processTimetable(event);
  },
};

function getFileId(fieldData: any): number | string | null {
  if (!fieldData) return null;
  if (typeof fieldData === 'number' || typeof fieldData === 'string') return fieldData;
  if (typeof fieldData === 'object' && 'id' in fieldData) return fieldData.id;
  if (fieldData.connect && Array.isArray(fieldData.connect) && fieldData.connect.length > 0) {
    return getFileId(fieldData.connect[0]);
  }
  if (Array.isArray(fieldData) && fieldData.length > 0) {
    return getFileId(fieldData[0]);
  }
  return null;
}

async function processTimetable(event: any) {
  const { result, params } = event;

  // 1. LOOP PROTECTION
  const currentData = params.data && params.data[JSON_FIELD];
  if (currentData) {
    if (Array.isArray(currentData) && currentData.length > 5) return;
    const isError = Array.isArray(currentData) && currentData[0] && currentData[0].ERROR;
    if (!isError && Array.isArray(currentData) && currentData.length > 5) {
       return;
    }
  }

  // 2. Validation
  if (!params.data || !params.data[PDF_FIELD]) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  try {
    const fileId = getFileId(params.data[PDF_FIELD]);
    if (!fileId) return;

    const fileData: any = await strapi.db.query('plugin::upload.file').findOne({
      where: { id: fileId }
    });

    if (!fileData || fileData.ext !== '.pdf') return;

    // 3. Get File Buffer
    let base64Data: string = "";
    if (fileData.url.startsWith('http')) {
      const response = await fetch(fileData.url);
      if (!response.ok) throw new Error(`Failed to fetch PDF`);
      const arrayBuffer = await response.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
    } else {
      const publicDir = strapi.dirs.static.public;
      const filePath = path.join(publicDir, fileData.url);
      if (!fs.existsSync(filePath)) return;
      const fileBuffer = fs.readFileSync(filePath);
      base64Data = fileBuffer.toString('base64');
    }

    // 4. Send to Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const targetMonth = result.month || "Unknown";
    const targetYear = result.year || "Unknown";

    const prompt = `
      You are a data extraction engine.
      
      STEP 1: SAFETY CHECK
      Scan the document for a printed Month Name.
      - IF you find a month name AND it clearly CONTRADICTS the target month "${targetMonth}":
        Return this JSON: [{ "ERROR": "MISMATCH: PDF says [Found Month] but entry is for ${targetMonth}." }]
      - IF you find NO month name OR it matches "${targetMonth}":
        Proceed to Step 2.

      STEP 2: EXTRACTION
      Extract the prayer timetable into this JSON format:
      [
        {
          "date": 1,
          "day": "MON",
          "fajr": { "start": "5.39", "jamaat": "7.00" },
          "dhuhar": { "start": "11.47", "jamaat": "12.30/1.30" },
          "asr": { "start": "2.08", "jamaat": "2.30" },
          "maghrib": { "start": "3.53", "jamaat": "3.53" },
          "isha": { "start": "5.53", "jamaat": "7.00" }
        }
      ]

      RULES:
      1. 100% Accuracy for numbers.
      2. No leading zeros.
      3. Keep slashes for multiple times.
      4. Output ONLY valid JSON.
    `;

    strapi.log.info(`[Timetable AI] Processing PDF for ${targetMonth}...`);
    
    const aiResult = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "application/pdf" } },
    ]);

    const response = await aiResult.response;
    const textResponse = response.text();
    const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanJson);

    // 5. Save Result
    await strapi.entityService.update(COLLECTION_UID, result.id, {
      data: {
        [JSON_FIELD]: parsedData
      }
    });
    
    if (parsedData[0]?.ERROR) {
       strapi.log.warn(`[Timetable AI] BLOCKED: ${parsedData[0].ERROR}`);
    } else {
       strapi.log.info(`[Timetable AI] SUCCESS! Database updated.`);
    }

  } catch (error: any) {
    strapi.log.error(`[Timetable AI] Error: ${error.message}`);
  }
}