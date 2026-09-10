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
    cell: ({ row }) => (
      <span className="">{row.getValue("email") ? row.getValue("email") : "NA"}</span>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="">{row.getValue("phone") ? row.getValue("phone") : "NA"}</span>
    ),
  },
  {
    accessorFn: (row) => {
      const city = row.city?.trim();
      const state = row.state?.trim();

      if (!city && !state) return "N/A";
      if (!city) return state;
      if (!state) return city;

      return `${city}, ${state}`;
    },
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
    cell: ({ row }) => (
      <span className="">{row.getValue("assigned_person") ? row.getValue("assigned_person") : "NA"}</span>
    ),
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
