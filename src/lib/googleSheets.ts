// ═══════════════════════════════════════════════════════════════
// Google Sheets Integration — Auto-sync orders to accounting spreadsheet
// ═══════════════════════════════════════════════════════════════

import { google } from 'googleapis';

// ─── Configuration ───────────────────────────────────────────

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1lafcY4tTgXCHj1BHxQGrN7FChwMBYCdE7G0oM7Zkk1Y';

// Column mapping based on the actual sheet layout:
// A: วัน/เดือน/ปี (Date)
// B-C (merged): รายการ (Item description)
// D: รายรับ (บาท) (Revenue)
// E-G (merged): รายจ่าย - ซื้อสินค้า (Purchase expense)
// H-N (merged): ค่าใช้จ่ายอื่น (Other expenses like shipping)
// O: หมายเหตุ (Notes / Customer name)

const COLS = {
  DATE: 0,        // B (วัน เดือน ปี)
  ITEM: 1,        // C (รายการ)
  REVENUE: 2,     // D (รายรับ)
  PURCHASE: 3,    // E (ซื้อสินค้า)
  OTHER_EXP: 12,  // N (ค่าใช้จ่ายอื่น / ค่าส่ง)
  NOTES: 13,      // O (ชื่อเฟสคนซื้อ / หมายเหตุ)
};

const DATA_START_ROW = 8; // Row 8 is where data starts (after headers)

// ─── Thai Month Names ────────────────────────────────────────

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/**
 * Get Thai month sheet name for a given date
 * e.g., April 2026 → "เม.ย.69" (2569 BE, abbreviated to "69")
 */
function getSheetName(date: Date): string {
  const month = date.getMonth(); // 0-based
  const yearBE = date.getFullYear() + 543;
  const yearShort = String(yearBE).slice(-2); // "69" for 2569
  return `${THAI_MONTHS[month]}${yearShort}`;
}

/**
 * Format date as D/M/YYYY for Google Sheets
 */
function formatDate(date: Date): string {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// ─── Auth ────────────────────────────────────────────────────

function getGoogleAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.HDG_SHEET_MAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY || process.env.HDG_SHEET_DATA;

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY environment variables. ' +
      'Please set up a Google Service Account and add credentials to .env'
    );
  }

  // Handle escaped newlines in private key or base64 encoded payload
  let formattedKey = privateKey.replace(/\\n/g, '\n');
  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    try {
      formattedKey = Buffer.from(privateKey, 'base64').toString('utf8').replace(/\\n/g, '\n');
    } catch(e) {}
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: formattedKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// ─── Core Functions ──────────────────────────────────────────

/**
 * Find the "รวม" (total) row — this is the footer boundary.
 * Data must NEVER be written at or below this row.
 * Returns -1 if not found.
 */
