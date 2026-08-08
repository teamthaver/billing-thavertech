"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "./ui/button";

import { Label } from "./ui/label";
import { generateExcel } from "@/lib/actions/downloadAction";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BarChart,
  CircleUser,
  CreditCard,
  Download,
  FileText,
  Home,
  LogOutIcon,
  NotebookPen,
  UserPlus,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/lib/logout";
import { useAuth } from "./Users/roleContext";
import { Field, FieldGroup } from "./ui/field";

export function AppSidebar() {
  const user = useAuth();
  const [open, setOpen] = useState(false);

  const [startingMonth, setStartingMonth] = useState(4);
  const [endingMonth, setEndingMonth] = useState(4);

  const [startingYear, setStartingYear] = useState(2026);
  const [endingYear, setEndingYear] = useState(2026);

  useEffect(() => {
    if (
      endingYear < startingYear ||
      (endingYear === startingYear && endingMonth < startingMonth)
    ) {
      setEndingYear(startingYear);
      setEndingMonth(startingMonth);

      alert("Invalid Selection!!!");
    }
  }, [startingYear, startingMonth, endingYear, endingMonth]);

  const years = Array.from({ length: 2099 - 2026 + 1 }, (_, i) => 2026 + i);

  const handleDownload = async () => {
    const buffer = await generateExcel(
      startingMonth,
      startingYear,
      endingMonth,
      endingYear,
    );

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const months = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice-${months[startingMonth]}-${startingYear}-${months[endingMonth]}-${endingYear}.xlsx`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Sidebar
        className="h-[calc(100vh-3rem)] mt-12 flex flex-col py-4 rounded-2xl"
        variant="floating"
      >
        {/* Header */}
        <SidebarHeader className="flex flex-row items-end gap-2 px-4">
          <Image src="/logo.png" height={30} width={30} alt="logo" />

          <p className="font-bold text-2xl leading-none">
            Thaver<span className="text-red-700">tech</span>
          </p>
        </SidebarHeader>

        {/* Content */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>

            <SidebarMenu>
              <Link href="/dashboard">
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Home className="w-4 h-4" />
                    Dashboard
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Link>

              <SidebarMenuItem>
                <Link href="/dashboard/invoice">
                  <SidebarMenuButton>
                    <FileText className="w-4 h-4" />
                    Invoice
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Link href="/dashboard/proforma-invoice">
                  <SidebarMenuButton>
                    <FileText className="w-4 h-4" />
                    Pro Forma Invoice
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Link href="/dashboard/taxCredit">
                  <SidebarMenuButton>
                    <NotebookPen className="w-4 h-4" />
                    Tax Credit
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpen(true)}>
                  <Download className="w-4 h-4" />
                  Download GST
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Link href="/dashboard/clients">
                  <SidebarMenuButton>
                    <Users className="w-4 h-4" />
                    Clients
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Link href="/dashboard/prospects">
                  <SidebarMenuButton>
                    <Users className="w-4 h-4" />
                    Prospects
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Link href="/dashboard/companyProfile">
                  <SidebarMenuButton>
                    <Building2 className="w-4 h-4" />
                    Company Profile
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Link href="/dashboard/payments">
                  <SidebarMenuButton>
                    <CreditCard className="w-4 h-4" />
                    Payments
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Link href="/dashboard/reports">
                  <SidebarMenuButton>
                    <BarChart className="w-4 h-4" />
                    Reports
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Account Actions</SidebarGroupLabel>

            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/dashboard/account">
                  <SidebarMenuButton>
                    <CircleUser className="w-4 h-4" />
                    Account
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              {user?.role === "admin" && (
                <SidebarMenuItem>
                  <Link href="/dashboard/users">
                    <SidebarMenuButton>
                      <UserPlus className="w-4 h-4" />
                      Users
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} className="text-red-500">
                  <LogOutIcon className="w-4 h-4" />
                  Logout
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="flex flex-row justify-end"></SidebarFooter>
      </Sidebar>
      <Dialog open={open} onOpenChange={setOpen}>
        <form>
          <DialogContent
            className="
                          w-full
                          max-w-[95vw]
                          sm:max-w-md
                          lg:max-w-[40vw]
                          lg:h-[50vh]
                          h-[60vh] 
                          flex flex-col
                          p-4
                          overflow-y-auto
                          "
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Download Monthly GST Bill
              </DialogTitle>
              <DialogDescription className="m-0">
                Select a date range to filter results
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto flex flex-col justify-between px-6 py-4">
              <FieldGroup>
                <Field>
                  <Label>Starting Month</Label>
                  <div className="flex gap-4">
                    <Select
                      value={String(startingMonth)}
                      onValueChange={(value) => setStartingMonth(Number(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Starting month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Months</SelectLabel>
                          <SelectItem value="1">January</SelectItem>
                          <SelectItem value="2">February</SelectItem>
                          <SelectItem value="3">March</SelectItem>
                          <SelectItem value="4">April</SelectItem>
                          <SelectItem value="5">May</SelectItem>
                          <SelectItem value="6">June</SelectItem>
                          <SelectItem value="7">July</SelectItem>
                          <SelectItem value="8">August</SelectItem>
                          <SelectItem value="9">September</SelectItem>
                          <SelectItem value="10">October</SelectItem>
                          <SelectItem value="11">November</SelectItem>
                          <SelectItem value="12">December</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    <Select
                      value={String(startingYear)}
                      onValueChange={(value) => setStartingYear(Number(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Starting year" />
                      </SelectTrigger>

                      <SelectContent>
                        <div className="max-h-100 overflow-y-auto">
                          <SelectGroup>
                            <SelectLabel>Year</SelectLabel>

                            {years.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
                <Field>
                  <Label>Ending Month</Label>

                  <div className="flex gap-4">
                    <Select
                      onValueChange={(value) => setEndingMonth(Number(value))}
                      value={String(endingMonth)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Ending month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Months</SelectLabel>
                          <SelectItem value="1">January</SelectItem>
                          <SelectItem value="2">February</SelectItem>
                          <SelectItem value="3">March</SelectItem>
                          <SelectItem value="4">April</SelectItem>
                          <SelectItem value="5">May</SelectItem>
                          <SelectItem value="6">June</SelectItem>
                          <SelectItem value="7">July</SelectItem>
                          <SelectItem value="8">August</SelectItem>
                          <SelectItem value="9">September</SelectItem>
                          <SelectItem value="10">October</SelectItem>
                          <SelectItem value="11">November</SelectItem>
                          <SelectItem value="12">December</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    <Select
                      onValueChange={(value) => setEndingYear(Number(value))}
                      value={String(endingYear)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Ending year" />
                      </SelectTrigger>

                      <SelectContent>
                        <div className="max-h-100 overflow-y-auto">
                          <SelectGroup>
                            <SelectLabel>Year</SelectLabel>

                            {years.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
              </FieldGroup>

              <Button
                className="max-w-40 w-40 ml-auto"
                onClick={() => handleDownload()}
              >
                Download
              </Button>
            </div>
          </DialogContent>
        </form>
      </Dialog>
    </>
  );
}
