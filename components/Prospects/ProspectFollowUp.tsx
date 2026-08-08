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