async function findFooterRow(
  sheets: ReturnType<typeof google.sheets>,
  sheetName: string
): Promise<number> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:C300`,
    });

    const values = response.data.values || [];
    for (let i = 0; i < values.length; i++) {
      const row = values[i] || [];
      for (const cell of row) {
        if (String(cell).trim() === 'รวม') {
          return i + 1; // 1-indexed row number
        }
      }
    }

    return -1; // Not found
  } catch {
    return -1;
  }
}

/**
 * Get the internal Sheet ID (gid) by sheet tab name.
 * Needed for insertDimension API.
 */
async function getSheetIdByName(
  sheets: ReturnType<typeof google.sheets>,
  sheetName: string
): Promise<number | null> {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheet = (spreadsheet.data.sheets || []).find(
      (s) => s.properties?.title === sheetName
    );
    return sheet?.properties?.sheetId ?? null;
  } catch {
    return null;
  }
}

/**
 * Smart data insertion — respects the footer boundary.
 *
 * Strategy:
 * 1. Find "รวม" row as the boundary
 * 2. Scan rows 8 to (รวม - 1) for empty space
 * 3. If empty rows available → write there
 * 4. If no space → INSERT new rows before "รวม" → write there
 *
 * This ensures data NEVER overwrites the footer (สรุป, คำอธิบาย).
 * SUM formulas in "รวม" auto-expand when rows are inserted above.
 */
function parseDateStr(str: string): number {
  if (!str) return 0;
  const parts = str.trim().split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d).getTime();
  }
  return 0;
}

/**
 * Inserts rows exactly chronologically by date.
 * Does NOT use sorting, it literally inserts rows at the exact index.
 */
async function insertChronologically(
  sheets: ReturnType<typeof google.sheets>,
  sheetName: string,
  rows: (string | number)[][],
  orderDate: Date
): Promise<number> {
  const footerRow = await findFooterRow(sheets, sheetName);
  const scanEnd = footerRow !== -1 ? footerRow - 1 : 300;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!B${DATA_START_ROW}:B${scanEnd}`
  });

  const values = response.data.values || [];
  const targetTime = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime();

  let insertRelativeIdx = 0;
  
  for (let i = 0; i < values.length; i++) {
    const val = values[i] ? String(values[i][0]).trim() : '';
    if (!val) {
      insertRelativeIdx = i;
      break;
    }
    const rowTime = parseDateStr(val);
    if (!rowTime || rowTime <= targetTime) {
      insertRelativeIdx = i + 1; // Insert AFTER this row
    } else {
      break; // Found our exact chronological spot BEFORE this row!
    }
  }

  const insertAbsRow = DATA_START_ROW + insertRelativeIdx; 
  const sheetId = await getSheetIdByName(sheets, sheetName);
  if (sheetId === null) throw new Error(`Cannot find sheet ID for "${sheetName}"`);

  // Are we inserting in the middle of existing active rows?
  const isInsertingInMiddle = insertRelativeIdx < values.length && String(values[insertRelativeIdx]?.[0] || '').trim() !== '';

  if (isInsertingInMiddle) {
    // Insert new rows physically pushing data down
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: insertAbsRow - 1, // 0-indexed
                endIndex: insertAbsRow - 1 + rows.length
              },
              inheritFromBefore: insertAbsRow > DATA_START_ROW
            }
          }
        ]
      }
    });

  } else {
    // Appending to empty space
    if (footerRow !== -1) {
      const emptySpace = footerRow - insertAbsRow;
      if (emptySpace < rows.length) {
        const numNewRows = rows.length - emptySpace; 
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                insertDimension: {
                  range: {
                    sheetId: sheetId,
                    dimension: 'ROWS',
                    startIndex: footerRow - 1,
                    endIndex: footerRow - 1 + Math.max(numNewRows, 1)
                  },
                  inheritFromBefore: true
                }
              }
            ]
          }
        });
      }
    }
  }

  // Update the data exactly at the insertion spot
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!B${insertAbsRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows }
  });

  console.log(`📊 Chronologically inserted ${rows.length} rows at row ${insertAbsRow} in "${sheetName}"`);
  return insertAbsRow;
}

/**
 * Check if a sheet tab exists, create it if not.
 * Uses an existing month tab as a TEMPLATE — copies it to preserve:
 * ✅ Headers (ส่วนหัว)
 * ✅ Footer summary (สรุป รายรับ-จ่าย, คำอธิบาย)
 * ✅ Formatting, merged cells, colors, formulas
 * Then clears the data area and updates the month name.
 */
