"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchProspectDocuments,
  deleteProspectDocument,
} from "@/lib/actions/prospectDocumentation";
import {
  ProspectDocumentGroup,
  ProspectDocumentData,
} from "@/lib/types/dataTypes";
import AddProspectDocumentPopup from "./AddProspectDocumentPopup";
import ViewProspectDocumentPopup from "./ViewProspectDocumentPopup";
import { Eye, Trash2 } from "lucide-react";
type Props = {
  id: number;
};

const ProspectDocsDialog = ({ id }: Props) => {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<ProspectDocumentGroup[]>([]);
  const [search, setSearch] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<
    ProspectDocumentData[]
  >([]);

  const loadDocuments = async () => {
    const result = await fetchProspectDocuments(id, 1, 10, search);

    if (result.success) {
      setDocuments(result.data);
    }
  };

  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open, search]);

  const handleView = (title: string, documents: ProspectDocumentData[]) => {
    setSelectedTitle(title);
    setSelectedDocuments(documents);
    setViewOpen(true);
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Docs
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Prospect Documents</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between mt-4">
            <div className="w-72">
              <Input
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <AddProspectDocumentPopup
              prospectId={id}
              onSuccess={loadDocuments}
            />
          </div>

          <div className="mt-6 border rounded-md overflow-hidden flex-1">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-2 text-left">S.No</th>
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Remarks</th>
                  <th className="p-2 text-left">Created At</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {documents.length > 0 ? (
                  documents.map((group, index) => {
                    const latestDocument = group.documents[0];

                    return (
                      <tr key={group.title} className="border-b">
                        {/* S.No */}
                        <td className="p-3">{index + 1}</td>

                        {/* Title */}
                        <td className="p-3 font-medium">{group.title}</td>

                        {/* Remarks */}
                        <td className="p-3">{latestDocument.remarks || "-"}</td>

                        {/* Created At */}
                        <td className="p-3">
                          {new Date(
                            latestDocument.created_at,
                          ).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-4">
                            <Eye
                              size={18}
                              className="cursor-pointer text-blue-600 hover:text-blue-800"
                              onClick={() =>
                                handleView(group.title, group.documents)
                              }
                            />

                            <Trash2
                              size={18}
                              className="cursor-pointer text-red-600 hover:text-red-800"
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  "Are you sure you want to delete this document?",
                                );

                                if (!confirmed) return;

                                const result = await deleteProspectDocument(
                                  latestDocument.id,
                                );

                                if (result.success) {
                                  await loadDocuments();
                                } else {
                                  alert(result.message);
                                }
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
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
      <ViewProspectDocumentPopup
        title={selectedTitle}
        documents={selectedDocuments}
        open={viewOpen}
        onOpenChange={setViewOpen}
        onDelete={async () => {
          await loadDocuments();

          const result = await fetchProspectDocuments(id, 1, 10, search);

          if (result.success) {
            const updatedGroup = result.data.find(
              (group: ProspectDocumentGroup) => group.title === selectedTitle,
            );

            setSelectedDocuments(updatedGroup?.documents ?? []);
          }
        }}
      />
    </>
  );
};

export default ProspectDocsDialog;
