"use server";

import db from "../dbPool";
import { getCurrentUserSafe } from "../sessionCheck";
import { ClientDocumentData, ClientDocumentFormData } from "../types/dataTypes";

async function uploadFile(file: File) {
  if (!file) {
    throw new Error("No file provided");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://accounts.thavertech.com/upload/profile", {
    method: "POST",
    headers: {
      Authorization: "Bearer thaverTech",
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Upload failed");
  }

  return data.url;
}
export const insertClientDocument = async (data: ClientDocumentFormData) => {
  try {
    if (!data.file) {
      return {
        success: false,
        message: "Please select a file.",
      };
    }

    const fileUrl = await uploadFile(data.file);

    await db.execute(
      `
      INSERT INTO client_documents
      (client_id, title, file, remarks)
      VALUES (?, ?, ?, ?)
      `,
      [data.client_id, data.title, fileUrl, data.remarks],
    );

    return {
      success: true,
      message: "Document added successfully.",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Failed to add document.",
    };
  }
};
export const fetchClientDocuments = async (
  clientId: number,
  page = 1,
  limit = 10,
  search?: string,
) => {
  const conn = await db.getConnection();

  try {
    const offset = (page - 1) * limit;
    const searchTerm = search ? `%${search}%` : "%";

    const [rows]: any = await conn.execute(
      `
    SELECT cd.id,
       cd.client_id,
       cd.title,
       cd.file,
       cd.remarks,
       cd.created_at
FROM client_documents cd
INNER JOIN (
    SELECT
        title,
        MAX(id) AS latest_id
    FROM client_documents
    WHERE client_id = ?
      AND title LIKE ?
    GROUP BY title
) latest
ON cd.id = latest.latest_id
ORDER BY cd.id DESC
LIMIT ${Number(limit)} OFFSET ${Number(offset)}
      `,
      [clientId, searchTerm],
    );

    const [count]: any = await conn.execute(
      `
      SELECT COUNT(DISTINCT title) AS total
      FROM client_documents
      WHERE client_id = ?
        AND title LIKE ?
      `,
      [clientId, searchTerm],
    );

    return {
      success: true,
      data: rows as ClientDocumentData[],
      pagination: {
        total: count[0].total,
        totalPages: Math.ceil(count[0].total / limit),
        currentPage: page,
        limit,
      },
    };
  } finally {
    conn.release();
  }
};
export const fetchClientDocumentFiles = async (
  clientId: number,
  title: string,
) => {
  const [rows]: any = await db.execute(
    `
    SELECT
      id,
      client_id,
      title,
      file,
      remarks,
      created_at
    FROM client_documents
    WHERE client_id = ?
      AND title = ?
    ORDER BY created_at DESC
    `,
    [clientId, title],
  );

  return {
    success: true,
    data: rows as ClientDocumentData[],
  };
};
export const updateClientDocument = async (
  id: number,
  data: ClientDocumentFormData,
) => {
  try {
    let fileUrl = data.currentFile;

    if (data.file) {
      fileUrl = await uploadFile(data.file);
    }

    await db.execute(
      `
      UPDATE client_documents
      SET
        title = ?,
        file = ?,
        remarks = ?
      WHERE id = ?
      `,
      [data.title, fileUrl ?? null, data.remarks, id],
    );

    return {
      success: true,
      message: "Document updated successfully.",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Failed to update document.",
    };
  }
};
export const deleteClientDocument = async (id: number) => {
  const session = await getCurrentUserSafe();

  if (
    !session ||
    session.iss !== "thaverTechInvoiceGenerator" ||
    session.role !== "admin"
  ) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  await db.execute(
    `
    DELETE FROM client_documents
    WHERE id = ?
    `,
    [id],
  );

  return {
    success: true,
    message: "Document deleted successfully.",
  };
};
