"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  insertProspectFollowUp,
  fetchProspectFollowUps,
  convertProspectToClient,
} from "@/lib/actions/ProspectFollowUp";

import { ProspectFollowUpData } from "@/lib/types/dataTypes";

type Props = {
  prospectId: number;
  onSuccess?: () => void;
};

const FollowUpDialog = ({ prospectId, onSuccess }: Props) => {
  const [open, setOpen] = useState(false);

  const [followUps, setFollowUps] = useState<ProspectFollowUpData[]>([]);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    date: new Date().toISOString().split("T")[0],
    remarks: "",
    status: "process",
  });

  // Load follow-up history
  const loadFollowUps = async () => {
    setLoading(true);

    const result = await fetchProspectFollowUps(prospectId);

    if (result.success) {
      setFollowUps(result.data);
    } else {
      setFollowUps([]);
    }

    setLoading(false);
  };

  // Load history whenever dialog opens
  useEffect(() => {
    if (open) {
      loadFollowUps();
    }
  }, [open]);

  // Submit new follow-up
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (data.status === "converted") {
      const confirmed = window.confirm(
        "Are you sure you want to convert this prospect into a client?",
      );

      if (!confirmed) {
        return;
      }

      const result = await convertProspectToClient(prospectId);

      if (result.success) {
        alert("Prospect converted to client successfully.");

        setOpen(false);

        onSuccess?.();

        window.location.reload();
      } else {
        alert(result.message);
      }

      return;
    }

    const result = await insertProspectFollowUp(prospectId, {
      follow_up_date: data.date,
      remarks: data.remarks,
      status: data.status as "process" | "not_interested" | "converted",
    });

    if (result.success) {
      alert("Follow up added successfully.");

      setData({
        date: new Date().toISOString().split("T")[0],
        remarks: "",
        status: "process",
      });

      await loadFollowUps();

      onSuccess?.();
    } else {
      alert(result.message);
    }
  };

  return (
    <>
      {/* Follow Up Button */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 shrink-0 whitespace-nowrap px-2 text-xs"
        onClick={() => setOpen(true)}
      >
        Follow Up
      </Button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Prospect Follow Up</DialogTitle>

            <DialogDescription>
              Add follow-up details for this prospect.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="mt-6 space-y-5">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="followup-date">Follow Up Date</Label>

                <Input
                  id="followup-date"
                  type="date"
                  value={data.date}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="followup-remarks">Remarks</Label>

                <textarea
                  id="followup-remarks"
                  placeholder="Enter follow up remarks..."
                  value={data.remarks}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="followup-status">Status</Label>

                <select
                  id="followup-status"
                  value={data.status}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="process">Process</option>

                  <option value="not_interested">Not Interested</option>

                  <option value="converted">Converted</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>

                <Button type="submit">Submit</Button>
              </div>
            </div>
          </form>

          {/* Follow Up History */}
          <div className="mt-6 border-t pt-5">
            <h3 className="mb-3 text-sm font-semibold">Follow Up History</h3>

            {loading ? (
              <p className="text-sm text-muted-foreground">
                Loading follow ups...
              </p>
            ) : followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No follow ups found.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="p-2 text-left">Date</th>

                      <th className="p-2 text-left">Remarks</th>

                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {followUps.map((followUp) => (
                      <tr key={followUp.id} className="border-t">
                        <td className="p-2">
                          {new Date(
                            followUp.follow_up_date,
                          ).toLocaleDateString()}
                        </td>

                        <td className="p-2">{followUp.remarks || "-"}</td>

                        <td className="p-2">
                          {followUp.status === "not_interested"
                            ? "Not Interested"
                            : followUp.status === "converted"
                              ? "Converted"
                              : "Process"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FollowUpDialog;
