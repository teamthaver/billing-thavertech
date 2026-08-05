import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function getCurrentUserSafe() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: "thaverTechInvoiceGenerator",
    });

    if (typeof decoded === "string") return null;

    if (!decoded.id || !decoded.role) return null;
    
    return {
      id: Number(decoded.id),
      iss: decoded.iss,
      role: decoded.role as "admin" | "user" | "accounts",
    };
  } catch {
    return null;
  }
}