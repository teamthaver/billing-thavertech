"use server"

import { GST } from "../config/gst";
import db from "../dbPool";
import { getCurrentUserSafe } from "../sessionCheck";
import { InvoiceApiResponse, InvoiceData, InvoiceItem } from "../types/dataTypes";
import { RowDataPacket } from "mysql2";

interface CreditStatsResult extends RowDataPacket {
  total_credit: number | null;
  pending_amount: number | null;
  paid_amount: number | null;
}

const allowedRoles = ["admin", "accounts"];

// Row name in the `sequence` table used for credit note numbering
const SEQUENCE_NAME = "credit_note";
const PREFIX = "TTPL/CN";

const round = (val: number) => Math.round(val * 100) / 100;

const checkAuth = async () => {
  const session = await getCurrentUserSafe();
  if (!session?.id || session.iss !== "thaverTechInvoiceGenerator") return false;
  if (!allowedRoles.includes(session.role)) return false;
  return true;
};

// item.service comes as { value } on create and as a string on edit
const getServiceName = (item: InvoiceItem): string | undefined => {
  const s: any = (item as any).service;
  if (!s) return undefined;
  return typeof s === "string" ? s : s.value;
};

/* ------------------------------------------------------------------ */
/* Shared: resolve services + compute totals                           */
/* ------------------------------------------------------------------ */

const buildItems = async (
  conn: any,
  items: InvoiceItem[],
  isGST: boolean,
  isIGST: boolean,
  rates: { IGST: number; CGST: number; SGST: number }
) => {
  let subTotal = 0;
  let totalIGST = 0, totalCGST = 0, totalSGST = 0;
  const rows: any[] = [];

  for (const item of items) {
    let serviceId = item.serviceId;
    const serviceName = getServiceName(item);

    if (!serviceId && serviceName) {
      const [found]: any = await conn.execute(
        `SELECT id FROM services WHERE hsn_code = ? AND name = ? LIMIT 1`,
        [item.hsn, serviceName]
      );

      if (found.length > 0) {
        serviceId = found[0].id;
      } else {
        const [result]: any = await conn.execute(
          `INSERT INTO services (name, hsn_code) VALUES (?, ?)`,
          [serviceName, item.hsn]
        );
        serviceId = result.insertId;
      }
    }

    if (!serviceId) throw new Error("Service ID missing for item");

    const cost = Number(item.cost);
    if (isNaN(cost)) throw new Error("Invalid item cost");

    let itemIGST = 0, itemCGST = 0, itemSGST = 0;
    subTotal += cost;

    if (isGST) {
      if (isIGST) {
        itemIGST = round((cost * rates.IGST) / 100);
      } else {
        itemCGST = round((cost * rates.CGST) / 100);
        itemSGST = round((cost * rates.SGST) / 100);
      }
      totalIGST += itemIGST;
      totalCGST += itemCGST;
      totalSGST += itemSGST;
    }

    rows.push([
      serviceId,
      cost,
      itemIGST,
      itemCGST,
      itemSGST,
      item.expiry || null,
      item.narration || null,
    ]);
  }

  return {
    rows,
    subTotal: round(subTotal),
    totalIGST: round(totalIGST),
    totalCGST: round(totalCGST),
    totalSGST: round(totalSGST),
  };
};

const resolveIGST = async (conn: any, clientId: number) => {
  const [company]: any = await conn.execute(`SELECT gst FROM companies LIMIT 1`);
  const companyGST = company[0]?.gst;
  if (!companyGST) throw new Error("Company GST not found");

  const [clientRows]: any = await conn.execute(
    `SELECT gst_number FROM clients WHERE id = ?`,
    [clientId]
  );
  const clientGST = clientRows[0]?.gst_number;
  if (!clientGST) throw new Error("GST required for taxable credit note");

  return companyGST.slice(0, 2) !== clientGST.slice(0, 2);
};

/* ------------------------------------------------------------------ */
/* Sequence                                                            */
/* ------------------------------------------------------------------ */

