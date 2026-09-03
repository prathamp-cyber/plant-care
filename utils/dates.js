/**
 * Format a Date object into a local 'YYYY-MM-DD' date string.
 * @param {Date} [d=new Date()] 
 * @returns {string} Local date string e.g. "2026-09-03"
 */
export const getTodayLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Add a specified number of days to a local 'YYYY-MM-DD' date string.
 * @param {string} dateStr Local date string "YYYY-MM-DD"
 * @param {number|string} days Number of days to add
 * @returns {string} New local date string "YYYY-MM-DD"
 */
export const addDaysToLocalDateString = (dateStr, days) => {
  if (!dateStr) return getTodayLocalDateString();
  const parts = dateStr.split("-");
  if (parts.length !== 3) return getTodayLocalDateString();

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const localDate = new Date(year, month, day);
  localDate.setDate(localDate.getDate() + parseInt(days, 10));

  return getTodayLocalDateString(localDate);
};

/**
 * Calculate the number of days left from today until a target 'YYYY-MM-DD' date.
 * Positive = future, 0 = today, Negative = overdue.
 * @param {string} nextWaterDateStr Local date string "YYYY-MM-DD"
 * @returns {number} Days difference
 */
export const calculateDaysLeft = (nextWaterDateStr) => {
  if (!nextWaterDateStr) return 0;
  
  // Handle ISO string fallback if legacy ISO format exists
  let formattedDateStr = nextWaterDateStr;
  if (nextWaterDateStr.includes("T")) {
    formattedDateStr = nextWaterDateStr.split("T")[0];
  }

  const todayStr = getTodayLocalDateString();
  if (formattedDateStr === todayStr) return 0;

  const partsToday = todayStr.split("-");
  const partsNext = formattedDateStr.split("-");
  if (partsToday.length !== 3 || partsNext.length !== 3) return 0;

  const today = new Date(
    parseInt(partsToday[0], 10),
    parseInt(partsToday[1], 10) - 1,
    parseInt(partsToday[2], 10)
  );
  const next = new Date(
    parseInt(partsNext[0], 10),
    parseInt(partsNext[1], 10) - 1,
    parseInt(partsNext[2], 10)
  );

  const diffMs = next.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Convert a local 'YYYY-MM-DD' string to a Date object set to 9:00:00 AM local time.
 * @param {string} dateStr Local date string "YYYY-MM-DD"
 * @returns {Date} Date object set to 9:00 AM local time
 */
export const parseLocalDateStringTo9AM = (dateStr) => {
  if (!dateStr) return new Date();
  
  let formattedDateStr = dateStr;
  if (dateStr.includes("T")) {
    formattedDateStr = dateStr.split("T")[0];
  }

  const parts = formattedDateStr.split("-");
  if (parts.length !== 3) return new Date();

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  return new Date(year, month, day, 9, 0, 0);
};
