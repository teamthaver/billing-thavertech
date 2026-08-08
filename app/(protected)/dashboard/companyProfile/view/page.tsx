"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

export default function ViewDocument() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const file = searchParams.get("file");

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-black">
      {/* Close Button */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 right-4 z-[9999] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-100"
      >
        <X size={22} className="text-black" />
      </button>

      {/* Image */}
      <img
        src={file ?? ""}
        alt="Company Profile"
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
      />
    </div>
  );
}
