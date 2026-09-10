"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "../ui/button";
import { Check, Eye, Printer, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchInvoiceById, updateStatus } from "@/lib/actions/invoice";
import {
  BankAccount,
  FetchedInvoice,
  SellerCompany,
} from "@/lib/types/dataTypes";
import Image from "next/image";
import { fetchBankAccountData, fetchCompanyData } from "@/lib/actions/users";
import { useRouter } from "next/navigation";
import { useAuth } from "../Users/roleContext";
import { triggerClientRefresh } from "../Clients/ViewInvoices";
import AddInvoicePopup from "./addInvoicePopup";

export const formatIST = (date?: string | Date) => {
  if (!date) return "";

  // handle both string + Date
  const parsed =
    typeof date === "string"
      ? new Date(date.replace(" ", "T")) // fix non-ISO format
      : date;

  return parsed
    .toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "")
    .toUpperCase();
};

export const formatDateOnly = (date?: string | Date) => {
  if (!date) return "-";

  const parsed =
    typeof date === "string" ? new Date(date.replace(" ", "T")) : date;

  const day = parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  let month = parsed.toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "Asia/Kolkata",
  });

  month = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();

  const year = parsed.toLocaleDateString("en-GB", {
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return `${day}-${month}-${year}`;
};

export const numberToWordsUSD = (num: number): string => {
  if (num === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const getWords = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + getWords(n % 100) : "")
      );
    return "";
  };

  let result = "Dollar ";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const hundred = num;

  if (crore) result += getWords(crore) + " Crore ";
  if (lakh) result += getWords(lakh) + " Lakh ";
  if (thousand) result += getWords(thousand) + " Thousand ";
  if (hundred) result += getWords(hundred);

  return result.trim() + " Only";
};

export const numberToWordsINR = (num: number): string => {
  if (num === 0) return "Rupees Zero Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const getWords = (n: number): string => {
    if (n < 20) return ones[n];

    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    }

    if (n < 1000) {
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + getWords(n % 100) : "")
      );
    }

    if (n < 100000) {
      return (
        getWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + getWords(n % 1000) : "")
      );
    }

    if (n < 10000000) {
      return (
        getWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + getWords(n % 100000) : "")
      );
    }

    return (
      getWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + getWords(n % 10000000) : "")
    );
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = `Rupees ${getWords(rupees)}`;

  if (paise > 0) {
    result += ` and ${getWords(paise)} Paise`;
  }

  result += " Only";

  return result;
};

export const triggerInvoiceRefresh = () => {
  window.dispatchEvent(new Event("invoice-refresh"));
};

