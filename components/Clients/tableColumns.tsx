"use client";

import { ClientData } from "@/lib/types/dataTypes";
import { ColumnDef } from "@tanstack/react-table";
import ViewInvoices from "./ViewInvoices";
import ClientDocsDialog from "./ClientDocsDialog";

export const columns: ColumnDef<ClientData>[] = [
  {
    accessorKey: "company_name",
    header: "Company",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="">{row.getValue("email")}</span>,
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorFn: (row) => `${row.city}, ${row.state}`,
    id: "location",
    header: "Location",
  },
  {
    id: "gst_or_tax",
    header: "GST/TAX No",
    accessorFn: (row) => row.gst_number || row.tax_number,
    cell: ({ row }) => (
      <p className="text-xs font-mono">
        {row.original.gst_number && (
          <span className="text-blue-700 font-semibold">
            {row.original.gst_number}
          </span>
        )}
        {row.original.tax_number && (
          <span className="text-green-700 font-semibold">
            {row.original.tax_number}
          </span>
        )}
        {!row.original.gst_number && !row.original.tax_number && <span>-</span>}
      </p>
    ),
  },
  {
    accessorKey: "assigned_person",
    header: "Assigned Person",
  },
  {
    accessorKey: "id",
    header: "Action",
    cell: ({ row }) => {
      const id = Number(row.getValue("id"));

      return (
        <div className="flex items-center gap-2">
          <ViewInvoices id={id} />
          <ClientDocsDialog id={id} />
        </div>
      );
    },
  },
];