export const getNewCreditNoteNo = async () => {
  const conn = await db.getConnection();
  try {
    const [rows]: any = await conn.execute(
      `SELECT invoice_no FROM sequence WHERE name = ?`,
      [SEQUENCE_NAME]
    );

    const currentNo = rows[0]?.invoice_no;

    if (currentNo === undefined || currentNo === null) {
      return { success: false, message: "Failed to fetch current credit note no" };
    }

    return { success: true, invoiceNo: currentNo };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to fetch current credit note no" };
  } finally {
    conn.release();
  }
};

/* ------------------------------------------------------------------ */
/* Insert                                                              */
/* ------------------------------------------------------------------ */

export const insertCreditNote = async (
  data: InvoiceData,
  items: InvoiceItem[],
  custom_tax: number
) => {
  if (!(await checkAuth())) return { success: false, message: "Unauthorized" };
  if (!items.length) return { success: false, message: "No credit note items provided" };

  const conn = await db.getConnection();

  console.log("Inserting credit note:", data, items, custom_tax);

  try {
    await conn.beginTransaction();

    const invoiceString = data.invoiceId;

    const isGST = data.invoiceType === "GST";
    const isCustomTax = data.invoiceType === "CUSTOM_TAX";
    const isINR = data.currency === "INR";
    const isIGST = isGST ? await resolveIGST(conn, data.clientId) : false;

    const { rows, subTotal, totalIGST, totalCGST, totalSGST } = await buildItems(
      conn,
      items,
      isGST,
      isIGST,
      { IGST: GST.IGST, CGST: GST.CGST, SGST: GST.SGST }
    );

    const totalTax = round(
      isCustomTax ? (subTotal * custom_tax) / 100 : totalIGST + totalCGST + totalSGST
    );
    const grandTotal = round(subTotal + totalTax);

    const [result]: any = await conn.execute(
      `
      INSERT INTO credit_notes (
        client_id, client_name, client_gst_no, tax_number, client_address,
        client_phone, client_email, client_city, client_state, client_country,
        client_pincode,
        currency, dollar_rate, sub_total, total_tax, igst, cgst, sgst,
        igst_rate, cgst_rate, sgst_rate, custom_rate, grand_total,
        pono, podate, reference, invoice_id, type, invoice_date
      )
      SELECT
        c.id, c.company_name, c.gst_number, c.tax_number, c.address,
        c.phone, c.email, c.city, c.state, c.country, c.pincode,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM clients c
      WHERE c.id = ?
      `,
      [
        data.currency,
        data.dollar_rate ?? 0,
        subTotal,
        totalTax,
        totalIGST,
        totalCGST,
        totalSGST,
        isGST && isIGST && isINR ? GST.IGST : 0,
        isGST && !isIGST && isINR ? GST.CGST : 0,
        isGST && !isIGST && isINR ? GST.SGST : 0,
        isCustomTax ? custom_tax : 0,
        grandTotal,
        data.PONo || null,
        data.PODate || null,
        data.reference || null,
        invoiceString,
        data.invoiceType,
        data.invoiceDate,
        data.clientId, // WHERE c.id = ? — must stay last
      ]
    );

    if (!result.affectedRows) throw new Error("Client not found");

    const creditNoteId = result.insertId;

    await conn.query(
      `
      INSERT INTO credit_items (
        invoice_id, service_id, cost, igst, cgst, sgst, expiry, narration
      ) VALUES ?
      `,
      [rows.map((r) => [creditNoteId, ...r])]
    );

    await conn.commit();

    return { success: true, message: "Credit Note Generated", id: creditNoteId, invoiceId: invoiceString };
  } catch (error) {
    await conn.rollback();
    console.error(error);
    return { success: false, message: "Insert Failed" };
  } finally {
    conn.release();
  }
};

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

