"use server"

import { GST } from "../config/gst";
import db from "../dbPool";
import { getCurrentUserSafe } from "../sessionCheck";
import { ClientLocationReport, InvoiceApiResponse, InvoiceData, InvoiceItem, InvoiceServiceRow, Service } from "../types/dataTypes";
import { RowDataPacket } from "mysql2";

interface StatsResult extends RowDataPacket {
  total_sales: number | null;
  pending_amount: number | null;
  paid_amount: number | null;
}

export interface ClientReport extends RowDataPacket {
  client_id: number;
  client_name: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  total_invoices: number;
  paid_invoices: number;
  pending_invoices: number;
}

const getFinancialYear = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1–12

  let startYear;
  let endYear;

  if (month >= 4) {
    // April or later
    startYear = year;
    endYear = year + 1;
  } else {
    // Jan–March
    startYear = year - 1;
    endYear = year;
  }

  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
};

const allowedRoles = ["admin", "accounts"];

const round = (val: number) => Math.round(val * 100) / 100;

export const fetchServices = async () => {
  const conn = await db.getConnection()

  try {
    const [rows]: any = await conn.execute(`
      SELECT * FROM services
    `)

    return {
      success: true,
      data: rows as Service[],
    }
  } catch (error) {
    console.error("Error fetching services:", error)

    return {
      success: false,
      data: [],
    }
  } finally {
    conn.release()
  }
}

export const getNewInvoiceNo = async () => {

  const conn = await db.getConnection()
  try {
    const [rows]: any = await conn.execute(`
      SELECT name, invoice_no FROM sequence where name="invoice"
    `)

    const currentNo = rows[0].invoice_no;

    if (!currentNo) {
      return {
        success: false,
        message: "Failed to Fetch Current invoice No"
      }
    }

    return {
      success: true,
      invoiceNo: currentNo,
    }
  }
  catch (error) {
    console.log(error)
  } finally {
    conn.release();
  }
}

