"use client";

import { Eye, Trash2 } from "lucide-react";
import { deleteProspectDocument } from "@/lib/actions/prospectDocumentation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ProspectDocumentData } from "@/lib/types/dataTypes";

type Props = {
  title: string;
  documents: ProspectDocumentData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
};

const ViewProspectDocumentPopup = ({
  title,
  documents,
  open,
  onOpenChange,
  onDelete,
}: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title} Documents</DialogTitle>
        </DialogHeader>

        <div className="mt-4 overflow-hidden rounded-md border">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="p-3 text-left">S.No</th>
                <th className="p-3 text-left">Remarks</th>
                <th className="p-3 text-left">Created At</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {documents.length > 0 ? (
                documents.map((item, index) => (
                  <tr key={item.id} className="border-b">
                    {/* S.No */}
                    <td className="p-3">{index + 1}</td>

                    {/* Remarks */}
                    <td className="p-3">{item.remarks || "-"}</td>

                    {/* Created At */}
                    <td className="p-3">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-4">
                        {/* View document */}
                        <Eye
                          size={18}
                          className="cursor-pointer text-blue-600 hover:text-blue-800"
                          onClick={() => window.open(item.document, "_blank")}
                        />

                        {/* Delete document */}
                        <Trash2
                          size={18}
                          className="cursor-pointer text-red-600 hover:text-red-800"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "Are you sure you want to delete this document?",
                            );

                            if (!confirmed) return;

                            const result = await deleteProspectDocument(
                              item.id,
                            );

                            if (result.success) {
                              onDelete?.();
                            } else {
                              alert(result.message);
                            }
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No documents found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewProspectDocumentPopup;
