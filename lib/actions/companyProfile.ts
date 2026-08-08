"use server";

import db from "../dbPool";
import { getCurrentUserSafe } from "../sessionCheck";
import { CompanyProfileData, CompanyProfileFormData } from "../types/dataTypes";

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

export const insertCompanyProfile = async (data: CompanyProfileFormData) => {
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
  INSERT INTO documents
  (title, file, remarks)
  VALUES (?, ?, ?)
  `,
      [data.title, fileUrl, data.remarks],
    );
    return {
      success: true,
      message: "Company profile added successfully.",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Failed to add company profile.",
    };
  }
};

export const fetchCompanyProfiles = async (
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
        d.id,
        d.title,
        d.file,
        d.remarks,
        d.created_at
      FROM documents d
      INNER JOIN (
        SELECT title, MAX(id) AS latest_id
        FROM documents
        WHERE title LIKE ?
        GROUP BY title
      ) latest
      ON d.id = latest.latest_id
      ORDER BY d.id DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
      `,
      [searchTerm],
    );

    const [count]: any = await conn.execute(
      `
      SELECT COUNT(DISTINCT title) AS total
      FROM documents
      WHERE title LIKE ?
      `,
      [searchTerm],
    );

    return {
      success: true,
      data: rows as CompanyProfileData[],
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
export const fetchCompanyProfileDetails = async (id: number) => {
  const [rows]: any = await db.execute(
    `
    SELECT *
    FROM documents
    WHERE id = ?
    `,
    [id],
  );

  return {
    success: true,
    data: rows[0] as CompanyProfileData,
  };
};

export const updateCompanyProfile = async (
  id: number,
  data: CompanyProfileFormData,
) => {
  try {
    let fileUrl = data.currentFile;

    if (data.file) {
      fileUrl = await uploadFile(data.file);
    }

    await db.execute(
      `
  UPDATE documents
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
      message: "Company profile updated successfully.",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Failed to update company profile.",
    };
  }
};

export const deleteCompanyProfile = async (id: number) => {
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
    DELETE FROM documents
    WHERE id = ?
    `,
    [id],
  );

  return {
    success: true,
    message: "Company profile deleted successfully.",
  };
};

export const fetchCompanyProfileFiles = async (title: string) => {
  const [rows]: any = await db.execute(
    `
    SELECT
      id,
      title,
      file,
      remarks,
      created_at
    FROM documents
    WHERE title = ?
    ORDER BY created_at DESC
    `,
    [title],
  );

  return {
    success: true,
    data: rows,
  };
};