export const insertInvoice = async (
  data: InvoiceData,
  items: InvoiceItem[],
  custom_tax: number
) => {
  const conn = await db.getConnection();

  try {

    const session = await getCurrentUserSafe();
    const userId = session?.id;

    if (!userId || session.iss !== "thaverTechInvoiceGenerator") {
      return { success: false, message: "Unauthorized" };
    }

    if (!allowedRoles.includes(session.role)) {
      return { success: false, message: "Unauthorized" };
    }

    if (!items.length) {
      throw new Error("No invoice items provided");
    }

    await conn.beginTransaction();

    const [rows]: any = await conn.execute(`
      SELECT invoice_no FROM sequence where name="invoice" FOR UPDATE
    `);

    const currentNo = rows[0]?.invoice_no;

    if (!currentNo && currentNo !== 0) {
      throw new Error("Invalid invoice number");
    }

    const paddedNo = String(currentNo).padStart(4, "0");

    const invoiceString = `TTPL/${getFinancialYear()}/${paddedNo}`;

    const nextNo = currentNo + 1;

    await conn.execute(`
      UPDATE sequence SET invoice_no = ? WHERE name = 'invoice'
    `, [nextNo]);

    const isGST = data.invoiceType === "GST";
    const isCustomTax = data.invoiceType === "CUSTOM_TAX";

    let isIGST = false;

    if (isGST) {
      const [company]: any = await conn.execute(
        `SELECT gst FROM companies LIMIT 1`
      )

      const companyGST = company[0].gst;

      if (!companyGST) {
        throw new Error("Company GST not found");
      }

      const [clientRows]: any = await conn.execute(
        `SELECT gst_number FROM clients WHERE id = ?`,
        [data.clientId]
      );

      const clientGST = clientRows[0]?.gst_number;

      if (!clientGST) {
        throw new Error("GST required for taxable invoice");
      }

      const companyState = companyGST.slice(0, 2);
      const clientState = clientGST?.slice(0, 2);

      isIGST =
        isGST &&
        companyState &&
        clientState &&
        companyState !== clientState;
    }

    let subTotal = 0;
    let totalIGST = 0, totalCGST = 0, totalSGST = 0;

    const invoiceItemsValues: any[] = [];

    for (const item of items) {
      let serviceId = item.serviceId;

      if (!serviceId && item.service) {
        const [rows]: any = await conn.execute(
          `SELECT id FROM services WHERE hsn_code = ? AND name = ? LIMIT 1`,
          [item.hsn, item.service.value]
        );

        if (rows.length > 0) {
          serviceId = rows[0].id;
        } else {
          const [result]: any = await conn.execute(
            `INSERT INTO services (name, hsn_code) VALUES (?, ?)`,
            [item.service.value, item.hsn]
          );
          serviceId = result.insertId;
        }
      }

      if (!serviceId) {
        throw new Error("Service ID missing for item");
      }

      const cost = Number(item.cost);
      if (isNaN(cost)) {
        throw new Error("Invalid item cost");
      }

      let itemIGST = 0, itemCGST = 0, itemSGST = 0;

      subTotal += cost;

      if (isGST) {

        if (isIGST) {
          itemIGST = round((cost * GST.IGST) / 100);
        } else {
          itemCGST = round((cost * GST.CGST) / 100);
          itemSGST = round((cost * GST.SGST) / 100);
        }

        totalIGST += itemIGST;
        totalCGST += itemCGST;
        totalSGST += itemSGST;
      }

      invoiceItemsValues.push([
        serviceId,
        cost,
        itemIGST,
        itemCGST,
        itemSGST,
        item.expiry,
        item.narration
      ]);
    }

    const totalTax = round(
      isCustomTax
        ? (subTotal * custom_tax) / 100
        : (totalIGST + totalCGST + totalSGST)
    );

    const grandTotal = round(subTotal + totalTax);

    const isINR = data.currency === "INR";

    const [invoiceResult]: any = await conn.execute(
      `
        INSERT INTO invoice (
        client_id,
        client_name,
        client_gst_no,
        tax_number,
        client_address,
        client_phone,
        client_email,
        client_city,
        client_state,
        client_country,
        client_pincode,
        currency,
        dollar_rate,
        sub_total,
        total_tax,
        igst,
        cgst,
        sgst,
        igst_rate,
        cgst_rate,
        sgst_rate,
        custom_rate,
        grand_total,
        pono,
        podate,
        reference,
        invoice_id,
        type,
        invoice_date
      )
      SELECT 
        c.id,
        c.company_name,
        c.gst_number,
        c.tax_number,
        c.address,
        c.phone,
        c.email,
        c.city,
        c.state,
        c.country,
        c.pincode,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?
      FROM clients c
      WHERE c.id = ?
      `,
      [
        data.currency,
        data.dollar_rate,
        subTotal,
        totalTax,
        totalIGST,
        totalCGST,
        totalSGST,
        (isIGST && !isCustomTax && isINR) ? GST.IGST : 0,
        (isGST && !isCustomTax && isINR) ? GST.CGST : 0,
        (isGST && !isCustomTax && isINR) ? GST.SGST : 0,
        (isCustomTax) ? custom_tax : 0,
        grandTotal,
        data.PONo,
        data.PODate,
        data.reference,
        invoiceString,
        data.invoiceType,
        data.invoiceDate,
        data.clientId, // IMPORTANT: goes at end
      ]
    );

    const invoiceId = invoiceResult.insertId;

    const finalValues = invoiceItemsValues.map((row) => [
      invoiceId,
      ...row,
    ]);

    console.log(finalValues)

    await conn.query(
      `
      INSERT INTO invoice_items (
        invoice_id,
        service_id,
        cost,
        igst,
        cgst,
        sgst,
        expiry,
        narration
      ) VALUES ?
      `,
      [finalValues]
    );

    await conn.commit();

    return {
      success: true,
      message: "Invoice Generated",
    };

  } catch (error) {
    await conn.rollback();
    console.error(error);

    return {
      success: false,
      message: "Insert Failed",
    };
  } finally {
    conn.release();
  }
};