async function ensureSheetTab(
  sheets: ReturnType<typeof google.sheets>,
  sheetName: string
): Promise<void> {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const allSheets = spreadsheet.data.sheets || [];
    const sheetExists = allSheets.some(
      (s) => s.properties?.title === sheetName
    );

    if (sheetExists) return; // Already exists

    // ─── Strategy: Copy from existing month tab as template ───
    const templateSheet = allSheets.find((s) => {
      const title = s.properties?.title || '';
      // Find any month sheet (ม.ค.XX, ก.พ.XX, etc.)
      return THAI_MONTHS.some((m) => title.startsWith(m));
    });

    if (templateSheet && templateSheet.properties?.sheetId !== undefined) {
      const sourceTitle = templateSheet.properties.title || '';

      // 1. Duplicate the template sheet
      const copyResult = await sheets.spreadsheets.sheets.copyTo({
        spreadsheetId: SPREADSHEET_ID,
        sheetId: templateSheet.properties.sheetId as number,
        requestBody: {
          destinationSpreadsheetId: SPREADSHEET_ID,
        },
      });

      const newSheetId = (copyResult as any).data?.sheetId;

      // 2. Rename the copied sheet from "Copy of ..." to the target name
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: newSheetId,
                  title: sheetName,
                },
                fields: 'title',
              },
            },
          ],
        },
      });

      // 3. Clear data rows: find "รวม" in copied sheet, clear rows 8 to (รวม - 1)
      const footerRow = await findFooterRow(sheets, sheetName);
      const clearEnd = footerRow > DATA_START_ROW ? footerRow - 1 : 200;
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A${DATA_START_ROW}:O${clearEnd}`,
      });

      // 4. Update the "สรุป ประจำเดือน ..." text to reflect the new month
      try {
        const allValues = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${sheetName}'!A1:O300`,
        });

        const values = allValues.data.values || [];
        for (let i = 0; i < values.length; i++) {
          if (!values[i]) continue;
          for (let j = 0; j < values[i].length; j++) {
            const cellValue = String(values[i][j] || '');
            // Find cells containing the source month name and replace
            if (cellValue.includes('ประจำเดือน') && cellValue.includes(sourceTitle)) {
              const newValue = cellValue.replace(sourceTitle, sheetName);
              const col = String.fromCharCode(65 + j); // A=65, B=66, ...
              await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `'${sheetName}'!${col}${i + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[newValue]] },
              });
            }
          }
        }
      } catch (updateErr) {
        console.warn('📊 Could not update month name in summary (non-critical):', updateErr);
      }

      console.log(`📊 Created new sheet tab "${sheetName}" from template "${sourceTitle}" (with headers, footer & formatting)`);
    } else {
      // ─── Fallback: Create from scratch (basic headers only) ───
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            ['รายงานเงินสดรับ - จ่าย'],
            ['ชื่อผู้ประกอบกิจการ', '', process.env.NEXT_PUBLIC_SHOP_NAME || 'ร้านค้า', '', '', '', '', 'เลขประจำตัวประชาชน'],
            [],
            ['ชื่อสถานประกอบการ', '', process.env.NEXT_PUBLIC_SHOP_NAME || 'ร้านค้า', '', '', '', '', 'เลขประจำตัวผู้เสียภาษีอากร'],
            [],
            ['วัน/เดือน/ปี', '', 'รายการ', 'รายรับ\n(บาท)', 'รายจ่าย (บาท)', '', '', '', '', 'ค่าใช้จ่ายอื่น', '', '', '', '', 'หมายเหตุ'],
            ['', '', '', '', 'ซื้อสินค้า'],
          ],
        },
      });

      console.log(`📊 Created new sheet tab "${sheetName}" (basic — no template found)`);
    }
  } catch (error) {
    console.error(`Error ensuring sheet tab ${sheetName}:`, error);
    throw error;
  }
}

// ─── Order Types ─────────────────────────────────────────────

export interface SheetOrderItem {
  name: string;
  variant?: string;
  quantity: number;
  price: number;
}

export interface SheetOrderData {
  orderNumber: string;
  orderDate: Date;
  customerName: string;
  items: SheetOrderItem[];
  shippingCost: number;
  total: number;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Append a single order to Google Sheets
 * Each item becomes a row, shipping cost is a separate row
 */
export async function appendOrderToSheet(order: SheetOrderData): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const sheetName = getSheetName(order.orderDate);
    const dateStr = formatDate(order.orderDate);

    // Ensure the month tab exists
    await ensureSheetTab(sheets, sheetName);

    // Build rows to append
    const rows: (string | number)[][] = [];

    // Add each item as a row
    for (const item of order.items) {
      const itemName = item.variant
        ? `${item.name} ลาย ${item.variant}`
        : item.name;
      const itemTotal = item.price * item.quantity;

      const row: (string | number)[] = new Array(COLS.NOTES + 1).fill('');
      row[COLS.DATE] = dateStr;
      row[COLS.ITEM] = itemName;
      row[COLS.REVENUE] = itemTotal;
      row[COLS.NOTES] = `${order.customerName} [${order.orderNumber}]`;
      rows.push(row);
    }

    // Add shipping cost as a separate row (if > 0)
    if (order.shippingCost > 0) {
      const shippingRow: (string | number)[] = new Array(COLS.NOTES + 1).fill('');
      shippingRow[COLS.DATE] = dateStr;
      shippingRow[COLS.ITEM] = 'ค่าส่งพัสดุ';
      shippingRow[COLS.OTHER_EXP] = order.shippingCost;
      shippingRow[COLS.NOTES] = `${order.customerName} [${order.orderNumber}]`;
      rows.push(shippingRow);
    }

    // Chronological exact insert (no auto-sort)
    const insertedAt = await insertChronologically(sheets, sheetName, rows, order.orderDate);

    console.log(`📊 Synced order ${order.orderNumber} to Google Sheets (${sheetName}, row ${insertedAt}, ${rows.length} rows)`);
    return { success: true };
  } catch (error: any) {
    console.error('📊 Google Sheets sync error:', error?.message || error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * Read all existing order numbers already written in a sheet tab
 * by scanning the Notes column (O) for "[ORD-xxx]" patterns.
 */
async function getExistingOrderNumbers(
  sheets: ReturnType<typeof google.sheets>,
  sheetName: string
): Promise<Set<string>> {
  try {
    const footerRow = await findFooterRow(sheets, sheetName);
    const scanEnd = footerRow !== -1 ? footerRow - 1 : 300;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!O${DATA_START_ROW}:O${scanEnd}`,
    });
    const values = response.data.values || [];
    const existing = new Set<string>();
    for (const row of values) {
      const cell = String(row?.[0] || '');
      const match = cell.match(/\[(ORD-[^\]]+)\]/);
      if (match) existing.add(match[1]);
    }
    return existing;
  } catch {
    return new Set<string>();
  }
}

