"use client";

import { ChevronRight, ChevronDown, Eye, Trash2 } from "lucide-react";
import { CompanyProfileData } from "@/lib/types/dataTypes";
import { fetchCompanyProfileFiles } from "@/lib/actions/companyProfile";
import { Fragment, useState } from "react";
import { deleteCompanyProfile } from "@/lib/actions/companyProfile";
import { useRouter } from "next/navigation";

type Props = {
  data: CompanyProfileData[];
};

const CompanyProfileTable = ({ data }: Props) => {
  const router = useRouter();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [files, setFiles] = useState<Record<number, any[]>>({});

  const handleExpand = async (id: number, title: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    if (!files[id]) {
      const result = await fetchCompanyProfileFiles(title);

      if (result.success) {
        setFiles((prev) => ({
          ...prev,
          [id]: result.data,
        }));
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full">
        <thead className="bg-secondary">
          <tr>
            <th className="p-3 text-left">S.No</th>
            <th className="p-3 text-left">Title</th>
            <th className="p-3 text-left">Published</th>
            <th className="p-3 text-left">Remarks</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <Fragment key={item.id}>
              <tr className="border-b">
                <td className="p-3">{index + 1}</td>

                <td className="p-3">
                  <div
                    className="cursor-pointer font-medium"
                    onClick={() => handleExpand(item.id, item.title)}
                  >
                    {item.title}
                  </div>
                </td>

                <td className="p-3">
                  {new Date(item.created_at).toLocaleDateString()}
                </td>

                <td className="p-3">{item.remarks}</td>

                {/* <td className="p-3 text-center">
                  <Trash2
                    size={18}
                    className="cursor-pointer text-red-600"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        "Are you sure you want to delete this file?",
                      );

                      if (!confirmed) return;

                      const result = await deleteCompanyProfile(item.title);

                      if (result.success) {
                        window.location.reload();
                      } else {
                        alert(result.message);
                      }
                    }}
                  />
                </td> */}
                <td className="p-3 text-center">
                  <Eye
                    size={18}
                    className="mx-auto cursor-pointer text-blue-600"
                    onClick={() => handleExpand(item.id, item.title)}
                  />
                </td>
              </tr>

              {expandedId === item.id && (
                <tr>
                  <td colSpan={5} className="bg-muted p-5">
                    {/* Header */}
                    <div className="mb-2 grid grid-cols-[4fr_2fr_3fr_1fr] rounded-md bg-secondary px-4 py-3 font-semibold">
                      <div>File Name</div>
                      <div>Published</div>
                      <div>Remarks</div>
                      <div className="text-center">Actions</div>
                    </div>

                    {/* File List */}
                    <div className="space-y-2">
                      {files[item.id]?.map((file) => (
                        <div
                          key={file.id}
                          className="grid grid-cols-[4fr_2fr_3fr_1fr] items-center rounded-md border px-4 py-3"
                        >
                          {/* File Name */}
                          <div className="truncate font-medium">
                            📄 {file.title}
                          </div>

                          {/* Published */}
                          <div>
                            {new Date(file.created_at).toLocaleDateString()}
                          </div>

                          {/* Remarks */}
                          <div>{file.remarks || "-"}</div>

                          {/* Actions */}
                          <div className="flex justify-center gap-4">
                            <Eye
                              className="cursor-pointer text-blue-600 hover:text-blue-800"
                              size={18}
                              onClick={() => window.open(file.file, "_blank")}
                            />

                            <Trash2
                              size={18}
                              className="cursor-pointer text-red-600"
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  "Are you sure you want to delete this file?",
                                );

                                if (!confirmed) return;

                                const result = await deleteCompanyProfile(
                                  file.id,
                                );

                                if (result.success) {
                                  setFiles((prev) => ({
                                    ...prev,
                                    [item.id]: prev[item.id].filter(
                                      (f: any) => f.id !== file.id,
                                    ),
                                  }));
                                } else {
                                  alert(result.message);
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CompanyProfileTable;