export const updateInvoice = async (
  invoiceId: number,
  data: InvoiceData,
  items: InvoiceItem[],
  custom_tax: number
) => {
  const conn = await db.getConnection();

  try {
    const session = await getCurrentUserSafe();
    const userId = session?.id;

    if (!userId || session.iss !== "thaverTechInvoiceGenerator") {
      return { success: false, message: "Unauthorized" };
    }

    if (!allowedRoles.includes(session.role)) {
      return { success: false, message: "Unauthorized" };
    }

    if (!items.length) {
      throw new Error("No invoice items provided");
    }

    await conn.beginTransaction();

    // GST logic 
    const isGST = data.invoiceType === "GST";
    const isCustomTax = data.invoiceType === "CUSTOM_TAX";

    let isIGST = false;

    if (isGST) {
      const [company]: any = await conn.execute(
        `SELECT gst FROM companies LIMIT 1`
      );

      const companyGST = company[0].gst;

      const [clientRows]: any = await conn.execute(
        `SELECT gst_number FROM clients WHERE id = ?`,
        [data.clientId]
      );

      const clientGST = clientRows[0]?.gst_number;

      if (!clientGST) {
        throw new Error("GST required for taxable invoice");
      }

      const companyState = companyGST.slice(0, 2);
      const clientState = clientGST.slice(0, 2);

      isIGST = companyState !== clientState;
    }

    const [taxes]: any = await conn.execute(
      `SELECT cgst_rate, sgst_rate, igst_rate, custom_rate FROM invoice WHERE id = ?`,
      [invoiceId]
    );

    let CGST_RATE = Number(taxes[0].cgst_rate);
    let SGST_RATE = Number(taxes[0].sgst_rate);
    let IGST_RATE = Number(taxes[0].igst_rate);

    if (CGST_RATE === 0 && SGST_RATE === 0 && IGST_RATE === 0) {
      if (isIGST) {
        IGST_RATE = GST.IGST
      }
      else {
        CGST_RATE = GST.CGST
        SGST_RATE = GST.SGST
      }
    }

    custom_tax = custom_tax ?? taxes[0].custom_rate;

    let subTotal = 0;
    let totalIGST = 0, totalCGST = 0, totalSGST = 0;

    const invoiceItemsValues: any[] = [];

    for (const item of items) {
      let serviceId = item.serviceId;

      // 🔹 resolve service
      if (!serviceId && item.service) {
        const [rows]: any = await conn.execute(
          `SELECT id FROM services WHERE hsn_code = ? AND name = ? LIMIT 1`,
          [item.hsn, item.service]
        );

        if (rows.length > 0) {
          serviceId = rows[0].id;
        } else {
          const [result]: any = await conn.execute(
            `INSERT INTO services (name, hsn_code) VALUES (?, ?)`,
            [item.service.value, item.hsn]
          );
          serviceId = result.insertId;
        }
      }

      if (!serviceId) {
        throw new Error("Service ID missing");
      }

      const cost = Number(item.cost);
      if (isNaN(cost)) {
        throw new Error("Invalid item cost");
      }

      let itemIGST = 0, itemCGST = 0, itemSGST = 0;

      subTotal += cost;

      if (isGST) {
        if (isIGST) {
          itemIGST = round((cost * IGST_RATE) / 100);
        } else {
          itemCGST = round((cost * CGST_RATE) / 100);
          itemSGST = round((cost * SGST_RATE) / 100);
        }
        totalIGST += itemIGST;
        totalCGST += itemCGST;
        totalSGST += itemSGST;
      }

      invoiceItemsValues.push([
        serviceId,
        cost,
        itemIGST,
        itemCGST,
        itemSGST,
        item.expiry,
        item.narration
      ]);
    }

    const totalTax = round(
      isCustomTax
        ? (subTotal * custom_tax) / 100
        : (totalIGST + totalCGST + totalSGST)
    );

    const grandTotal = round(subTotal + totalTax);

    const isINR = data.currency === "INR";

    await conn.execute(
      `
      UPDATE invoice SET
        currency = ?,
        dollar_rate = ?,
        sub_total = ?,
        total_tax = ?,
        igst = ?,
        cgst = ?,
        sgst = ?,
        igst_rate = ?,
        cgst_rate = ?,
        sgst_rate = ?,
        custom_rate = ?,
        grand_total = ?,
        pono = ?,
        podate = ?,
        reference = ?,
        type = ?,
        invoice_date = ?
      WHERE id = ?
      `,
      [
        data.currency,
        data.dollar_rate,
        subTotal,
        totalTax,
        totalIGST,
        totalCGST,
        totalSGST,
        (isIGST && !isCustomTax && isINR) ? IGST_RATE : 0,
        (isGST && !isCustomTax && isINR) ? CGST_RATE : 0,
        (isGST && !isCustomTax && isINR) ? SGST_RATE : 0,
        isCustomTax ? custom_tax : 0,
        grandTotal,
        data.PONo,
        data.PODate,
        data.reference,
        data.invoiceType,
        data.invoiceDate,
        invoiceId
      ]
    );

    await conn.execute(
      `DELETE FROM invoice_items WHERE invoice_id = ?`,
      [invoiceId]
    );

    const finalValues = invoiceItemsValues.map(row => [
      invoiceId,
      ...row
    ]);

    await conn.query(
      `
      INSERT INTO invoice_items (
        invoice_id,
        service_id,
        cost,
        igst,
        cgst,
        sgst,
        expiry,
        narration
      ) VALUES ?
      `,
      [finalValues]
    );

    await conn.commit();

    return {
      success: true,
      message: "Invoice Updated",
    };

  } catch (error) {
    await conn.rollback();
    console.error(error);

    return {
      success: false,
      message: "Update Failed",
    };
  } finally {
    conn.release();
  }
};

