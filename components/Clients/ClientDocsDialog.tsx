"use client";
import { fetchClientDocuments } from "@/lib/actions/clientDocuments";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AddClientDocumentPopup from "./AddClientDocumentPopup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { ClientDocumentData } from "@/lib/types/dataTypes";
import { Eye, Trash2 } from "lucide-react";
import ViewClientDocumentPopup from "./ViewClientDocumentPopup";

type Props = {
  id: number;
};

const ClientDocsDialog = ({ id }: Props) => {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<ClientDocumentData[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [search, setSearch] = useState("");

  const loadDocuments = async () => {
    const result = await fetchClientDocuments(id, 1, 10, search);

    if (result.success) {
      setDocuments(result.data);
    }
  };

  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open, search]);

  const handleView = (title: string) => {
    setSelectedTitle(title);
    setViewOpen(true);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Docs</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-full
                                max-w-[95vw]
                                sm:max-w-md
                                lg:max-w-[60vw]
                                lg:max-h-[80vh] 
                                h-[70vh]
                                flex flex-col
                                p-4
                                overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Client Documents
            </DialogTitle>

            <p className="text-sm text-muted-foreground">
              Manage and view all client documents.
            </p>
          </DialogHeader>

          {/* Top Actions */}
          <div className="mt-6 flex items-center justify-between">
            <div className="w-80">
              <Input
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <AddClientDocumentPopup clientId={id} onSuccess={loadDocuments} />
          </div>

          <div className="mt-10  overflow-hidden rounded-md border">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-1 text-left">S.No</th>
                  <th className="p-1 text-left">Title</th>
                  <th className="p-1 text-left">Published</th>
                  <th className="p-1 text-left">Remarks</th>
                  <th className="p-1 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {documents.length > 0 ? (
                  documents.map((item, index) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">
                        <span
                          className="cursor-pointer font-medium hover:text-primary"
                          onClick={() => handleView(item.title)}
                        >
                          {item.title}
                        </span>
                      </td>
                      <td>{new Date(item.created_at).toLocaleDateString()}</td>

                      <td className="p-3">{item.remarks}</td>
                      <td className="p-3 text-center">
                        <Eye
                          size={18}
                          className="mx-auto cursor-pointer text-blue-600"
                          onClick={() => handleView(item.title)}
                        />
                      </td>
                    </tr>
                  ))
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
          <ViewClientDocumentPopup
            clientId={id}
            title={selectedTitle}
            open={viewOpen}
            onOpenChange={setViewOpen}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientDocsDialog;
