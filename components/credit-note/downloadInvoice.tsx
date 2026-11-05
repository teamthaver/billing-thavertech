"use client"

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Button } from "../ui/button";
import { Field, FieldGroup } from '../ui/field';
import { Download } from 'lucide-react';
import { Label } from '../ui/label';
import { generateExcel } from '@/lib/actions/downloadAction';

const DownloadInvoice = () => {

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

      alert("Invalid Selection!!!")
    }
  }, [startingYear, startingMonth, endingYear, endingMonth]);

  const years = Array.from(
    { length: 2099 - 2026 + 1 },
    (_, i) => 2026 + i
  );

  const handleDownload = async () => {
    const buffer = await generateExcel(startingMonth, startingYear, endingMonth, endingYear);

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
      "Dec"
    ]

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice-${months[startingMonth]}-${startingYear}-${months[endingMonth]}-${endingYear}.xlsx`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (

    <div>
      <Button type="button" onClick={() => setOpen(true)} className='flex gap-2'> <Download /> Download GST</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <form>
          <DialogContent className="
                          w-full
                          max-w-[95vw]
                          sm:max-w-md
                          lg:max-w-[40vw]
                          lg:h-[50vh]
                          h-[60vh] 
                          flex flex-col
                          p-4
                          overflow-y-auto
                          ">
            <DialogHeader>
              <DialogTitle className='text-xl font-semibold'>Download Monthly GST Bill</DialogTitle>
              <DialogDescription className='m-0'>
                Select a date range to filter results
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto flex flex-col justify-between px-6 py-4">

              <FieldGroup>
                <Field>
                  <Label>Starting Month</Label>
                  <div className='flex gap-4'>

                    <Select
                      value={String(startingMonth)}
                      onValueChange={(value) => setStartingMonth(Number(value))}>
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
                      onValueChange={(value) => setStartingYear(Number(value))}>
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

                  <div className='flex gap-4'>
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

              <Button className='max-w-40 w-40 ml-auto' onClick={() => handleDownload()}>Download</Button>
            </div>

          </DialogContent>
        </form>
      </Dialog>
    </div >
  )
}

export default DownloadInvoice