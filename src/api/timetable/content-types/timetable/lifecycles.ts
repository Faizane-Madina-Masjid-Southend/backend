import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    if (data.timetableImage) {
      await processTimetable(data.timetableImage, data);
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;

    // @ts-ignore
    const entry = await strapi.entityService.findOne(
      "api::timetable.timetable",
      where.id,
      { populate: ["timetableImage"] }
    );
// @ts-ignore
    const imageId = data.timetableImage || (entry.timetableImage ? entry.timetableImage.id : null);

    if (imageId) {
      // Merge existing data with new data for validation
      data.year = data.year || entry.year;
      data.month = data.month || entry.month;

      await processTimetable(imageId, data);
    }
  },
};

/**
 * 🧠 SHARED PROCESSOR
 */
async function processTimetable(imageId: number | string, dataState: any) {
  try {
    // @ts-ignore
    const file = await strapi.entityService.findOne("plugin::upload.file", imageId);
    if (!file) return;

    // @ts-ignore
    const uploadDir = path.join(strapi.dirs.static.public, "uploads");
    const fullPath = path.join(uploadDir, file.hash + file.ext);

    if (fs.existsSync(fullPath)) {
      console.log(`👁️ OCR Parser: Processing PDF...`);

      // 1. PDF -> Image
      const tempImgPrefix = path.join("/tmp", `timetable-${Date.now()}`);
      try {
        execSync(`pdftoppm -png -r 300 "${fullPath}" "${tempImgPrefix}"`);
      } catch (e: any) {
        throw new Error("Failed to convert PDF. Is poppler-utils installed?");
      }

      // 2. OCR
      const imgPath = `${tempImgPrefix}-1.png`;
      let rawText = "";
      if (fs.existsSync(imgPath)) {
        try {
          rawText = execSync(`tesseract "${imgPath}" stdout --psm 6`, { encoding: "utf8" });
        } catch (e: any) {
          throw new Error("Failed to run OCR. Is tesseract-ocr installed?");
        } finally {
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
      }

      // 3. Parse Strict
      const parsedRows = parseTimetableStrict(rawText);
      console.log(`🔒 Extracted Rows: ${parsedRows.length}`);

      // 4. Validate Logic
      if (dataState.year && dataState.month) {
        validateTimetableLogic(parsedRows, dataState.year, dataState.month);
      }

      // 5. SANITIZE (CRITICAL STEP)
      // This converts the object to a string and back to JSON.
      // It strips out 'undefined' values which cause the "invalid input syntax" database error.
      const cleanJson = JSON.parse(JSON.stringify(parsedRows));

      console.log("💾 Saving Clean JSON data...");
      dataState.prayerData = cleanJson;
    }
  } catch (err: any) {
    console.error("❌ Processing Error:", err.message);
    throw new Error(err.message);
  }
}

/**
 * 🛠️ PARSER ENGINE (Matches your JSON Structure Exactly)
 */
function parseTimetableStrict(text: string) {
  const rows: any[] = [];
  const lines = text.split(/\r?\n/);
  
  // Regex to capture times (supports 5.30, 5:30, 12.30/1.30)
  const TIME = `(\\d{1,2}[:.]\\d{2}(?:\\s*\\/\\s*\\d{1,2}[:.]\\d{2})?)`;

  const rowRegex = new RegExp(
    `^\\s*(\\d{1,2})\\s+([A-Za-z]{3})\\s+` + // Date, Day
      `${TIME}\\s+${TIME}\\s+${TIME}\\s+` + // FajrStart, FajrJamaat, Sunrise (Ignore)
      `${TIME}\\s+${TIME}\\s+${TIME}\\s+` + // Dhahwa (Ignore), DhuharStart, DhuharJamaat
      `${TIME}\\s+${TIME}\\s+${TIME}\\s+` + // AsrStart, AsrJamaat, MaghribStart
      `${TIME}\\s+${TIME}`                   // IshaStart, IshaJamaat
  );

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Skip headers
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("date") || lower.startsWith("day") || lower.startsWith("begins")) continue;

    const match = trimmed.match(rowRegex);
    if (match) {
      // Map regex groups to variables
      // match[0] is full string
      // match[1]=Date, match[2]=Day
      // match[3]=FajrStart, match[4]=FajrJam
      // match[5]=Sunrise (Skipping for JSON), match[6]=Dhahwa (Skipping)
      // match[7]=DhuharStart, match[8]=DhuharJam
      // match[9]=AsrStart, match[10]=AsrJam
      // match[11]=MaghribStart, match[12]=IshaStart, match[13]=IshaJam (Wait, check counts)
      
      const [
        _, date, day, 
        fStart, fJam, 
        sur, // Ignored in output
        dha, // Ignored in output
        dStart, dJam, 
        aStart, aJam, 
        mStart, // Maghrib usually has 1 time or start=jamaat
        iStart, iJam
      ] = match;

      // Create the object exactly as you requested
      rows.push({
        asr: { 
          start: normalizeTime(aStart), 
          jamaat: normalizeTime(aJam) 
        },
        day: day.toUpperCase(),
        date: parseInt(date),
        fajr: { 
          start: normalizeTime(fStart), 
          jamaat: normalizeTime(fJam) 
        },
        isha: { 
          start: normalizeTime(iStart), 
          jamaat: normalizeTime(iJam) 
        },
        dhuhar: { 
          start: normalizeTime(dStart), 
          jamaat: normalizeTime(dJam) 
        },
        maghrib: { 
          start: normalizeTime(mStart), 
          jamaat: normalizeTime(mStart) // Maghrib jamaat usually same as start
        }
      });
    }
  }
  return rows;
}

/**
 * 🛡️ VALIDATION
 */
function validateTimetableLogic(rows: any[], year: number, monthInput: string | number) {
  const monthIndex = typeof monthInput === "number" ? monthInput - 1 : 
    ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
    .indexOf(String(monthInput).toLowerCase());

  const expectedDays = new Date(year, monthIndex + 1, 0).getDate();

  if (rows.length !== expectedDays) {
    throw new Error(`Row count mismatch: Expected ${expectedDays}, found ${rows.length}.`);
  }
  console.log("✅ Logic Validated.");
}

function normalizeTime(raw: string): string {
  if (!raw) return "";
  if (raw.includes("/")) return raw.split("/").map(t => normalizeTime(t.trim())).join("/");
  const [h, m] = raw.replace(".", ":").split(":");
  return `${h.padStart(2, "0")}.${m}`; // Using dot . matches your JSON format
}