/**
 * Sync multiple orders to Google Sheets (for bulk/initial sync)
 * Groups orders by month, skipping already-synced orders.
 */
export async function syncOrdersToSheet(orders: SheetOrderData[]): Promise<{
  success: boolean;
  synced: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  // Sort orders by date
  const sorted = [...orders].sort(
    (a, b) => a.orderDate.getTime() - b.orderDate.getTime()
  );

  // Group by month
  const byMonth = new Map<string, SheetOrderData[]>();
  for (const order of sorted) {
    const sheetName = getSheetName(order.orderDate);
    if (!byMonth.has(sheetName)) {
      byMonth.set(sheetName, []);
    }
    byMonth.get(sheetName)!.push(order);
  }

  // Process each month
  const entries = Array.from(byMonth.entries());
  for (const [sheetName, monthOrders] of entries) {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });

      await ensureSheetTab(sheets, sheetName);

      // Read existing orders ONCE per sheet to deduplicate
      const existingOrderNumbers = await getExistingOrderNumbers(sheets, sheetName);

      for (const order of monthOrders) {
        // Skip if already in sheet
        if (existingOrderNumbers.has(order.orderNumber)) {
          console.log(`📊 Skipping duplicate ${order.orderNumber} (already in ${sheetName})`);
          skipped++;
          continue;
        }
        const dateStr = formatDate(order.orderDate);
        const orderRows: (string | number)[][] = [];

        for (const item of order.items) {
          const itemName = item.variant
            ? `${item.name} ลาย ${item.variant}`
            : item.name;
          const itemTotal = item.price * item.quantity;

          const row: (string | number)[] = new Array(COLS.NOTES + 1).fill('');
          row[COLS.DATE] = dateStr;
          row[COLS.ITEM] = itemName;
          row[COLS.REVENUE] = itemTotal;
          row[COLS.NOTES] = `${order.customerName} [${order.orderNumber}]`;
          orderRows.push(row);
        }

        if (order.shippingCost > 0) {
          const shippingRow: (string | number)[] = new Array(COLS.NOTES + 1).fill('');
          shippingRow[COLS.DATE] = dateStr;
          shippingRow[COLS.ITEM] = 'ค่าส่งพัสดุ';
          shippingRow[COLS.OTHER_EXP] = order.shippingCost;
          shippingRow[COLS.NOTES] = `${order.customerName} [${order.orderNumber}]`;
          orderRows.push(shippingRow);
        }

        synced++;
        
        if (orderRows.length > 0) {
          await insertChronologically(sheets, sheetName, orderRows, order.orderDate);
          existingOrderNumbers.add(order.orderNumber); // Prevent double-write within same run
        }
      }

      console.log(`📊 Bulk synced ${monthOrders.length} orders to ${sheetName} chronologically`);
    } catch (error: any) {
      errors.push(`${sheetName}: ${error?.message || 'Unknown error'}`);
    }
  }

  return { success: errors.length === 0, synced, skipped, errors };
}

/**
 * Check if Google Sheets credentials are configured
 */
export function isSheetsConfigured(): boolean {
  return !!((process.env.GOOGLE_CLIENT_EMAIL || process.env.HDG_SHEET_MAIL) && (process.env.GOOGLE_PRIVATE_KEY || process.env.HDG_SHEET_DATA));
}
