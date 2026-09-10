"use client";

import { ProspectData } from "@/lib/types/dataTypes";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";

import EditProspectPopup from "./EditProspectsPopup";
import ProspectDocsDialog from "./ProspectDocsDialog";
import FollowUpDialog from "./FollowUpDialog";

import { deleteProspect } from "@/lib/actions/prospect";

export const columns: ColumnDef<ProspectData>[] = [
  {
    accessorKey: "name",
    header: "Name",
    size: 130,
  },

  {
    accessorKey: "email",
    header: "Email",
    size: 190,
    cell: ({ row }) => <>{row.getValue("email")}</>,
  },

  {
    accessorKey: "phone",
    header: "Phone",
    size: 140,
  },

  {
    accessorKey: "company",
    header: "Company",
    size: 140,
  },

  {
    accessorKey: "address",
    header: "Address",
    size: 160,
  },

  {
    accessorKey: "visiting_date",
    header: "Visiting Date",
    size: 140,
    cell: ({ row }) => {
      const value = row.getValue("visiting_date");

      if (!value) {
        return <>-</>;
      }

      const date = new Date(value as string);

      return <>{date.toLocaleDateString()}</>;
    },
  },

  {
    accessorKey: "id",
    header: "Action",
    size: 300,

    cell: ({ row }) => {
      const visitingCard = row.original.visiting_card;

      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          {/* Visiting Card */}
          {visitingCard && (
            <Eye
              size={16}
              className="shrink-0 cursor-pointer text-blue-600 hover:text-blue-800"
              onClick={() => window.open(visitingCard, "_blank")}
            />
          )}

          {/* Edit */}
          <div className="shrink-0">
            <EditProspectPopup prospect={row.original} />
          </div>

          {/* Delete */}
          <Trash2
            size={16}
            className="shrink-0 cursor-pointer text-red-600 hover:text-red-800"
            onClick={async () => {
              const confirmed = window.confirm(
                "Are you sure you want to delete this prospect?",
              );

              if (!confirmed) return;

              const result = await deleteProspect(row.original.id);

              if (result.success) {
                window.location.reload();
              } else {
                alert(result.message);
              }
            }}
          />

          {/* Documents */}
          <div className="shrink-0">
            <ProspectDocsDialog id={row.original.id} />
          </div>

          {/* Follow Up */}
          <div className="shrink-0">
            <FollowUpDialog prospectId={row.original.id} />
          </div>
        </div>
      );
    },
  },
];
