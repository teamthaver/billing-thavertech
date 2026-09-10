"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";
import { DocumentData } from "@/lib/types/dataTypes";
import { deleteCompanyProfile } from "@/lib/actions/companyProfile";
import { useRouter } from "next/navigation";

export const columns: ColumnDef<DocumentData>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "remarks",
    header: "Remarks",
    cell: ({ row }) => <span>{row.getValue("remarks")}</span>,
  },
  {
    accessorKey: "created_at",
    header: "Published",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return <span>{date.toLocaleDateString()}</span>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const router = useRouter();
      const document = row.original;

      return (
        <div className="flex items-center gap-3">
          {/* View */}
          <Eye
            size={18}
            className="cursor-pointer text-blue-600 hover:text-blue-800"
            onClick={() =>
              window.open(
                `/dashboard/companyProfile/view?file=${encodeURIComponent(document.file)}`,
                "_blank",
              )
            }
          />

          {/* Delete */}
        </div>
      );
    },
  },
];
