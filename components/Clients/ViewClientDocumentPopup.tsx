"use client";

import { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  fetchClientDocumentFiles,
  deleteClientDocument,
} from "@/lib/actions/clientDocuments";

import { ClientDocumentData } from "@/lib/types/dataTypes";

type Props = {
  clientId: number;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ViewClientDocumentPopup = ({
  clientId,
  title,
  open,
  onOpenChange,
}: Props) => {
  const [documents, setDocuments] = useState<ClientDocumentData[]>([]);

  const loadDocuments = async () => {
    const result = await fetchClientDocumentFiles(clientId, title);

    if (result.success) {
      setDocuments(result.data);
    }
  };

  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open]);

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this file?",
    );

    if (!confirmed) return;

    const result = await deleteClientDocument(id);

    if (result.success) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } else {
      alert(result.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="p-3 text-left">File Name</th>
                <th className="p-3 text-left">Published</th>
                <th className="p-3 text-left">Remarks</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {documents.length > 0 ? (
                documents.map((file) => (
                  <tr key={file.id} className="border-b">
                    <td className="p-3 font-medium">📄 {file.title}</td>

                    <td className="p-3">
                      {new Date(file.created_at).toLocaleDateString()}
                    </td>

                    <td className="p-3">{file.remarks || "-"}</td>

                    <td className="p-3">
                      <div className="flex justify-center gap-4">
                        <Eye
                          size={18}
                          className="cursor-pointer text-blue-600 hover:text-blue-800"
                          onClick={() => window.open(file.file, "_blank")}
                        />

                        <Trash2
                          size={18}
                          className="cursor-pointer text-red-600 hover:text-red-800"
                          onClick={() => handleDelete(file.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="h-40 text-center text-muted-foreground"
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

export default ViewClientDocumentPopup;
