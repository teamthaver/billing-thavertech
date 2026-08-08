"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { insertClientDocument } from "@/lib/actions/clientDocuments";

type Props = {
  clientId: number;
  onSuccess: () => Promise<void> | void;
};

type ClientDocumentForm = {
  title: string;
  remarks: string;
  file: File | null;
};

const AddClientDocumentPopup = ({ clientId, onSuccess }: Props) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [data, setData] = useState<ClientDocumentForm>({
    title: "",
    remarks: "",
    file: null,
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
        file: acceptedFiles[0],
      }));
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const result = await insertClientDocument({
      client_id: clientId,
      title: data.title,
      remarks: data.remarks,
      file: data.file ?? undefined,
    });

    if (result.success) {
      setOpen(false);

      setData({
        title: "",
        remarks: "",
        file: null,
      });

      router.refresh();
      await onSuccess();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);

        if (!value) {
          setData({
            title: "",
            remarks: "",
            file: null,
          });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Add Document</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Client Document</DialogTitle>

            <DialogDescription>
              Upload a document for this client.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            <div
              {...getRootProps()}
              className="border border-dashed rounded-lg h-44 flex items-center justify-center cursor-pointer"
            >
              <input {...getInputProps()} />

              {data.file ? (
                <div className="text-center">
                  <FileText className="mx-auto h-10 w-10 text-green-500" />
                  <p className="mt-2">{data.file.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <Image
                    src="/upload.svg"
                    width={50}
                    height={50}
                    alt="upload"
                    className="mb-3"
                  />

                  <p className="font-medium">Upload Client Document</p>

                  <p className="text-sm text-muted-foreground">
                    PDF, DOCX or Image (Max 10MB)
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Title</Label>

              <Input
                value={data.title}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label className="mb-2 block">Remarks</Label>

              <Input
                value={data.remarks}
                placeholder="Enter remarks"
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    remarks: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>

            <Button type="submit">Upload</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDocumentPopup;
