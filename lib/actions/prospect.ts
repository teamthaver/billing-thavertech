"use server";

import db from "../dbPool";
import { getCurrentUserSafe } from "../sessionCheck";
import { ProspectData, ProspectFormData } from "../types/dataTypes";

async function uploadFile(file: File) {
  if (!file) {
    throw new Error("No file provided");
  }

  const apiForm = new FormData();
  apiForm.append("file", file);

  const res = await fetch("https://accounts.thavertech.com/upload/prospect", {
    method: "POST",
    headers: {
      Authorization: "Bearer thaverTech",
    },
    body: apiForm,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Upload failed");
  }

  return data.url;
}

export const insertProspect = async (data: ProspectFormData) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      company,
      source,
      requirement,
      visitingDate,
    } = data;

    let uploadUrl = null;
    if (data.visitingCard) {
      uploadUrl = await uploadFile(data.visitingCard);
    }

    const [result] = await db.execute(
      `
      INSERT INTO prospects (
      name,
      email,
      phone,
      address,
      company,
      source,
      requirement,
      visiting_date,
      visiting_card
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        email || null,
        phone,
        address || null,
        company,
        source,
        requirement,
        visitingDate,
        uploadUrl,
      ],
    );

    return {
      success: true,
      message: "Prospect added",
    };
  } catch (error) {
    console.error("Insert Prospect Error:", error);

    return {
      success: false,
      message: "Failed to insert Prospect",
    };
  }
};

export const fetchProspects = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  const conn = await db.getConnection();

  try {
    const offset = (page - 1) * limit;

    const searchTerm = search ? `%${search}%` : `%`;

    const [rows]: any = await conn.execute(
      `
      SELECT * FROM prospects 
      WHERE name LIKE ?
      ORDER BY created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `,
      [searchTerm],
    );

    const [countResult]: any = await conn.execute(`
      SELECT COUNT(*) as total FROM prospects
    `);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    console.log(rows);

    return {
      success: true,
      data: rows as ProspectData[],
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  } catch (error: any) {
    console.error("Error fetching prospects:", error);

    return {
      success: false,
      message: error.message || "Failed to fetch prospects",
    };
  } finally {
    conn.release();
  }
};

export const fetchProspectDetails = async (Id: number) => {
  const conn = await db.getConnection();

  try {
    const [prospectRows]: any = await conn.execute(
      `SELECT * FROM prospects WHERE id = ?`,
      [Id],
    );

    const prospect = prospectRows[0] || null;

    return {
      success: true,
      data: prospect as ProspectData,
      message: "Client details fetched",
    };
  } catch (error) {
    console.error("Error fetching client details:", error);
    throw error;
  } finally {
    conn.release();
  }
};

export const updateProspect = async (
  prospectId: number,
  data: ProspectFormData,
) => {
  const conn = await db.getConnection();

  try {
    const [result]: any = await conn.execute(
      `
      UPDATE prospects
  SET
    name = ?,
    email = ?,
    phone = ?,
    address = ?,
    company = ?,
    source = ?,
    requirement = ?
  WHERE id = ?
  `,
      [
        data.name,
        data.email || null,
        data.phone,
        data.address || null,
        data.company || null,
        data.source,
        data.requirement,
        prospectId,
      ],
    );

    return {
      success: true,
      message: "Prospect updated successfully",
      affectedRows: result.affectedRows,
    };
  } catch (error) {
    console.error("Error updating prospect:", error);
    throw error;
  } finally {
    conn.release();
  }
};

// export const deleteClient = async (clientId: number) => {
//   const session = await getCurrentUserSafe();

//   const userId = session?.id;

//   if (
//     !userId ||
//     session.iss !== "thaverTechInvoiceGenerator" ||
//     session.role !== "admin"
//   ) {
//     return { success: false, message: "Unauthorized" };
//   }

//   const conn = await db.getConnection();

//   try {
//     const [result]: any = await conn.execute(
//       `DELETE FROM clients WHERE id = ?`,
//       [clientId],
//     );

//     if (result.affectedRows === 0) {
//       return { success: false, message: "Client not found" };
//     }

//     return {
//       success: true,
//       message: "Client Deleted",
//     };
//   } catch (error) {
//     console.error(error);
//     return { success: false, message: "Failed to delete client" };
//   } finally {
//     conn.release();
//   }
// };

export const deleteProspect = async (id: number) => {
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
      DELETE FROM prospects
      WHERE id = ?
      `,
      [id],
    );

    if (result.affectedRows === 0) {
      return {
        success: false,
        message: "Prospect not found",
      };
    }

    return {
      success: true,
      message: "Prospect deleted successfully.",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Failed to delete prospect.",
    };
  } finally {
    conn.release();
  }
};