export const fetchAllInvoices = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string
) => {
  const conn = await db.getConnection();

  try {
    const offset = (page - 1) * limit;

    const searchTerm = search ? `%${search}%` : `%`;

    const safeLimit = Math.min(50, Number(limit) || 10);
    const safeOffset = Math.max(0, Number(offset) || 0);

    let where = `
      WHERE (
      i.client_name LIKE ?
      OR i.invoice_id LIKE ?
      )
    `;

    const params: any[] = [searchTerm, searchTerm];

    if (status) {
      where += ` AND i.status = ?`;
      params.push(status);
    }

    const [rows]: any = await conn.execute(
      `
  SELECT 
    i.id,
    i.invoice_id,
    i.client_id,
    i.client_name,
    i.client_gst_no,
    i.tax_number,
    i.client_email,
    i.client_phone,
    i.client_city,
    i.client_state,
    i.client_country,
    i.client_pincode,
    i.currency,
    i.sub_total,
    i.grand_total,
    i.created_at,
    i.invoice_date,
    i.status,

    COUNT(ii.id) AS total_items

  FROM invoice i

  LEFT JOIN invoice_items ii 
    ON ii.invoice_id = i.id

  ${where}

  GROUP BY i.id

  ORDER BY i.created_at DESC
  LIMIT ${safeLimit} OFFSET ${safeOffset}
  `,
      params
    );

    const [countResult]: any = await conn.execute(`
      SELECT COUNT(*) as total FROM invoice
    `);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Fetch failed",
    };
  } finally {
    conn.release();
  }
};

export const fetchCurrentInvoices = async (
  page = 1,
  limit = 10,
  search?: string
) => {
  const conn = await db.getConnection();

  try {
    const offset = (page - 1) * limit;

    const safeLimit = Math.min(50, Number(limit) || 10);
    const safeOffset = Math.max(0, Number(offset) || 0);

    const searchTerm = search ? `%${search}%` : `%`;

    let where = `
      WHERE i.status = 'pending'
      AND invoice_date >= DATE_FORMAT(UTC_DATE(), '%Y-%m-01')
      AND invoice_date < DATE_ADD(DATE_FORMAT(UTC_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
      AND (
        i.client_name LIKE ?
        OR i.invoice_id LIKE ?
      )
    `;

    const params: any[] = [searchTerm, searchTerm];

    const [rows]: any = await conn.execute(
      `
      SELECT 
        i.id,
        i.invoice_id,
        i.client_id,
        i.client_name,
        i.client_gst_no,
        i.client_email,
        i.client_phone,
        i.client_city,
        i.client_state,
        i.sub_total,
        i.grand_total,
        i.created_at,
        i.invoice_date,
        i.status,

        COUNT(ii.id) AS total_items

      FROM invoice i

      LEFT JOIN invoice_items ii 
        ON ii.invoice_id = i.id

      ${where}

      GROUP BY i.id

      ORDER BY i.created_at ASC

      LIMIT ${safeLimit} OFFSET ${safeOffset}
      `,
      params
    );

    const [[{ total }]]: any = await conn.execute(
      `
      SELECT COUNT(DISTINCT i.id) AS total
      FROM invoice i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      ${where}
      `,
      params
    );

    return {
      success: true,
      data: rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Fetch failed",
    };
  } finally {
    conn.release();
  }
};

