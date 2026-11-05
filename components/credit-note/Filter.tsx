"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useRouter, useSearchParams } from "next/navigation";

const Filter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFilter = searchParams.get("status") || "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }

    params.set("page", "1");

    router.push(`?${params.toString()}`);
  };

  return (
    <Select value={currentFilter} onValueChange={handleChange}>
      <SelectTrigger className="w-45">
        <SelectValue placeholder="Filter Invoice" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">All Invoice</SelectItem>
          <SelectItem value="paid">Paid Invoice</SelectItem>
          <SelectItem value="pending">Pending Invoice</SelectItem>
          <SelectItem value="cancelled">Cancelled Invoice</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default Filter;