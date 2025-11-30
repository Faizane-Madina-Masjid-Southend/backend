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

  // 1. SMART LOOP PROTECTION (Updated for Instructions)
  const currentData = params.data && params.data[JSON_FIELD];
  
  if (currentData) {
    // If the data is an array and has MORE than 5 entries, it's likely a real month.
    // In that case, we stop to prevent overwriting or looping.
    // If it has 1 entry (your instruction) or 0, we proceed.
    if (Array.isArray(currentData) && currentData.length > 5) {
      return;
    }
  }

  // 2. Validation
  if (!params.data || !params.data[PDF_FIELD]) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    strapi.log.error("[Timetable AI] GEMINI_API_KEY is missing in .env");
    return;
  }

  try {
    const fileId = getFileId(params.data[PDF_FIELD]);
    if (!fileId) return;

    const fileData: any = await strapi.db.query('plugin::upload.file').findOne({
      where: { id: fileId }
    });

    if (!fileData || fileData.ext !== '.pdf') {
      strapi.log.warn(`[Timetable AI] File is not a PDF.`);
      return;
    }

    let base64Data: string = "";

    if (fileData.url.startsWith('http')) {
      strapi.log.info(`[Timetable AI] Downloading file from Cloud...`);
      const response = await fetch(fileData.url);
      if (!response.ok) throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
    } else {
      const publicDir = strapi.dirs.static.public;
      const filePath = path.join(publicDir, fileData.url);
      if (!fs.existsSync(filePath)) {
        strapi.log.error(`[Timetable AI] File missing locally: ${filePath}`);
        return;
      }
      const fileBuffer = fs.readFileSync(filePath);
      base64Data = fileBuffer.toString('base64');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // SPEED OPTION: Using 2.0 Flash for faster UX. 
    // Switch back to "gemini-2.5-pro" if you notice any accuracy issues.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are a data extraction engine. 
      Extract the prayer timetable from this PDF into JSON format.
      
      CRITICAL RULES:
      1. Output MUST be valid JSON.
      2. Do not include markdown formatting (no \`\`\`json tags).
      3. Accuracy must be 100%. Copy the numbers EXACTLY as they appear.
      4. DO NOT add leading zeros (e.g. if text is "5.30", output "5.30", NOT "05.30").
      5. If a 'Jamaat' time is missing for Maghrib, use the 'Maghrib Start' time.
      6. SPECIAL CASE: If a column contains multiple times (e.g., "12.30/1.30"), KEEP BOTH TIMES exactly as written with the slash.
      
      REQUIRED JSON STRUCTURE:
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
    `;

    strapi.log.info(`[Timetable AI] Processing ${fileData.name} with Gemini Flash...`);
    
    const aiResult = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "application/pdf" } },
    ]);

    const response = await aiResult.response;
    const textResponse = response.text();

    const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanJson);

    strapi.log.info(`[Timetable AI] AI finished. Saving to DB...`);

    // Explicit update
    await strapi.entityService.update(COLLECTION_UID, result.id, {
      data: {
        [JSON_FIELD]: parsedData
      }
    });
    
    strapi.log.info(`[Timetable AI] SUCCESS! Database updated.`);

  } catch (error: any) {
    strapi.log.error(`[Timetable AI] Error: ${error.message}`);
  }
}