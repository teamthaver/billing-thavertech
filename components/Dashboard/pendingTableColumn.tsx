"use client"

import { Invoice } from "@/lib/types/dataTypes"
import { ColumnDef } from "@tanstack/react-table"
import ViewInvoicePopup from "../Invoice/viewInvoicePopup"

export const columns: ColumnDef<Invoice>[] = [
    {
        accessorKey: "invoice_id",
        header: "Invoice ID",
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("invoice_id")}</div>
        ),
        size: 150
    },
    {
        accessorKey: "client_name",
        header: "Client Name",
        cell: ({ row }) => (
            <div className="truncate" title={row.getValue("client_name") ? row.getValue("client_name") : "NA"}>
                {row.getValue("client_name") ? row.getValue("client_name") : "NA"}
            </div>
        ),
        size: 400
    },
    {
        accessorKey: "sub_total",
        header: "Subtotal",
        cell: ({ row }) => (
            <span>₹ {Number(row.getValue("sub_total")).toLocaleString()}</span>
        ),
        size: 120
    },
    {
        accessorKey: "grand_total",
        header: "Total",
        cell: ({ row }) => {
            const amount = Number(row.getValue("grand_total"));
            const status = row.original.status;

            let color = "text-gray-600";

            if (status === "paid") color = "text-green-600";
            else if (status === "pending") color = "text-orange-500";
            else if (status === "overdue") color = "text-red-600";

            return (
                <span className={`font-semibold ${color}`}>
                    ₹ {amount.toLocaleString()}
                </span>
            );
        },
        size: 120
    },
    {
        accessorKey: "total_items",
        header: () => (
            <div className="text-center w-full">Total Items</div>
        ),
        cell: ({ row }) => (
            <div className="text-center font-semibold w-full">
                {Number(row.getValue("total_items")).toLocaleString()}
            </div>
        ),
        size: 120

    },
    {
        accessorKey: "invoice_date",
        header: "Invoice Date",
        cell: ({ row }) => {
            const date = new Date(row.getValue("invoice_date"))
            return <span>{date.toLocaleDateString()}</span>
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const invoiceId = row.original.id

            return (
                <ViewInvoicePopup id={invoiceId} />
            )
        },
    }
]