export const fetchPreviousOutstanding = async (
  page = 1,
  limit = 10,
  search?: string
) => {
  const conn = await db.getConnection();

  try {
    const offset = (page - 1) * limit;

    const safeLimit = Math.min(50, Number(limit) || 10);
    const safeOffset = Math.max(0, Number(offset) || 0);

    const searchTerm = search ? `%${search}%` : `%`;

    let where = `
      WHERE i.status = 'pending'
      AND invoice_date < DATE_FORMAT(UTC_DATE(), '%Y-%m-01')
      AND (
        i.client_name LIKE ?
        OR i.invoice_id LIKE ?
      )
    `;

    const params: any[] = [searchTerm, searchTerm];

    const [rows]: any = await conn.execute(
      `
      SELECT 
        i.id,
        i.invoice_id,
        i.client_id,
        i.client_name,
        i.client_gst_no,
        i.client_email,
        i.client_phone,
        i.client_city,
        i.client_state,
        i.sub_total,
        i.grand_total,
        i.created_at,
        i.invoice_date,
        i.status,

        COUNT(ii.id) AS total_items

      FROM invoice i

      LEFT JOIN invoice_items ii 
        ON ii.invoice_id = i.id

      ${where}

      GROUP BY i.id

      ORDER BY i.created_at ASC

      LIMIT ${safeLimit} OFFSET ${safeOffset}
      `,
      params
    );

    const [[{ total }]]: any = await conn.execute(
      `
      SELECT COUNT(DISTINCT i.id) AS total
      FROM invoice i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      ${where}
      `,
      params
    );

    return {
      success: true,
      data: rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Fetch failed",
    };
  } finally {
    conn.release();
  }
};

export const fetchServicesByExpiry = async (
  page = 1,
  limit = 10
) => {
  const conn = await db.getConnection();

  try {
    const offset = (page - 1) * limit;

    const [rows] = await conn.execute(
      `
      SELECT 
        ii.id,
        i.invoice_id,
        i.id AS invoiceId,
        ii.service_id,
        ii.cost,
        ii.expiry,
        ii.status,

        s.name,
        s.hsn_code

      FROM invoice_items ii

      JOIN services s ON s.id = ii.service_id
      JOIN invoice i ON i.id = ii.invoice_id

      WHERE ii.expiry IS NOT NULL
        AND ii.expiry <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY)
        AND i.status != "cancelled"
        AND i.renewed != true

      ORDER BY ii.expiry ASC

      LIMIT ${limit} OFFSET ${offset}
      `);

    const [[{ total }]]: any = await conn.execute(
      `
      SELECT COUNT(*) AS total
      FROM invoice_items ii
      JOIN invoice i ON i.id = ii.invoice_id

      WHERE 
      ii.expiry IS NOT NULL
      AND ii.expiry <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY)
      AND i.status != 'cancelled'
      AND i.renewed != true
    `
    );

    return {
      success: true,
      data: rows as InvoiceServiceRow[],
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching services by expiry:", error);

    return {
      success: false,
      message: "Failed to fetch services",
    };
  } finally {
    conn.release();
  }
};

export const fetchInvoiceById = async (invoiceId: number) => {
  const conn = await db.getConnection();

  try {

    const [invoiceRows]: any = await conn.execute(
      `
  SELECT JSON_OBJECT(
    'id', i.id,
    'invoiceId', i.invoice_id,
    'subTotal', i.sub_total,
    'igst', i.igst,
    'cgst', i.cgst,
    'sgst', i.sgst,
    'totalTax', i.total_tax,
    'igstRate', i.igst_rate,
    'cgstRate', i.cgst_rate,
    'sgstRate', i.sgst_rate,
    'customRate', i.custom_rate,
    'currency', i.currency,
    'poNo', i.pono,
    'poDate', i.podate,
    'reference', i.reference,
    'status', i.status,
    'grandTotal', i.grand_total,
    'createdAt', i.created_at,
    'invoiceDate', i.invoice_date,
    'type', i.type,

    'client', JSON_OBJECT(
      'id', i.client_id,
      'companyName', i.client_name,
      'gstNumber', i.client_gst_no,
      'taxNumber', tax_number,
      'email', i.client_email,
      'phone', i.client_phone,
      'address', i.client_address,
      'city', i.client_city,
      'state', i.client_state,
      'country', i.client_country,
      'pincode', i.client_pincode
    ),

    'items', (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', ii.id,
          'serviceId', s.id,
          'service', s.name,
          'narration', ii.narration,
          'hsn', s.hsn_code,
          'cost', ii.cost,
          'igst', ii.igst,
          'cgst', ii.cgst,
          'sgst', ii.sgst,
          'expiry', ii.expiry
        )
      )
      FROM invoice_items ii
      LEFT JOIN services s ON s.id = ii.service_id
      WHERE ii.invoice_id = i.id
    )

  ) AS invoice

  FROM invoice i
  WHERE i.id = ?;
  `,
      [invoiceId]
    );

    return {
      success: true,
      data: invoiceRows[0] as InvoiceApiResponse
    };

  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Fetch failed",
    };
  } finally {
    conn.release();
  }
};