export const updateCreditNote = async (
  creditNoteId: number,
  data: InvoiceData,
  items: InvoiceItem[],
  custom_tax: number
) => {
  if (!(await checkAuth())) return { success: false, message: "Unauthorized" };
  if (!items.length) return { success: false, message: "No credit note items provided" };

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [existing]: any = await conn.execute(
      `SELECT status, cgst_rate, sgst_rate, igst_rate, custom_rate
       FROM credit_notes WHERE id = ? FOR UPDATE`,
      [creditNoteId]
    );

    if (!existing.length) {
      await conn.rollback();
      return { success: false, message: "Credit note not found" };
    }

    if (existing[0].status === "cancelled") {
      await conn.rollback();
      return { success: false, message: "Cancelled credit notes cannot be edited" };
    }

    const isGST = data.invoiceType === "GST";
    const isCustomTax = data.invoiceType === "CUSTOM_TAX";
    const isINR = data.currency === "INR";
    const isIGST = isGST ? await resolveIGST(conn, data.clientId) : false;

    // Keep the rates the note was created with; fall back to current GST config
    let IGST_RATE = Number(existing[0].igst_rate);
    let CGST_RATE = Number(existing[0].cgst_rate);
    let SGST_RATE = Number(existing[0].sgst_rate);

    if (isIGST && IGST_RATE === 0) IGST_RATE = GST.IGST;
    if (!isIGST && CGST_RATE === 0 && SGST_RATE === 0) {
      CGST_RATE = GST.CGST;
      SGST_RATE = GST.SGST;
    }

    const customRate = custom_tax ?? Number(existing[0].custom_rate);

    const { rows, subTotal, totalIGST, totalCGST, totalSGST } = await buildItems(
      conn,
      items,
      isGST,
      isIGST,
      { IGST: IGST_RATE, CGST: CGST_RATE, SGST: SGST_RATE }
    );

    const totalTax = round(
      isCustomTax ? (subTotal * customRate) / 100 : totalIGST + totalCGST + totalSGST
    );
    const grandTotal = round(subTotal + totalTax);

    await conn.execute(
      `
      UPDATE credit_notes SET
        currency = ?, dollar_rate = ?, sub_total = ?, total_tax = ?,
        igst = ?, cgst = ?, sgst = ?,
        igst_rate = ?, cgst_rate = ?, sgst_rate = ?, custom_rate = ?,
        grand_total = ?, pono = ?, podate = ?, reference = ?,
        type = ?, invoice_date = ?
      WHERE id = ?
      `,
      [
        data.currency,
        data.dollar_rate ?? 0,
        subTotal,
        totalTax,
        totalIGST,
        totalCGST,
        totalSGST,
        isGST && isIGST && isINR ? IGST_RATE : 0,
        isGST && !isIGST && isINR ? CGST_RATE : 0,
        isGST && !isIGST && isINR ? SGST_RATE : 0,
        isCustomTax ? customRate : 0,
        grandTotal,
        data.PONo || null,
        data.PODate || null,
        data.reference || null,
        data.invoiceType,
        data.invoiceDate,
        creditNoteId,
      ]
    );

    await conn.execute(`DELETE FROM credit_items WHERE invoice_id = ?`, [creditNoteId]);

    await conn.query(
      `
      INSERT INTO credit_items (
        invoice_id, service_id, cost, igst, cgst, sgst, expiry, narration
      ) VALUES ?
      `,
      [rows.map((r) => [creditNoteId, ...r])]
    );

    await conn.commit();

    return { success: true, message: "Credit Note Updated" };
  } catch (error) {
    await conn.rollback();
    console.error(error);
    return { success: false, message: "Update Failed" };
  } finally {
    conn.release();
  }
};

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

