"use server"

import db from "../dbPool";
import { getCurrentUserSafe } from "../sessionCheck";
import { ProspectData, TaskFetched, TaskType } from "../types/dataTypes";

async function uploadFile(file: File) {
    if (!file) {
        throw new Error("No file provided")
    }

    const apiForm = new FormData()
    apiForm.append("file", file)

    const res = await fetch("https://accounts.thavertech.com/upload/prospect", {
        method: "POST",
        headers: {
            Authorization: "Bearer thaverTech",
        },
        body: apiForm,
    })

    const data = await res.json()

    if (!res.ok) {
        throw new Error(data.error || "Upload failed")
    }

    return data.url
}

export const insertTask = async (data: TaskType) => {
    try {
        const {
            title,
            description,
            dueDate
        } = data;

        const [result] = await db.execute(
            `
      INSERT INTO tasks (
      title,
      description,
      due_date
      )
      VALUES (?, ?, ?)
      `,
            [
                title,
                description,
                dueDate
            ]
        );

        return {
            success: true,
            message: "Task added",
        };
    } catch (error) {
        console.error("Insert Task Error:", error);

        return {
            success: false,
            message: "Failed to insert Task",
        };
    }
};

export const fetchTasks = async (
    filter?: "overdue" | "completed" | "today" | "tomorrow" | "",
) => {

    const conn = await db.getConnection();

    try {

        let where = "";

        if (filter === "completed") {

            where = `
                WHERE completed = true
            `;

        } else if (filter === "today") {

            where = `
                WHERE completed = false
                AND DATE(due_date) = CURDATE()
            `;

        } else if (filter === "tomorrow") {

            where = `
                WHERE completed = false
                AND DATE(due_date) = CURDATE() + INTERVAL 1 DAY
            `;

        } else if (filter === "overdue") {

            where = `
                WHERE completed = false
                AND DATE(due_date) < CURDATE()
            `;

        }

        const [rows]: any = await conn.execute(
            `
            SELECT * FROM tasks
            ${where}
            ORDER BY completed ASC, due_date ASC
            `
        );

        const [countResult]: any = await conn.execute(
            `
            SELECT COUNT(*) as total
            FROM tasks
            ${where}
            `
        );

        return {
            success: true,
            data: rows as TaskFetched[],
            total: countResult[0].total,
        };

    } catch (error: any) {

        console.error("Error fetching tasks:", error);

        return {
            success: false,
            message: error.message || "Failed to fetch tasks",
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
            [Id]
        );

        const prospect = prospectRows[0] || null;

        return {
            success: true,
            data: prospect as ProspectData,
            message: "Client details fetched"
        };

    } catch (error) {
        console.error("Error fetching client details:", error);
        throw error;
    } finally {
        conn.release();
    }
};

export const updateTask = async (taskId: number, data: TaskType) => {
    const conn = await db.getConnection();

    try {
        const [result]: any = await conn.execute(
            `
            UPDATE taskss SET
            title,
            description,
            due_date
            )
            VALUES (?, ?, ?)
            WHERE id = ?
            `,
            [
                data.title,
                data.description || null,
                data.dueDate,
                taskId
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

export const markCompleted = async (taskId: number) => {
    const conn = await db.getConnection();

    try {
        const [result]: any = await conn.execute(
            `
            UPDATE tasks SET
            completed = true
            WHERE id = ?
            `,
            [
                taskId
            ]
        );

        return {
            success: true,
            message: "Task updated successfully",
            affectedRows: result.affectedRows
        };

    } catch (error) {
        console.error("Error updating task:", error);
        throw error;
    } finally {
        conn.release();
    }
};

export const deleteTask = async (taskId: number) => {
    const conn = await db.getConnection();

    try {
        const [result]: any = await conn.execute(
            `
            DELETE FROM tasks 
            WHERE id = ?
            `,
            [
                taskId
            ]
        );

        return {
            success: true,
            message: "Task deleted successfully",
            affectedRows: result.affectedRows
        };

    } catch (error) {
        console.error("Error deleting task:", error);
        throw error;
    } finally {
        conn.release();
    }
};

export const markAllCompleted = async () => {
    const conn = await db.getConnection();

    try {
        const [result]: any = await conn.execute(
            `
            UPDATE tasks SET
            completed = true
            `,
        );

        return {
            success: true,
            message: "Tasks updated successfully",
            affectedRows: result.affectedRows
        };

    } catch (error) {
        console.error("Error updating tasks:", error);
        throw error;
    } finally {
        conn.release();
    }
};