export const updateStatus = async (
  invoiceId: number,
  newStatus: string
) => {
  try {
    const session = await getCurrentUserSafe();
    const userId = session?.id;

    if (!userId || session.iss !== "thaverTechInvoiceGenerator") {
      return { success: false, message: "Unauthorized" };
    }

    if (!allowedRoles.includes(session.role)) {
      return { success: false, message: "Unauthorized" };
    }

    const [check]: any = await db.query(
      "SELECT status FROM invoice WHERE id = ?",
      [invoiceId]
    );

    if (check.length === 0) {
      return {
        success: false,
        message: "No Invoice found"
      }
    }

    const status = check[0].status;

    if (status === "paid" && newStatus === "paid") {
      return {
        success: false,
        message: "This action cannot be performed because the invoice is already marked as paid."
      }
    }

    if (status === "cancelled") {
      return {
        success: false,
        message: "This action cannot be performed because the invoice is already marked as cancelled."
      }
    }

    const [result] = await db.query(
      "UPDATE invoice SET status = ? WHERE id = ?",
      [newStatus, invoiceId]
    );

    return {
      success: true,
      message: "Invoice marked as paid",
    };
  } catch (error) {
    console.error("Error updating status:", error);
    return { success: false, message: "Something went wrong" };
  }
};

export const fetchStats = async (fy?: string) => {
  try {
    const getCurrentFY = () => {
      const now = new Date();
      const year =
        now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return `${year}-${year + 1}`;
    };

    const selectedFY = fy || getCurrentFY();

    const [startYear, endYear] = selectedFY.split("-").map(Number);

    // FY range: Apr 1 → Mar 31
    const startDate = `${startYear}-04-01`;
    const endDate = `${endYear}-04-01`;

    const [rows] = await db.query<StatsResult[]>(
      `
  SELECT 
    SUM(sub_total) AS total_sales,

    -- ✅ Current month pending
    SUM(
      CASE 
        WHEN status = 'pending' 
        AND invoice_date >= DATE_FORMAT(UTC_DATE(), '%Y-%m-01')
        AND invoice_date < DATE_ADD(DATE_FORMAT(UTC_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
        THEN sub_total 
        ELSE 0 
      END
    ) AS current_payments,

    -- ✅ Previous outstanding (before current month)
    SUM(
      CASE 
        WHEN status = 'pending' 
        AND invoice_date < DATE_FORMAT(UTC_DATE(), '%Y-%m-01')
        THEN sub_total 
        ELSE 0 
      END
    ) AS previous_outstanding

  FROM invoice
  WHERE status != "cancelled"
  AND invoice_date >= ?
  AND invoice_date < ?
  `,
      [startDate, endDate]
    )

    return {
      totalSales: rows[0]?.total_sales ?? 0,
      currentPayments: rows[0]?.current_payments ?? 0,
      previousOutstanding: rows[0]?.previous_outstanding ?? 0,
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      totalSales: 0,
      pendingAmount: 0,
      paidAmount: 0,
    };
  }
};