const ViewInvoicePopup = ({ id }: { id: number }) => {
  const [open, setOpen] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [invoiceData, setInvoiceData] = useState<FetchedInvoice | null>(null);
  const [companyData, setCompanyData] = useState<SellerCompany | null>(null);
  const [accountData, setAccountData] = useState<BankAccount | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const router = useRouter();

  const formatCurrency = (num?: number) =>
    num?.toLocaleString("en-IN", {
      style: "currency",
      currency: invoiceData?.currency || "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      const [invoiceRes, companyRes, accountRes] = await Promise.all([
        fetchInvoiceById(id),
        fetchCompanyData(),
        fetchBankAccountData(),
      ]);
      if (invoiceRes.data && companyRes.data && accountRes.data) {
        setCurrencySymbol(
          invoiceRes.data.invoice.currency === "INR" ? "₹" : "$",
        );
        setInvoiceData(invoiceRes.data.invoice);
        setCompanyData(companyRes.data);
        setAccountData(accountRes.data);
      } else {
        console.error("Failed to fetch data");
      }
    };
    fetchData();
  }, [open, id, refreshToken]);

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshToken((prev) => prev + 1);
    };

    window.addEventListener("invoice-refresh", handleRefresh);

    return () => {
      window.removeEventListener("invoice-refresh", handleRefresh);
    };
  }, []);

  const minRows = 20;
  const emptyRows = invoiceData
    ? Math.max(0, minRows - invoiceData.items.length)
    : 0;

  const handlePrint = () => {
    const content = document.getElementById("invoice-print")?.innerHTML;

    const printWindow = window.open("", "_blank");
    if (!printWindow || !content) return;

    const styles = Array.from(document.styleSheets)
      .map((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join("");
        } catch {
          return "";
        }
      })
      .join("");

    printWindow.document.write(`
    <html>
      <head>
        <title>${invoiceData?.invoiceId}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&family=Zain:ital,wght@0,200;0,300;0,400;0,700;0,800;0,900;1,300;1,400&display=swap" rel="stylesheet">

        <!-- Tailwind + existing styles -->
        <style>${styles}</style>

        <!--  PRINT LOCK STYLES -->
        <style>
  @page {
    size: A4;
    margin: 10mm;
  }

  body {
    margin: 1px;
    padding: 1px;
    font-family: 'Nunito Sans', sans-serif;
  }

  #companyName {
  font-weight: 700;
  font-size: 26px;   /* slightly reduced for print */
  line-height: 1;
}

#tagline {
  font-style: italic;
  font-weight: 600;
  font-size: 11px;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-left: -8px;
}

    #invoice-print div section div p{
    font-size: 13px !important;
    }

  #invoice-print {
    width: 100%;
    font-size: 12px !important;
    line-height: 1.4 !important;
  }


  /* headings */
  #invoice-print h1 { font-size: 20px !important; }
  #invoice-print h2 { font-size: 16px !important; }
  #invoice-print h3 { font-size: 14px !important; }

  /* table */
  #invoice-print table {
    width: 100%;
    border-top: 0.5px solid #000000;
    border-bottom: 0.5px solid #000000;
    font-size: 11px !important;
  }

  #invoice-print th{
  padding: 4px;
  border-bottom: 0.5px solid #000000;  
  }

  #invoice-print th,
  #invoice-print td {
  padding: 2px 4px;
  font-size: 11px !important;
  border-right: 0.5px solid #000000;
}

#invoice-print th:last-child,
#invoice-print td:last-child {
  border-right: 0;
}


  tr {
    page-break-inside: avoid;
  }

  #invoice-print p {
    margin: 2px 0;
  }

  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
      </head>

      <body>
        <div id="invoice-print">
          ${content}
        </div>
      </body>
    </html>
  `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const user = useAuth();

  const handleStatusChange = async () => {
    try {
      const res = await updateStatus(id, "paid");
      if (res.success) {
        router.refresh();
        triggerClientRefresh();
        setOpen(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const changeStatusPending = async () => {
    try {
      const res = await updateStatus(id, "pending");
      if (res.success) {
        router.refresh();
        triggerClientRefresh();
        setOpen(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <Button
        type="button"
        variant={"ghost"}
        className="no-print p-2"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Eye />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="
                        w-full
                            max-w-[95vw]
                            sm:max-w-md
                            lg:max-w-[60vw]
                            lg:h-[90vh]
                            h-[90vh] 
                            flex flex-col
                            p-0
                            overflow-y-auto
                            "
        >
          <DialogHeader className="no-print p-6 pb-2">
            <div className="flex items-center justify-start gap-2">
              <DialogTitle className="text-xl">Invoice Details</DialogTitle>
              <Printer
                onClick={handlePrint}
                size={32}
                className="text-primary hover:bg-secondary p-1 rounded-sm"
              />
              <AddInvoicePopup mode="update" id={id} />
              <AddInvoicePopup mode="renew" id={id} />
              {user?.role !== "user" && invoiceData?.status === "pending" && (
                <Button onClick={handleStatusChange}>
                  <Check /> Mark as Paid
                </Button>
              )}
              {user?.role !== "user" && invoiceData?.status === "paid" && (
                <Button onClick={changeStatusPending}>
                  <X /> Mark as Unpaid
                </Button>
              )}
            </div>
            <DialogDescription>
              Review complete invoice information including items, tax
              breakdown, and billing details.
            </DialogDescription>
          </DialogHeader>

          <div id="invoice-print" className="p-10 print:p-0">
            <div className="flex-1 border border-primary bg-[url('/light-logo-25.png')] bg-size-[200px_200px] bg-no-repeat bg-center">
              <header className="grid grid-cols-[20%_60%_20%] my-2 print:no-break">
                <div className="my-auto">
                  <Image src="/logo.png" height={60} width={60} alt="logo" />
                </div>

                <div className="mt-2 flex flex-col items-center text-center">
                  <p
                    id="companyName"
                    className="font-bold text-4xl leading-none"
                  >
                    Thaver Tech Private Limited
                  </p>
                  <h1 className="text-3xl mt-2 font-semibold">Tax Invoice</h1>
                </div>
              </header>

              <section className="grid grid-cols-2 border-t border-primary justify-between print:no-break">
                <div className="p-2 border-b border-r border-primary grid grid-cols-1 text-sm">
                  <p className="font-bold">{companyData?.name}</p>
                  <p>
                    {[
                      companyData?.address_line1,
                      companyData?.city,
                      companyData?.state && companyData?.pincode
                        ? `${companyData.state}-${companyData.pincode}`
                        : companyData?.state || companyData?.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "N/A"}
                  </p>
                  <p>GSTIN: {companyData?.gst}</p>
                </div>

                <div className="b-border grid grid-cols-1 text-sm">
                  <div className="grid grid-cols-[55%_45%] b-border h-full m-0">
                    <span className="py-1 font-medium border-r border-primary pl-2 h-full">
                      Invoice
                      <span className="text-xs font-bold">
                        : {invoiceData?.invoiceId}
                      </span>
                    </span>
                    <span className="py-1 pl-1 h-full">
                      Dated:{" "}
                      <span className="text-xs">
                        {formatDateOnly(invoiceData?.invoiceDate)}
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-[55%_45%] b-border">
                    <span className="py-1 font-medium border-r border-primary pl-2 h-full">
                      PO No<span>: {invoiceData?.poNo}</span>
                    </span>
                    <span className="py-1 pl-1 h-full">
                      PO Date:{" "}
                      <span className="text-xs">
                        {invoiceData?.poDate
                          ? formatDateOnly(invoiceData?.poDate)
                          : "N/A"}
                      </span>
                    </span>
                  </div>

                  <p className="font-medium pl-2">
                    Reference: {invoiceData?.reference}
                  </p>
                </div>

                <div className="grid grid-cols-1 border-r border-primary">
                  <div className="grid grid-cols-[60%_40%] b-border h-full m-0">
                    <span className="py-1 font-medium border-r border-primary pl-2 h-full">
                      Account No{" "}
                      <span className="font-bold">
                        : {accountData?.account_number}
                      </span>
                    </span>
                    <span className="py-1 pl-2 h-full">
                      IFSC: {accountData?.ifsc_code}
                    </span>
                  </div>
                  <div className="px-2 grid grid-cols-[100px_1fr] text-sm">
                    <p className="font-medium">Swift Code</p>
                    <p>: {accountData?.swift_code}</p>

                    <p className="font-medium">Bank Name</p>
                    <p>: {accountData?.bank_name}</p>

                    <p className="font-medium">Branch</p>
                    <p>: {accountData?.branch}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 text-sm p-2">
                  <p className="font-bold">
                    Buyer (Bill to) : {invoiceData?.client.companyName}
                  </p>

                  <p className="">
                    {invoiceData?.client.address}, {invoiceData?.client.city},{" "}
                    {invoiceData?.client.state}, {invoiceData?.client.pincode}
                  </p>

                  <p className="font-medium">
                    {invoiceData?.client.gstNumber ? (
                      `GST No: ${invoiceData?.client.gstNumber}`
                    ) : invoiceData?.client.taxNumber ? (
                      `Tax No: ${invoiceData?.client.taxNumber}`
                    ) : (
                      <span>-</span>
                    )}
                  </p>

                  <p className="">State Name: {invoiceData?.client.state}</p>
                </div>
              </section>

              <section className="">
                <table className="w-full border-t border-b border-primary border-collapse ">
                  <thead className="bg-secondary border-b border-primary print:bg-none">
                    <tr>
                      <th className="border-r border-primary p-2 w-16">S No</th>
                      <th className="border-r border-primary p-2 text-left">
                        Description of Services
                      </th>
                      <th className="border-r border-primary p-2  w-30">
                        HSN/SAC Code
                      </th>
                      <th className="p-2 w-30">Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoiceData?.items.map((item, i) => (
                      <tr
                        key={i}
                        className="text-center print:break-inside-avoid"
                      >
                        <td className="border-r border-primary p-1">{i + 1}</td>
                        <td className="border-r border-primary px-3 text-left">
                          <div className="flex flex-col">
                            <span className=" text-xs font-bold">
                              {item.service}
                            </span>
                            <span className="pl-1 text-xs font-light line-clamp-3 wrap-break-word">
                              {item.narration}
                            </span>
                          </div>
                        </td>
                        <td className="border-r border-primary p-1">
                          {item.hsn}
                        </td>
                        <td className="px-3">{formatCurrency(item.cost)}</td>
                      </tr>
                    ))}

                    {Array.from({ length: Math.max(0, emptyRows) }).map(
                      (_, i) => (
                        <tr key={`empty-${i}`} className="text-center">
                          <td className="border-r border-primary p-1">
                            &nbsp;
                          </td>
                          <td className="border-r border-primary p-1">
                            <p className="text-base font-bold"></p>
                            <p className="pl-1 text-xs font-light"></p>
                          </td>
                          <td className="border-r border-primary p-1"></td>
                          <td className=" p-1"></td>
                        </tr>
                      ),
                    )}
                    <tr className="font-bold  text-center">
                      <td className="border-r border-primary p-1"></td>
                      <td className="border-r border-primary p-1"></td>
                      <td className="border-r border-t border-primary p-1">
                        Total Amount ({invoiceData?.currency})
                      </td>
                      <td className="p-1 pr-2 border-t border-primary">
                        {formatCurrency(invoiceData?.subTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <div className="p-1">
                <p className="font-bold">
                  Taxable Amount:{" "}
                  {invoiceData?.currency === "INR"
                    ? numberToWordsINR(invoiceData?.subTotal || 0)
                    : numberToWordsUSD(invoiceData?.subTotal || 0)}
                </p>
              </div>

              <section className="print:no-break">
                <div className="grid grid-cols-[60%_40%]">
                  <div className="border-r border-primary">
                    <table className="w-full border-collapse text-center text-sm">
                      <thead>
                        <tr className="border-b border-t border-primary">
                          <th rowSpan={2} className="p-1 ">
                            Taxable Value
                          </th>

                          <th
                            colSpan={
                              invoiceData?.igst === 0 &&
                              invoiceData?.cgstRate &&
                              invoiceData?.sgstRate
                                ? 4
                                : 2
                            }
                            className="p-1 border border-primary"
                          >
                            Integrated Tax
                          </th>

                          <th
                            rowSpan={2}
                            className="p-1 border border-primary border-r-0"
                          >
                            Total Tax
                          </th>
                        </tr>

                        <tr className="border-b border-primary">
                          {invoiceData?.igst === 0 ? (
                            <>
                              {invoiceData?.cgstRate &&
                              invoiceData?.sgstRate ? (
                                <>
                                  <th className="p-1 border border-primary">
                                    CGST %
                                  </th>
                                  <th className="p-1 border border-primary">
                                    CGST
                                  </th>
                                  <th className="p-1 border border-primary">
                                    SGST %
                                  </th>
                                  <th className="p-1 border border-primary">
                                    SGST
                                  </th>
                                </>
                              ) : (
                                <>
                                  <th className="p-1 border border-primary">
                                    Tax Rate %
                                  </th>
                                  <th className="p-1 border border-primary">
                                    Tax Amt
                                  </th>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <th className="p-1 border border-primary">
                                IGST %
                              </th>
                              <th className="p-1 border border-primary">
                                IGST
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          <td className="p-1 border border-primary border-l-0">
                            {formatCurrency(invoiceData?.subTotal)}
                          </td>

                          {invoiceData?.igst === 0 ? (
                            <>
                              {invoiceData.cgstRate && invoiceData.sgstRate ? (
                                <>
                                  <td className="p-1 border border-primary">
                                    {invoiceData.cgstRate}%
                                  </td>
                                  <td className="p-1 border border-primary">
                                    {formatCurrency(invoiceData?.cgst)}
                                  </td>
                                  <td className="p-1 border border-primary">
                                    9%
                                  </td>
                                  <td className="p-1 border border-primary">
                                    {formatCurrency(invoiceData?.sgst)}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-1 border border-primary">
                                    {invoiceData.customRate}%
                                  </td>
                                  <td className="p-1 border border-primary">
                                    {formatCurrency(invoiceData?.totalTax || 0)}
                                  </td>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <td className="p-1 border border-primary">18%</td>
                              <td className="p-1 border border-primary">
                                {formatCurrency(invoiceData?.igst)}
                              </td>
                            </>
                          )}

                          <td className="p-1 border border-primary border-r-0 font-bold">
                            {invoiceData?.totalTax
                              ? formatCurrency(invoiceData.totalTax)
                              : formatCurrency(
                                  (invoiceData?.cgst || 0) +
                                    (invoiceData?.sgst || 0) +
                                    (invoiceData?.igst || 0),
                                )}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="w-full flex flex-col items-start p-2">
                      <p className="font-bold">
                        Grand Total Payable {invoiceData?.currency}(
                        {currencySymbol}):{" "}
                        {formatCurrency(invoiceData?.grandTotal || 0)}
                      </p>
                      <p className="font-bold">
                        In Words:{" "}
                        {invoiceData?.currency === "INR"
                          ? numberToWordsINR(invoiceData?.subTotal || 0)
                          : numberToWordsUSD(invoiceData?.subTotal || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-primary px-4 py-1 flex flex-col justify-between items-end">
                    <p className="uppercase">For Thaver tech private limited</p>
                    <p className="">Authorised Signatory</p>
                  </div>
                </div>
              </section>

              <div className="p-2 border-t border-primary text-xs font-semibold">
                Declaration: We declare that this invoice shows the actual price
                of the Services described and that all particulars are true and
                correct.
              </div>
            </div>

            <div className="px-1 flex justify-between">
              <p>This is a Computer Generated Invoice</p>
              <p>Subject to Haryana Jurisdiction</p>
            </div>
          </div>

          <div className="no-print p-6 pt-4 flex justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handlePrint}>
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewInvoicePopup;
