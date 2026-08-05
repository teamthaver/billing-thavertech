"use server"

import db from "../dbPool";
import { getCurrentUserSafe } from "../sessionCheck";
import { ClientData, ClientFormData, ClientInput, FullClientDetails } from "../types/dataTypes";

export const insertClient = async (data: ClientInput) => {
  try {
    const {
      companyName,
      gstNumber,
      taxNumber,
      pan,
      address,
      city,
      state,
      country,
      pincode,
      email,
      phone,
      assignedPerson,
      designation,
      notes,
    } = data;

    const [result] = await db.execute(
      `
      INSERT INTO clients (
        company_name,
        gst_number,
        tax_number,
        pan,
        address,
        city,
        state,
        country,
        pincode,
        email,
        phone,
        assigned_person,
        designation,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        companyName,
        gstNumber?.toUpperCase() || null,
        taxNumber?.toUpperCase() || null,
        pan?.toUpperCase() || null,
        address || null,
        city || null,
        state || null,
        country || null,
        pincode || null,
        email,
        phone,
        assignedPerson || null,
        designation || null,
        notes || null,
      ]
    );

    return {
      success: true,
      message: "Client added",
    };
  } catch (error) {
    console.error("Insert Client Error:", error);

    return {
      success: false,
      message: "Failed to insert client",
    };
  }
};

export const fetchClients = async (
  page: number = 1,
  limit: number = 100,
  search?: string
) => {
  const conn = await db.getConnection();

  try {
    const offset = (page - 1) * limit;

    const searchTerm = search ? `%${search}%` : `%`;

    const [rows]: any = await conn.execute(
      `
      SELECT * FROM clients 
      WHERE company_name LIKE ?
      ORDER BY created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `,
      [searchTerm]
    );

    const [countResult]: any = await conn.execute(`
      SELECT COUNT(*) as total FROM clients
    `);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: rows as ClientData[],
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  } catch (error: any) {
    console.error("Error fetching clients:", error);

    return {
      success: false,
      message: error.message || "Failed to fetch clients",
    };
  } finally {
    conn.release();
  }
};

export const fetchFullClientDetails = async (clientId: number) => {
  const conn = await db.getConnection();

  try {
    const [clientRows]: any = await conn.execute(
      `SELECT * FROM clients WHERE id = ?`,
      [clientId]
    );

    const client = clientRows[0] || null;

    const [invoiceRows]: any = await conn.execute(
      `SELECT 
        id,
        invoice_id,
        sub_total,
        grand_total,
        status,
        reference,
        currency,
        created_at
        FROM invoice
        WHERE client_id = ?
        ORDER BY id DESC`,
      [clientId]
    );

    const [summaryRows]: any = await conn.execute(
      `SELECT 
    COUNT(*) AS total_invoices,

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
    ), 2), 0) AS pending_amount

  FROM invoice
  WHERE client_id = ?`,
      [clientId]
    );

    const summary = summaryRows[0];

    return {
      success: true,
      data: {
        client,
        invoices: invoiceRows,
        summary,
      } as FullClientDetails,
      message: "Failed to fetch"
    };

  } catch (error) {
    console.error("Error fetching full client details:", error);
    throw error;
  } finally {
    conn.release();
  }
};

export const fetchClientDetails = async (clientId: number) => {
  const conn = await db.getConnection();

  try {
    const [clientRows]: any = await conn.execute(
      `SELECT * FROM clients WHERE id = ?`,
      [clientId]
    );

    const client = clientRows[0] || null;

    return {
      success: true,
      data: client as ClientData,
      message: "Client details fetched"
    };

  } catch (error) {
    console.error("Error fetching client details:", error);
    throw error;
  } finally {
    conn.release();
  }
};

export const updateClient = async (clientId: number, data: ClientFormData) => {
  const conn = await db.getConnection();

  try {
    const [result]: any = await conn.execute(
      `
      UPDATE clients SET
        company_name = ?,
        gst_number = ?,
        tax_number = ?,
        pan = ?,
        address = ?,
        city = ?,
        state = ?,
        country = ?,
        pincode = ?,
        email = ?,
        phone = ?,
        assigned_person = ?,
        designation = ?,
        notes = ?,
      WHERE id = ?
      `,
      [
        data.companyName,
        data.gstNumber,
        data.taxNumber,
        data.pan,
        data.address,
        data.city,
        data.state,
        data.country,
        data.pincode,
        data.email,
        data.phone,
        data.assignedPerson,
        data.designation,
        data.notes,
        clientId
      ]
    );

    return {
      success: true,
      message: "Client updated successfully",
      affectedRows: result.affectedRows
    };

  } catch (error) {
    console.error("Error updating client:", error);
    throw error;
  } finally {
    conn.release();
  }
};

export const deleteClient = async (clientId: number) => {

  const session = await getCurrentUserSafe();

  const userId = session?.id;

  if (
    !userId ||
    session.iss !== "thaverTechInvoiceGenerator" ||
    session.role !== "admin"
  ) {
    return { success: false, message: "Unauthorized" };
  }

  const conn = await db.getConnection();

  try {

    const [result]: any = await conn.execute(
      `DELETE FROM clients WHERE id = ?`,
      [clientId]
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Client not found" };
    }

    return {
      success: true,
      message: "Client Deleted"
    }

  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete client" };
  } finally {
    conn.release()
  }

}