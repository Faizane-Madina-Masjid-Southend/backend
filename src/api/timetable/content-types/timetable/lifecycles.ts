import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export default {
  async beforeCreate(event) {
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;

    try {
      // 1. Fetch entry to get File + Month + Year
      // @ts-ignore
      const entry = await strapi.entityService.findOne(
        "api::timetable.timetable",
        where.id,
        { populate: ["timetableImage"] }
      );
      // @ts-ignore
      if (entry && entry.timetableImage) {
        
        const uploadDir = path.join(strapi.dirs.static.public, "uploads");
        // @ts-ignore
        const fileName = entry.timetableImage.hash + entry.timetableImage.ext;
        const fullPath = path.join(uploadDir, fileName);

        if (fs.existsSync(fullPath)) {
          console.log(`👁️ OCR Parser: Processing ${entry.month} ${entry.year}...`);

          // --- STEP A: Convert PDF to High-Res Image ---
          const tempImgPrefix = path.join("/tmp", `timetable-${Date.now()}`);
          try {
            // -r 300: High DPI is crucial for strict regex
            execSync(`pdftoppm -png -r 300 "${fullPath}" "${tempImgPrefix}"`);
          } catch (e: any) {
            throw new Error("Failed to convert PDF. Is poppler-utils installed?");
          }

          // --- STEP B: Tesseract OCR ---
          const imgPath = `${tempImgPrefix}-1.png`;
          let rawText = "";

          if (fs.existsSync(imgPath)) {
            try {
              // --psm 6: Assume a single uniform block of text
              rawText = execSync(`tesseract "${imgPath}" stdout --psm 6`, {
                encoding: "utf8",
              });
            } catch (e: any) {
              throw new Error("Failed to run OCR. Is tesseract-ocr installed?");
            } finally {
              if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            }
          } else {
            throw new Error("Could not generate image from PDF.");
          }

          // --- STEP C: Strict Parsing ---
          const parsedRows = parseTimetableStrict(rawText);

          console.log(`🔒 Extracted Rows: ${parsedRows.length}`);

          // --- STEP D: Deep Logic Validation ---
          // Pass the year and month from the entry to ensure exact day counts
          validateTimetableLogic(parsedRows, entry.year, entry.month);

          // Success: Save data
          data.prayerData = parsedRows;
        }
      }
    } catch (err: any) {
      console.error("❌ Validation Error:", err.message);
      throw new Error(err.message);
    }
  },
};

/**
 * PARSER ENGINE (STRICT)
 */
function parseTimetableStrict(text: string) {
  const rows: any[] = [];
  const lines = text.split(/\r?\n/);

  // Strict Time Pattern: 1 or 2 digits, dot/colon, 2 digits
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
    if (lower.startsWith("date") || lower.startsWith("day") || lower.startsWith("begins")) {
      continue;
    }

    const match = trimmed.match(rowRegex);
    if (match) {
      const [
        _full,
        date,
        day,
        fajrStart,
        fajrJamaat,
        sunrise,
        dhahwa,
        dhuharStart,
        dhuharJamaat,
        asrStart,
        asrJamaat,
        maghrib,
        ishaStart,
        ishaJamaat,
      ] = match;

      rows.push({
        date: parseInt(date),
        day: day.toUpperCase(),
        fajr: { start: normalizeTime(fajrStart), jamaat: normalizeTime(fajrJamaat) },
        sunrise: normalizeTime(sunrise),
        dhuhar: { start: normalizeTime(dhuharStart), jamaat: normalizeTime(dhuharJamaat) },
        asr: { start: normalizeTime(asrStart), jamaat: normalizeTime(asrJamaat) },
        maghrib: { start: normalizeTime(maghrib), jamaat: normalizeTime(maghrib) },
        isha: { start: normalizeTime(ishaStart), jamaat: normalizeTime(ishaJamaat) },
      });
    }
  }
  return rows;
}

/**
 * LOGIC VALIDATOR
 */
function validateTimetableLogic(rows: any[], year: number, monthInput: string | number) {
  const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  // 1. Calculate Expected Days for this specific Month/Year
  const monthIndex = getMonthIndex(monthInput);
  const expectedDays = new Date(year, monthIndex + 1, 0).getDate();

  if (rows.length !== expectedDays) {
    throw new Error(
      `Validation Failed: ${getMonthName(monthIndex)} ${year} has ${expectedDays} days, but OCR found ${rows.length} valid rows.`
    );
  }

  // 2. Validate Sequence
  let prevDate = rows[0].date;

  if (prevDate !== 1) console.warn("Warning: Timetable does not start on Date 1.");

  let prevDayIndex = DAYS.indexOf(rows[0].day);
  if (prevDayIndex === -1) throw new Error(`Invalid Day format in row 1: ${rows[0].day}`);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const currentDayIndex = DAYS.indexOf(row.day);

    // Date Sequence (1 -> 2)
    if (row.date !== prevDate + 1) {
      throw new Error(`Logic Error: Date jumped from ${prevDate} to ${row.date}.`);
    }

    // Day Sequence (Mon -> Tue)
    const expectedDayIndex = (prevDayIndex + 1) % 7;
    if (currentDayIndex !== expectedDayIndex) {
      throw new Error(
        `Logic Error on Date ${row.date}: Expected ${DAYS[expectedDayIndex]}, but found ${row.day}.`
      );
    }

    prevDate = row.date;
    prevDayIndex = currentDayIndex;
  }
  
  console.log("✅ Logic Validation Passed: Perfect Match.");
}

function normalizeTime(raw: string): string {
  if (raw.includes("/")) {
    return raw.split("/").map(t => normalizeTime(t.trim())).join(" / ");
  }
  const clean = raw.replace(".", ":");
  const [h, m] = clean.split(":");
  return `${h.padStart(2, "0")}:${m}`;
}

function getMonthIndex(month: string | number): number {
  if (typeof month === "number") return month - 1; 
  const map: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };
  return map[month.toLowerCase()] ?? 0;
}

function getMonthName(index: number) {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return months[index];
}