export const fetchClientReport = async (
  page: number = 1,
  pageSize: number = 10
) => {
  const conn = await db.getConnection();

  const offset = (page - 1) * pageSize;

  try {
    // Paginated data
    const [rows] = await conn.query<ClientReport[]>(
      `
      SELECT 
  client_id,
  client_name,

  COALESCE(ROUND(SUM(
    CASE 
      WHEN currency = 'USD' THEN grand_total * dollar_rate
      ELSE grand_total
    END
  ), 2), 0) AS total_amount,

  COALESCE(ROUND(SUM(
    CASE 
      WHEN status = 'paid' THEN 
        CASE 
          WHEN currency = 'USD' THEN grand_total * dollar_rate
          ELSE grand_total
        END
      ELSE 0 
    END
  ), 2), 0) AS paid_amount,

  COALESCE(ROUND(SUM(
    CASE 
      WHEN status = 'pending' THEN 
        CASE 
          WHEN currency = 'USD' THEN grand_total * dollar_rate
          ELSE grand_total
        END
      ELSE 0 
    END
  ), 2), 0) AS pending_amount,

  COUNT(*) AS total_invoices,

  SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_invoices,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_invoices

FROM invoice

GROUP BY client_id, client_name

ORDER BY total_amount DESC
LIMIT ? OFFSET ?
      `,
      [pageSize, offset]
    );

    // Total unique clients
    const [countResult]: any = await conn.query(`
      SELECT COUNT(DISTINCT client_id) AS total
      FROM invoice
    `);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages, // ✅ explicitly returned
      },
    };
  } catch (error) {
    console.error("Error fetching client report:", error);
    return {
      success: false,
      data: [],
      pagination: null,
    };
  } finally {
    conn.release();
  }
};

