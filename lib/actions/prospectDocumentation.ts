"use server";

import db from "@/lib/dbPool";
import { getCurrentUserSafe } from "@/lib/sessionCheck";
import {
  ProspectDocumentData,
  ProspectDocumentFormData,
} from "@/lib/types/dataTypes";

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

export const insertProspectDocument = async (
  prospectId: number,
  data: ProspectDocumentFormData,
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
    if (!data.document) {
      return {
        success: false,
        message: "Please select a document.",
      };
    }

    const fileUrl = await uploadFile(data.document);

    console.log("Uploaded file URL:", fileUrl);

    const [result]: any = await conn.execute(
      `
     INSERT INTO prospect_documentation
(
  prospect_id,
  title,
  document,
  remarks
)
VALUES (?, ?, ?, ?)
      `,
      [prospectId, data.title, fileUrl, data.remarks || null],
    );

    return {
      success: true,
      message: "Document added successfully.",
      id: result.insertId,
    };
  } catch (error) {
    console.error("Error adding prospect document:", error);

    return {
      success: false,
      message: "Failed to add document.",
    };
  } finally {
    conn.release();
  }
};

export const fetchProspectDocuments = async (
  prospectId: number,
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
      SELECT
        id,
        prospect_id,
        title,
        document,
        remarks,
        created_at
      FROM prospect_documentation
      WHERE prospect_id = ?
        AND title LIKE ?
      ORDER BY created_at DESC, id DESC
      `,
      [prospectId, searchTerm],
    );

    const groupedDocuments: {
      title: string;
      documents: ProspectDocumentData[];
    }[] = [];

    for (const row of rows) {
      const existingGroup = groupedDocuments.find(
        (group) => group.title === row.title,
      );

      if (existingGroup) {
        existingGroup.documents.push(row);
      } else {
        groupedDocuments.push({
          title: row.title,
          documents: [row],
        });
      }
    }

    const paginatedGroups = groupedDocuments.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedGroups,
    };
  } catch (error) {
    console.error("Error fetching prospect documents:", error);

    return {
      success: false,
      message: "Failed to fetch documents.",
      data: [],
    };
  } finally {
    conn.release();
  }
};
export const deleteProspectDocument = async (documentId: number) => {
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
      DELETE FROM prospect_documentation
      WHERE id = ?
      `,
      [documentId],
    );

    if (result.affectedRows === 0) {
      return {
        success: false,
        message: "Document not found",
      };
    }

    return {
      success: true,
      message: "Document deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting prospect document:", error);

    return {
      success: false,
      message: "Failed to delete document",
    };
  } finally {
    conn.release();
  }
};
