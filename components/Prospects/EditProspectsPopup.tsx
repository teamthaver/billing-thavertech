"use client";

import { Pencil } from "lucide-react";
import AddProspectPopup from "./addProspects";
import { ProspectData } from "@/lib/types/dataTypes";

type Props = {
  prospect: ProspectData;
};

const EditProspectPopup = ({ prospect }: Props) => {
  return (
    <AddProspectPopup mode="update" id={prospect.id} prospect={prospect} />
  );
};

export default EditProspectPopup;