export const fetchAllCreditNotes = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string
) => {
  const conn = await db.getConnection();

  try {
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const safePage = Math.max(1, Number(page) || 1);
    const safeOffset = (safePage - 1) * safeLimit;

    const searchTerm = search ? `%${search}%` : `%`;

    let where = `WHERE (c.client_name LIKE ? OR c.invoice_id LIKE ?)`;
    const params: any[] = [searchTerm, searchTerm];

    if (status) {
      where += ` AND c.status = ?`;
      params.push(status);
    }

    const [rows]: any = await conn.execute(
      `
      SELECT
        c.id, c.invoice_id, c.client_id, c.client_name, c.client_gst_no,
        c.tax_number, c.client_email, c.client_phone, c.client_city,
        c.client_state, c.client_country, c.client_pincode, c.currency,
        c.sub_total, c.grand_total, c.created_at, c.invoice_date,
        c.status, c.reference,
        COUNT(ci.id) AS total_items
      FROM credit_notes c
      LEFT JOIN credit_items ci ON ci.invoice_id = c.id
      ${where}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
      `,
      params
    );

    // Count uses the same filters so pagination matches the results
    const [countResult]: any = await conn.execute(
      `SELECT COUNT(*) AS total FROM credit_notes c ${where}`,
      params
    );

    const total = Number(countResult[0].total);

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        totalPages: Math.ceil(total / safeLimit),
        currentPage: safePage,
        limit: safeLimit,
      },
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Fetch failed" };
  } finally {
    conn.release();
  }
};

/* ------------------------------------------------------------------ */
/* Single                                                              */
/* ------------------------------------------------------------------ */

export const fetchCreditNoteById = async (creditNoteId: number) => {
  const conn = await db.getConnection();

  try {
    const [rows]: any = await conn.execute(
      `
      SELECT JSON_OBJECT(
        'id', c.id,
        'invoiceId', c.invoice_id,
        'subTotal', c.sub_total,
        'igst', c.igst,
        'cgst', c.cgst,
        'sgst', c.sgst,
        'totalTax', c.total_tax,
        'igstRate', c.igst_rate,
        'cgstRate', c.cgst_rate,
        'sgstRate', c.sgst_rate,
        'customRate', c.custom_rate,
        'currency', c.currency,
        'dollarRate', c.dollar_rate,
        'poNo', c.pono,
        'poDate', c.podate,
        'reference', c.reference,
        'narration', c.narration,
        'status', c.status,
        'grandTotal', c.grand_total,
        'createdAt', c.created_at,
        'invoiceDate', c.invoice_date,
        'type', c.type,

        'client', JSON_OBJECT(
          'id', c.client_id,
          'companyName', c.client_name,
          'gstNumber', c.client_gst_no,
          'taxNumber', c.tax_number,
          'email', c.client_email,
          'phone', c.client_phone,
          'address', c.client_address,
          'city', c.client_city,
          'state', c.client_state,
          'country', c.client_country,
          'pincode', c.client_pincode
        ),

        'items', (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', ci.id,
              'serviceId', s.id,
              'service', s.name,
              'narration', ci.narration,
              'hsn', s.hsn_code,
              'cost', ci.cost,
              'igst', ci.igst,
              'cgst', ci.cgst,
              'sgst', ci.sgst,
              'expiry', ci.expiry
            )
          )
          FROM credit_items ci
          LEFT JOIN services s ON s.id = ci.service_id
          WHERE ci.invoice_id = c.id
        )
      ) AS invoice
      FROM credit_notes c
      WHERE c.id = ?
      `,
      [creditNoteId]
    );

    if (!rows.length) return { success: false, message: "Credit note not found" };

    return { success: true, data: rows[0] as InvoiceApiResponse };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Fetch failed" };
  } finally {
    conn.release();
  }
};

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export const updateCreditNoteStatus = async (
  creditNoteId: number,
  newStatus: "paid" | "pending" | "cancelled"
) => {
  try {
    if (!(await checkAuth())) return { success: false, message: "Unauthorized" };

    const [check]: any = await db.query(
      "SELECT status FROM credit_notes WHERE id = ?",
      [creditNoteId]
    );

    if (!check.length) return { success: false, message: "No credit note found" };

    const status = check[0].status;

    if (status === "paid" || status === "cancelled") {
      return {
        success: false,
        message: `This action cannot be performed because the credit note is already marked as ${status}.`,
      };
    }

    await db.query("UPDATE credit_notes SET status = ? WHERE id = ?", [newStatus, creditNoteId]);

    return { success: true, message: `Credit note marked as ${newStatus}` };
  } catch (error) {
    console.error("Error updating status:", error);
    return { success: false, message: "Something went wrong" };
  }
};

