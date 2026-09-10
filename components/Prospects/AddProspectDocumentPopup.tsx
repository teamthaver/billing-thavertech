"use client";

import { FormEvent, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { insertProspectDocument } from "@/lib/actions/prospectDocumentation";

type Props = {
  prospectId: number;
  onSuccess: () => void;
};

const AddProspectDocumentPopup = ({ prospectId, onSuccess }: Props) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [data, setData] = useState({
    title: "",
    document: null as File | null,
    remarks: "",
  });

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    maxSize: 10 * 1024 * 1024,

    accept: {
      "application/pdf": [],
      "image/*": [],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [],
    },

    onDrop: (acceptedFiles) => {
      setData((prev) => ({
        ...prev,
        document: acceptedFiles[0] ?? null,
      }));
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!data.title.trim()) {
      alert("Please enter document title.");
      return;
    }

    if (!data.document) {
      alert("Please select a document.");
      return;
    }

    const result = await insertProspectDocument(prospectId, {
      title: data.title,
      document: data.document,
      remarks: data.remarks,
    });

    if (result.success) {
      setOpen(false);

      setData({
        title: "",
        document: null,
        remarks: "",
      });

      await onSuccess();
      router.refresh();
    } else {
      alert(result.message);
    }
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Add Document
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add Prospect Document</DialogTitle>

              <DialogDescription>
                Upload a document for this prospect.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-6">
              {/* Document Upload */}
              <div
                {...getRootProps()}
                className="border border-dashed rounded-lg h-44 flex items-center justify-center cursor-pointer"
              >
                <input {...getInputProps()} />

                {data.document ? (
                  <div className="text-center">
                    <FileText className="mx-auto h-10 w-10 text-green-500" />

                    <p className="mt-2">{data.document.name}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Image
                      src="/upload.svg"
                      width={40}
                      height={40}
                      alt="upload"
                      className="mx-auto"
                    />

                    <p className="mt-2">Upload Document</p>

                    <p className="text-sm text-muted-foreground">
                      PDF, DOCX or Image (Max 10MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <Label className="mb-2 block">Title</Label>

                <Input
                  placeholder="Enter document title..."
                  value={data.title}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Remarks */}
              <div>
                <Label className="mb-2 block">Remarks</Label>

                <Input
                  placeholder="Enter remarks..."
                  value={data.remarks}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>

              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddProspectDocumentPopup;
