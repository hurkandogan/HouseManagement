import { google } from "googleapis";
import { getPropertyById } from "@/app/actions/properties";

export type SheetExpenseItem = {
  propertyId: string;
  date: string;
  vendor?: string | null;
  title: string; // description
  amount: number; // total
  documentUrl?: string | null; // link
};

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  const cleanDate = dateStr.split("T")[0];
  const parts = cleanDate.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, "0")}.${month.padStart(2, "0")}.${year}`;
  }
  return dateStr;
}

export async function appendExpenseToGoogleSheet(expense: SheetExpenseItem) {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      console.warn("GOOGLE_SHEET_ID is not configured. Skipping Google Sheet append.");
      return { success: false, error: "GOOGLE_SHEET_ID not set" };
    }

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!clientEmail || !privateKey) {
      console.warn("Firebase credentials missing for Google Sheets auth.");
      return { success: false, error: "Credentials missing" };
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Fetch property name if propertyId exists
    let propertyName = "General / Unassigned";
    if (expense.propertyId) {
      const prop = await getPropertyById(expense.propertyId);
      if (prop?.name) {
        propertyName = prop.name;
      }
    }

    const formattedDate = formatDateDDMMYYYY(expense.date);
    const linkValue = expense.documentUrl || "";

    const rowData = [
      propertyName,           // immobilien
      formattedDate,          // date (DD.MM.YYYY)
      expense.vendor || "",   // vendor
      expense.title || "",    // description
      expense.amount || 0,    // total
      linkValue               // link
    ];

    // Find the first empty row inside the formatted table
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A1:F500",
    });

    const existingRows = getRes.data.values || [];
    let targetRowIndex = -1;

    // Row 1 is header (index 0). Look starting from index 1 (Row 2 in Sheet)
    for (let i = 1; i < existingRows.length; i++) {
      const row = existingRows[i];
      const isEmpty = !row || row.length === 0 || row.every((cell: string) => !cell || String(cell).trim() === "");
      if (isEmpty) {
        targetRowIndex = i + 1; // 1-based row index in Google Sheets
        break;
      }
    }

    if (targetRowIndex !== -1) {
      // Fill the first empty row inside table
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `A${targetRowIndex}:F${targetRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });
      console.log(`Successfully updated row ${targetRowIndex} in Google Sheet:`, rowData);
    } else {
      // Append to bottom if table has no pre-allocated empty rows
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });
      console.log("Successfully appended new row to Google Sheet:", rowData);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating Google Sheet:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
