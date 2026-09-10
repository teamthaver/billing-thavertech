"use server";

import db from "@/lib/dbPool";
import { getCurrentUserSafe } from "@/lib/sessionCheck";
import { ProspectFollowUpFormData } from "@/lib/types/dataTypes";

export const insertProspectFollowUp = async (
  prospectId: number,
  data: ProspectFollowUpFormData,
) => {
  const session = await getCurrentUserSafe();

  const userId = session?.id;

  if (
    !userId ||
    session.iss !== "thaverTechInvoiceGenerator" ||
    session.role !== "admin"
  ) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  const conn = await db.getConnection();

  try {
    const [result]: any = await conn.execute(
      `
      INSERT INTO prospect_followups
      (
        prospect_id,
        follow_up_date,
        remarks,
        status
      )
      VALUES (?, ?, ?, ?)
      `,
      [prospectId, data.follow_up_date, data.remarks || null, data.status],
    );

    return {
      success: true,
      message: "Follow up added successfully.",
      id: result.insertId,
    };
  } catch (error) {
    console.error("Error adding prospect follow up:", error);

    return {
      success: false,
      message: "Failed to add follow up.",
    };
  } finally {
    conn.release();
  }
};
export const fetchProspectFollowUps = async (prospectId: number) => {
  const session = await getCurrentUserSafe();

  const userId = session?.id;

  if (
    !userId ||
    session.iss !== "thaverTechInvoiceGenerator" ||
    session.role !== "admin"
  ) {
    return {
      success: false,
      message: "Unauthorized",
      data: [],
    };
  }

  const conn = await db.getConnection();

  try {
    const [rows]: any = await conn.execute(
      `
      SELECT
        id,
        prospect_id,
        follow_up_date,
        remarks,
        status,
        created_at
      FROM prospect_followups
      WHERE prospect_id = ?
      ORDER BY follow_up_date DESC, id DESC
      `,
      [prospectId],
    );

    return {
      success: true,
      data: rows,
    };
  } catch (error) {
    console.error("Error fetching prospect follow ups:", error);

    return {
      success: false,
      message: "Failed to fetch follow ups.",
      data: [],
    };
  } finally {
    conn.release();
  }
};
// =====================================================
// CONVERT PROSPECT TO CLIENT
// =====================================================

export const convertProspectToClient = async (prospectId: number) => {
  const session = await getCurrentUserSafe();

  const userId = session?.id;

  if (
    !userId ||
    session.iss !== "thaverTechInvoiceGenerator" ||
    session.role !== "admin"
  ) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Get prospect
    const [prospectRows]: any = await conn.execute(
      `
      SELECT
        id,
        name,
        email,
        phone,
        address,
        company,
        source,
        requirement
      FROM prospects
      WHERE id = ?
      FOR UPDATE
      `,
      [prospectId],
    );

    if (prospectRows.length === 0) {
      await conn.rollback();

      return {
        success: false,
        message: "Prospect not found.",
      };
    }

    const prospect = prospectRows[0];

    // 2. Create client
    const [clientResult]: any = await conn.execute(
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
        prospect.company || prospect.name,
        null,
        null,
        null,
        prospect.address || null,
        null,
        null,
        null,
        null,
        prospect.email || null,
        prospect.phone || null,
        prospect.name || null,
        null,
        prospect.requirement || null,
      ],
    );

    const clientId = clientResult.insertId;

    // 3. Get prospect documents
    const [prospectDocuments]: any = await conn.execute(
      `
      SELECT
        title,
        document,
        remarks
      FROM prospect_documentation
      WHERE prospect_id = ?
      `,
      [prospectId],
    );

    // 4. Copy prospect documents to client documents
    for (const document of prospectDocuments) {
      await conn.execute(
        `
        INSERT INTO client_documents (
          client_id,
          title,
          file,
          remarks
        )
        VALUES (?, ?, ?, ?)
        `,
        [clientId, document.title, document.document, document.remarks || null],
      );
    }

    // 5. Mark follow-ups as converted
    await conn.execute(
      `
      UPDATE prospect_followups
      SET status = 'converted'
      WHERE prospect_id = ?
      `,
      [prospectId],
    );

    // 6. Delete prospect documents
    await conn.execute(
      `
      DELETE FROM prospect_documentation
      WHERE prospect_id = ?
      `,
      [prospectId],
    );

    // 7. Delete prospect
    await conn.execute(
      `
      DELETE FROM prospects
      WHERE id = ?
      `,
      [prospectId],
    );

    // 8. Commit transaction
    await conn.commit();

    return {
      success: true,
      message: "Prospect converted to client successfully.",
      clientId,
    };
  } catch (error) {
    await conn.rollback();

    console.error("Convert Prospect Error:", error);

    return {
      success: false,
      message: "Failed to convert prospect to client.",
    };
  } finally {
    conn.release();
  }
};