export const fetchClientReportByState = async (
  state?: string,
  page: number = 1,
  pageSize: number = 10
) => {
  const conn = await db.getConnection();

  const offset = (page - 1) * pageSize;

  try {
    let query = `
      SELECT 
  i.client_id,
  i.client_name,
  i.client_city,
  i.client_state,

  COALESCE(ROUND(SUM(
    CASE 
      WHEN i.currency = 'USD' THEN i.grand_total * i.dollar_rate
      ELSE i.grand_total
    END
  ), 2), 0) AS total_amount,
  COUNT(*) AS total_invoices,
  SUM(ii.item_count) AS total_items

FROM invoice i

LEFT JOIN (
  SELECT invoice_id, COUNT(*) AS item_count
  FROM invoice_items
  GROUP BY invoice_id
) ii ON ii.invoice_id = i.id
    `;

    const params: any[] = [];

    if (state) {
      query += ` WHERE i.client_state = ? `;
      params.push(state);
    }

    query += `
      GROUP BY 
        i.client_id,
        i.client_name,
        i.client_city,
        i.client_state

      ORDER BY total_amount DESC
      LIMIT ? OFFSET ?
    `;


    params.push(pageSize, offset);

    const [rows] = await conn.query(query, params);

    let countQuery = `
      SELECT COUNT(DISTINCT i.client_id) AS total
      FROM invoice i
    `;

    const countParams: any[] = [];

    if (state) {
      countQuery += ` WHERE i.client_state = ? `;
      countParams.push(state);
    }

    const [countResult]: any = await conn.query(countQuery, countParams);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: rows as ClientLocationReport[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Error fetching client report by state:", error);
    return {
      success: false,
      data: [],
      pagination: null,
    };
  } finally {
    conn.release();
  }
};

export const deleteInvoice = async (invoiceId: number) => {
  const conn = await db.getConnection();

  try {
    const session = await getCurrentUserSafe();
    const userId = session?.id;

    if (!userId || session.iss !== "thaverTechInvoiceGenerator") {
      return { success: false, message: "Unauthorized" };
    }

    if (!allowedRoles.includes(session.role)) {
      return { success: false, message: "Unauthorized" };
    }

    await conn.beginTransaction();

    const [check]: any = await db.query(
      "SELECT status FROM invoice WHERE id = ?",
      [invoiceId]
    );

    if (check.length === 0) {
      return {
        success: false,
        message: "No Invoice found"
      }
    }

    const status = check[0].status;

    if (status === "paid") {
      return {
        success: false,
        message: "This action cannot be performed because the invoice is already marked as paid."
      }
    }

    const [rows]: any = await conn.execute(
      `SELECT id, invoice_id FROM invoice ORDER BY id DESC LIMIT 1 FOR UPDATE`
    );

    if (!rows.length) {
      await conn.rollback();
      return {
        success: false,
        message: "No invoices found",
      };
    }

    const invoiceSequenceNo = Number(rows[0].invoice_id.split("/")[2]);

    const [sequence]: any = await conn.execute(
      `SELECT invoice_no FROM sequence WHERE name="invoice" FOR UPDATE`
    );

    const currentSequenceNo = sequence[0].invoice_no;

    if (Number(invoiceSequenceNo) !== (Number(currentSequenceNo) - 1)) {
      await conn.rollback();
      return {
        success: false,
        message: "Sequence Mismatch. Delete not allowed",
      };
    }

    const latestId = rows[0]?.id;

    if (latestId !== invoiceId) {
      await conn.rollback();
      return {
        success: false,
        message: "Only latest invoice can be deleted",
      };
    }

    await conn.query(
      "DELETE FROM invoice_items WHERE invoice_id = ?",
      [invoiceId]
    );

    await conn.query(
      "DELETE FROM invoice WHERE id = ?",
      [invoiceId]
    );

    await conn.query(
      `UPDATE sequence SET invoice_no = invoice_no - 1 WHERE name = 'invoice'`
    );

    await conn.commit();

    return {
      success: true,
      message: "Invoice deleted",
    };
  } catch (error) {
    await conn.rollback();
    console.error("Error deleting invoice:", error);

    return { success: false, message: "Delete failed" };
  } finally {
    conn.release();
  }
};

export const cancelInvoice = async (invoiceId: number) => {
  try {
    const session = await getCurrentUserSafe();
    const userId = session?.id;

    if (!userId || session.iss !== "thaverTechInvoiceGenerator") {
      return { success: false, message: "Unauthorized" };
    }

    if (!allowedRoles.includes(session.role)) {
      return { success: false, message: "Unauthorized" };
    }

    const [result] = await db.query(
      "UPDATE invoice SET status = ? WHERE id = ?",
      ["cancelled", invoiceId]
    );

    return {
      success: true,
      message: "Invoice marked as cancelled",
    };
  } catch (error) {
    console.error("Error updating status:", error);
    return { success: false, message: "Something went wrong" };
  }
};

export const markAsRenewed = async (
  invoiceId: number
) => {
  try {
    const session = await getCurrentUserSafe();
    const userId = session?.id;

    if (!userId || session.iss !== "thaverTechInvoiceGenerator") {
      return { success: false, message: "Unauthorized" };
    }

    if (!allowedRoles.includes(session.role)) {
      return { success: false, message: "Unauthorized" };
    }

    const [check]: any = await db.query(
      "SELECT renewed FROM invoice WHERE id = ?",
      [invoiceId]
    );

    if (check.length === 0) {
      return {
        success: false,
        message: "No Invoice found"
      }
    }

    const status = Boolean(check[0].renewed);

    if (status === true) {
      return {
        success: false,
        message: "This action cannot be performed because the invoice is already marked as Renewed."
      }
    }

    const [result] = await db.query(
      "UPDATE invoice SET renewed = true WHERE id = ?",
      [invoiceId]
    );

    return {
      success: true,
      message: "Invoice marked as renewed",
    };
  } catch (error) {
    console.error("Error updating status:", error);
    return { success: false, message: "Something went wrong" };
  }
};