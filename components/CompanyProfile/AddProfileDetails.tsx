"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { FileText, Plus, Edit } from "lucide-react";
import {
  insertCompanyProfile,
  updateCompanyProfile,
} from "@/lib/actions/companyProfile";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CompanyProfileForm = {
  title: string;
  remarks: string;
  profileId: string;
  createdAt: string;
  file: File | null;
};

const AddCompanyProfilePopup = ({
  mode,
  id,
}: {
  mode: "new" | "update";
  id?: number;
}) => {
  const router = useRouter();

  const initialData: CompanyProfileForm = {
    title: "",
    remarks: "",
    profileId: "",
    createdAt: new Date().toISOString().slice(0, 10),
    file: null,
  };

  const [data, setData] = useState(initialData);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) {
      setData(initialData);
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    let result;
    if (mode === "new") {
      result = await insertCompanyProfile({
        title: data.title,
        remarks: data.remarks,
        file: data.file ?? undefined,
      });
    } else {
      result = await updateCompanyProfile(id!, {
        title: data.title,
        remarks: data.remarks,
        file: data.file ?? undefined,
        currentFile: "",
      });
    }

    if (result.success) {
      setOpen(false);
      router.refresh();
    } else {
      alert(result.message);
    }
  };

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

  return (
    <>
      {mode === "new" ? (
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create
        </Button>
      ) : (
        <Edit className="cursor-pointer" onClick={() => setOpen(true)} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl rounded-xl p-6">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {mode === "new"
                  ? "Create Company Profile"
                  : "Update Company Profile"}
              </DialogTitle>

              <DialogDescription>
                {mode === "new"
                  ? "Upload a company profile document."
                  : "Update the company profile document."}
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
                  <div className="text-center">
                    <Image
                      src="/upload.svg"
                      width={40}
                      height={40}
                      alt="upload"
                    />
                    <p>Upload Company Profile</p>
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
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                  placeholder="Enter remarks"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>

              <Button type="submit">
                {mode === "new" ? "Create" : "Update"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddCompanyProfilePopup;
