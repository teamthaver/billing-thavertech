"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Button } from "../ui/button";
import { Edit, FileText, Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../Users/roleContext";
import { ProspectFormData } from "@/lib/types/dataTypes";
import { insertProspect, updateProspect } from "@/lib/actions/prospect";
import Image from "next/image";
import { useDropzone } from "react-dropzone";

import { ProspectData } from "@/lib/types/dataTypes";

type Props = {
  id?: number;
  mode: "new" | "update";
  prospect?: ProspectData;
};

const AddProspectPopup = ({ id, mode, prospect }: Props) => {
  const router = useRouter();
  const user = useAuth();

  const initialProspectData: ProspectFormData = {
    name: "",
    phone: "",
    email: "",
    company: "",
    address: "",
    source: "website",
    interest: "",
    requirement: "",
    budget: "",
    urgency: "",
    status: "new",
    visitingDate: null as Date | null,
    assignedTo: "",
    createdAt: new Date(),
  };

  const [data, setData] = useState<ProspectFormData>(initialProspectData);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "new") {
      setData({ ...initialProspectData });
    }

    if (mode === "update" && prospect) {
      setData({
        name: prospect.name,
        phone: prospect.phone,
        email: prospect.email ?? "",
        company: prospect.company ?? "",
        address: prospect.address ?? "",
        source: prospect.source,
        interest: prospect.interest ?? "",
        requirement: prospect.requirement,
        budget: prospect.budget ?? "",
        urgency: prospect.urgency ?? "",
        status: prospect.status,
        visitingDate: prospect.visiting_date ?? null,
        assignedTo: prospect.assignedTo ?? "",
        createdAt: prospect.createdAt,
        visitingCard: null,
      });
    }
  }, [open, mode, prospect]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (mode === "new") {
      const res = await insertProspect(data);

      if (!res.success) {
        alert("Failed to insert");
        return;
      }
    } else if (mode === "update" && id) {
      const res = await updateProspect(id, data);

      if (!res.success) {
        alert("Failed to update");
        return;
      }
    }

    setOpen(false);
    router.refresh();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,

    maxSize: 5 * 1024 * 1024,

    accept: {
      "application/pdf": [],
      "image/*": [],
    },

    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];

      setData((prev) => ({
        ...prev,
        visitingCard: file || null,
      }));
    },

    onDropRejected: () => {
      alert("Only PDF or image files are allowed");
    },
  });

  return (
    <div>
      {user?.role !== "user" && (
        <>
          {mode === "new" ? (
            <>
              <Button
                type="button"
                className="p-4"
                onClick={() => {
                  setOpen(true);
                }}
              >
                <Plus /> Add Prospect
              </Button>
            </>
          ) : (
            <Edit
              size={16}
              className="my-2 cursor-pointer text-gray-400 hover:text-white"
              onClick={() => setOpen(true)}
            />
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="
                        w-full
                            max-w-[95vw]
                            sm:max-w-md
                            lg:max-w-[60vw]
                            lg:h-[70vh]
                            h-[80vh] 
                            flex flex-col
                            p-0
                            overflow-y-auto
                            "
        >
          <form onSubmit={handleSubmit}>
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-xl">
                {mode === "new"
                  ? "Add Prospect Details"
                  : "Edit Prospect Details"}
              </DialogTitle>
              <DialogDescription>
                {mode === "new"
                  ? "Enter the details below to register a new prospect."
                  : "Update the prospect information."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-2">
              <FieldLabel className="text-lg mt-4 text-primary">
                Company Details
              </FieldLabel>
              <FieldGroup className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div
                  className="text-12-regular h-36 flex cursor-pointer  flex-col items-center justify-center gap-3 rounded-md border border-dashed border-dark-500 bg-dark-400 p-4 my-2 w-full col-span-2"
                  {...getRootProps()}
                >
                  <input {...getInputProps()} />
                  {data.visitingCard ? (
                    <div className="flex flex-col space-y-2 items-center justify-center">
                      <div className="rounded-full bg-slate-800 h-12 w-12 flex items-center justify-center">
                        <FileText
                          className="w-6 h-6 text-green-500"
                          strokeWidth={1}
                        />
                      </div>
                      <p className="text-14-regular">
                        {data.visitingCard.name}
                      </p>
                      <Button
                        className="h-0 hover:bg-transparent hover:text-red-500"
                        variant="ghost"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();

                          setData((prev) => ({
                            ...prev,
                            visitingCard: null,
                          }));
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center file-upload_label">
                      <Image
                        src="/upload.svg"
                        width={40}
                        height={40}
                        alt="upload"
                      />
                      <p>Attach a copy of Visiting Card with the entry.</p>
                      <p>PDF & Image files only. (Max 5MB)</p>
                    </div>
                  )}
                </div>

                <Field>
                  <Label htmlFor="Name">Name</Label>
                  <Input
                    id="Name"
                    name="Name"
                    placeholder="Company"
                    required
                    value={data.name}
                    className="h-10"
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="999999XXXX"
                    value={data.phone}
                    className="h-10"
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    placeholder="ex@example.com"
                    value={data.email}
                    className="h-10"
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    placeholder="Company"
                    className="h-10"
                    value={data.company}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        company: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Company"
                    className="h-10"
                    value={data.address}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field>
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    name="source"
                    placeholder="e.g. Website, Visit"
                    className="h-10"
                    value={data.source}
                    type="text"
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        source: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field className="col-span-2">
                  <Label htmlFor="requirement">Requirement</Label>
                  <Input
                    id="requirement"
                    name="requirement"
                    placeholder="e.g. Quotation"
                    value={data.requirement}
                    className="h-10"
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        requirement: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field>
                  <Label htmlFor="visitingDate">Visiting date</Label>
                  <Input
                    id="visitingDate"
                    name="visitingDate"
                    placeholder="e.g. Website, Visit"
                    className="h-10"
                    value={
                      data.visitingDate
                        ? data.visitingDate.toISOString().slice(0, 10)
                        : ""
                    }
                    type="date"
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        visitingDate: e.target.value
                          ? new Date(e.target.value)
                          : null,
                      }))
                    }
                  />
                </Field>
              </FieldGroup>
            </div>

            {/* Clean Footer */}
            <div className="p-6 pt-4 flex justify-end gap-3">
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
    </div>
  );
};

export default AddProspectPopup;
