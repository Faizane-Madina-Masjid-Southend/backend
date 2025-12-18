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

    // Fallback logic: New Image > Existing Image > Null
    // @ts-ignore
    const rawImageInput = data.timetableImage || (entry.timetableImage ? entry.timetableImage : null);

    if (rawImageInput) {
      // Merge Year/Month for validation
      data.year = data.year || entry.year;
      data.month = data.month || entry.month;

      await processTimetable(rawImageInput, data);
    }
  },
};

/**
 * 🧠 SHARED PROCESSOR
 */
async function processTimetable(imageInput: any, dataState: any) {
  try {
    // 1. SAFELY EXTRACT ID (The Fix)
    // Sometimes Strapi sends just "5", sometimes "{ id: 5, ... }"
    const fileId = getFileId(imageInput);

    if (!fileId) {
      console.warn("⚠️ OCR Parser: Skipped. No valid file ID found.");
      return;
    }

    console.log(`👁️ OCR Parser: Fetching file info for ID ${fileId}...`);

    // @ts-ignore
    const file = await strapi.entityService.findOne("plugin::upload.file", fileId);
    
    if (!file) {
      console.error(`❌ File with ID ${fileId} not found in database.`);
      return;
    }

    // @ts-ignore
    const uploadDir = path.join(strapi.dirs.static.public, "uploads");
    const fullPath = path.join(uploadDir, file.hash + file.ext);

    if (fs.existsSync(fullPath)) {
      console.log(`Processing PDF at ${fullPath}...`);

      // 2. PDF -> Image
      const tempImgPrefix = path.join("/tmp", `timetable-${Date.now()}`);
      try {
        execSync(`pdftoppm -png -r 300 "${fullPath}" "${tempImgPrefix}"`);
      } catch (e: any) {
        throw new Error("Failed to convert PDF. Is poppler-utils installed?");
      }

      // 3. OCR
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

      // 4. Parse
      const parsedRows = parseTimetableStrict(rawText);
      console.log(`🔒 Extracted Rows: ${parsedRows.length}`);

      // 5. Validate Logic
      if (dataState.year && dataState.month) {
        validateTimetableLogic(parsedRows, dataState.year, dataState.month);
      } else {
        console.warn("⚠️ Skipping Logic Validation: Missing Year/Month.");
      }

      // 6. SANITIZE & SAVE
      const cleanJson = JSON.parse(JSON.stringify(parsedRows));
      console.log("💾 Saving Sanitized JSON data...");
      dataState.prayerData = cleanJson;
    } else {
      console.error("❌ File not found on disk at:", fullPath);
    }
  } catch (err: any) {
    console.error("❌ OCR Error:", err.message);
    throw new Error(err.message);
  }
}

/**
 * 🛠️ HELPER: Safe ID Extraction
 */
function getFileId(input: any): string | number | null {
  if (!input) return null;
  if (typeof input === "string" || typeof input === "number") return input;
  if (typeof input === "object") {
    if (input.id) return input.id; // Handle { id: 5 }
    // Handle array case (rare but possible in some relations)
    if (Array.isArray(input) && input.length > 0) return getFileId(input[0]);
  }
  return null;
}

/**
 * 🛠️ PARSER ENGINE (Strict JSON Structure)
 */
function parseTimetableStrict(text: string) {
  const rows: any[] = [];
  const lines = text.split(/\r?\n/);
  const TIME = `(\\d{1,2}[:.]\\d{2}(?:\\s*\\/\\s*\\d{1,2}[:.]\\d{2})?)`;

  const rowRegex = new RegExp(
    `^\\s*(\\d{1,2})\\s+([A-Za-z]{3})\\s+` +
      `${TIME}\\s+${TIME}\\s+${TIME}\\s+` +
      `${TIME}\\s+${TIME}\\s+${TIME}\\s+` +
      `${TIME}\\s+${TIME}\\s+${TIME}\\s+` +
      `${TIME}\\s+${TIME}`
  );

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("date") || lower.startsWith("day") || lower.startsWith("begins")) continue;

    const match = trimmed.match(rowRegex);
    if (match) {
      const [_, date, day, f1, f2, sur, dh, d1, d2, a1, a2, m1, m2, i1, i2] = match; // eslint-disable-line
      rows.push({
        asr: { start: normalizeTime(a1), jamaat: normalizeTime(a2) },
        day: day.toUpperCase(),
        date: parseInt(date),
        fajr: { start: normalizeTime(f1), jamaat: normalizeTime(f2) },
        isha: { start: normalizeTime(i1), jamaat: normalizeTime(i2) },
        dhuhar: { start: normalizeTime(d1), jamaat: normalizeTime(d2) },
        maghrib: { start: normalizeTime(m1), jamaat: normalizeTime(m1) } // Maghrib jam=start usually
      });
    }
  }
  return rows;
}

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
  return `${h.padStart(2, "0")}.${m}`;
}