export const cancelCreditNote = async (creditNoteId: number) =>
  updateCreditNoteStatus(creditNoteId, "cancelled");

/* ------------------------------------------------------------------ */
/* Stats (financial year Apr 1 → Mar 31)                               */
/* ------------------------------------------------------------------ */

export const fetchCreditNoteStats = async (fy?: string) => {
  try {
    const now = new Date();
    const currentStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const selectedFY = fy || `${currentStart}-${currentStart + 1}`;

    const [startYear, endYear] = selectedFY.split("-").map(Number);

    const [rows] = await db.query<CreditStatsResult[]>(
      `
      SELECT
        SUM(sub_total) AS total_credit,
        SUM(CASE WHEN status = 'pending' THEN grand_total ELSE 0 END) AS pending_amount,
        SUM(CASE WHEN status = 'paid' THEN grand_total ELSE 0 END) AS paid_amount
      FROM credit_notes
      WHERE status != 'cancelled' AND invoice_date >= ? AND invoice_date < ?
      `,
      [`${startYear}-04-01`, `${endYear}-04-01`]
    );

    return {
      totalCredit: Number(rows[0]?.total_credit ?? 0),
      pendingAmount: Number(rows[0]?.pending_amount ?? 0),
      paidAmount: Number(rows[0]?.paid_amount ?? 0),
    };
  } catch (error) {
    console.error("Error fetching credit note stats:", error);
    return { totalCredit: 0, pendingAmount: 0, paidAmount: 0 };
  }
};

/* ------------------------------------------------------------------ */
/* Delete (latest only, rolls the sequence back)                       */
/* ------------------------------------------------------------------ */

export const deleteCreditNote = async (creditNoteId: number) => {
  if (!(await checkAuth())) return { success: false, message: "Unauthorized" };

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [check]: any = await conn.execute(
      "SELECT status FROM credit_notes WHERE id = ? FOR UPDATE",
      [creditNoteId]
    );

    if (!check.length) {
      await conn.rollback();
      return { success: false, message: "No credit note found" };
    }

    if (check[0].status === "paid") {
      await conn.rollback();
      return {
        success: false,
        message: "This action cannot be performed because the credit note is already marked as paid.",
      };
    }

    const [latest]: any = await conn.execute(
      `SELECT id, invoice_id FROM credit_notes ORDER BY id DESC LIMIT 1 FOR UPDATE`
    );

    if (Number(latest[0].id) !== Number(creditNoteId)) {
      await conn.rollback();
      return { success: false, message: "Only latest credit note can be deleted" };
    }

    const [seq]: any = await conn.execute(
      `SELECT invoice_no FROM sequence WHERE name = ? FOR UPDATE`,
      [SEQUENCE_NAME]
    );

    const noteSeqNo = Number(String(latest[0].invoice_id).split("/").pop());
    const currentSeqNo = Number(seq[0]?.invoice_no);

    if (noteSeqNo !== currentSeqNo - 1) {
      await conn.rollback();
      return { success: false, message: "Sequence Mismatch. Delete not allowed" };
    }

    // credit_items rows go too via ON DELETE CASCADE; explicit delete kept for clarity
    await conn.execute("DELETE FROM credit_items WHERE invoice_id = ?", [creditNoteId]);
    await conn.execute("DELETE FROM credit_notes WHERE id = ?", [creditNoteId]);
    await conn.execute(
      `UPDATE sequence SET invoice_no = invoice_no - 1 WHERE name = ?`,
      [SEQUENCE_NAME]
    );

    await conn.commit();

    return { success: true, message: "Credit note deleted" };
  } catch (error) {
    await conn.rollback();
    console.error("Error deleting credit note:", error);
    return { success: false, message: "Delete failed" };
  } finally {
    conn.release();
  }
};