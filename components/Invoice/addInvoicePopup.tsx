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
import { Switch } from "@/components/ui/switch";

import { Button } from "../ui/button";
import { Edit, Lock, Plus, RefreshCcw, Trash } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CreatableSelect from "react-select/creatable";
import {
  ClientData,
  InvoiceData,
  InvoiceItem,
  InvoiceType,
  SellerCompany,
  Service,
  ServiceOptions,
} from "@/lib/types/dataTypes";
import Select from "react-select";
import {
  fetchInvoiceById,
  fetchServices,
  insertInvoice,
  markAsRenewed,
  updateInvoice,
} from "@/lib/actions/invoice";
import { useAuth } from "../Users/roleContext";
import { fetchClients } from "@/lib/actions/clients";
import { triggerInvoiceRefresh } from "./viewInvoicePopup";
import { invoiceString } from "@/lib/currentInvoiceNo";

type ClientOption = {
  label: string;
  value: number;
};

type CurrencySymbol = "₹" | "$";

type Option = {
  label: string;
  value: InvoiceType;
};

export const selectStyles = {
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
    pointerEvents: "auto",
  }),
};

const formatDate = (date: string | Date | null) => {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;

  return d.toLocaleDateString("en-CA");
};

const round = (val: number) => Math.round(val * 100) / 100;

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN").format(val);

export const selectClassNames = {
  control: ({ isFocused }: any) =>
    `h-10 min-h-0 flex w-full rounded-md border border-input bg-muted/50 px-3 text-sm 
     ${isFocused ? "ring-3 ring-ring/50" : ""}`,

  menu: () => "mt-1 rounded-md border border-input bg-popover shadow-md",

  option: ({ isFocused, isSelected }: any) =>
    `px-3 py-2 text-sm cursor-pointer rounded-sm ${
      isSelected
        ? "bg-primary text-primary-foreground"
        : isFocused
          ? "bg-accent text-accent-foreground"
          : ""
    }`,

  singleValue: () => "text-foreground",
  placeholder: () => "text-muted-foreground",
  input: () => "text-foreground",
  dropdownIndicator: () => "text-muted-foreground",
};

const AddInvoicePopup = ({
  ClientList,
  ServicesList,
  companyData,
  invoiceNo,
  id,
  mode,
}: {
  ClientList?: ClientData[];
  ServicesList?: Service[];
  companyData?: SellerCompany;
  invoiceNo?: string;
  id?: number;
  mode: "new" | "update" | "renew";
}) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState<CurrencySymbol>("₹");
  const [open, setOpen] = useState(false);
  const [customTax, setCustomTax] = useState(0);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const blocked = mode === "update";
  const [clients, setClients] = useState<ClientData[]>(ClientList || []);
  const [services, setServices] = useState<Service[]>(ServicesList || []);
  const [isLocked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const user = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const formattedClients: ClientOption[] = (clients || []).map(
    (client: any) => ({
      label: client.company_name,
      value: client.id,
    }),
  );

  const formattedServices: ServiceOptions[] = (services || []).map(
    (service: any) => ({
      label: service.name,
      value: String(service.id),
    }),
  );

  const invoiceTypeOptions: Option[] = [
    { label: "GST Invoice", value: "GST" },
    { label: "Non-GST Invoice", value: "NON_GST" },
    { label: "Non Taxable Invoice", value: "NON_TAXABLE" },
    { label: "Invoice with Custom Tax", value: "CUSTOM_TAX" },
  ];

  const initialData: InvoiceData = {
    clientId: 0,
    invoiceType: "GST",
    currency: "INR",
    dollar_rate: 0,
    invoiceId: invoiceNo || "",
    invoiceDate: new Date().toISOString().split("T")[0],
    clientGst: "",
    tax_number: "",
    PONo: "N/A",
    PODate: null,
    reference: "",
  };

  const initialItems: InvoiceItem[] = [
    {
      id: crypto.randomUUID(),
      service: null,
      serviceId: null,
      hsn: "",
      expiry: null,
      cost: "",
      narration: "",
    },
  ];

  const [data, setData] = useState<InvoiceData>(initialData);
  const [items, setItems] = useState<InvoiceItem[]>(initialItems);

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const resetForm = () => {
    setData(initialData);
    setItems([
      {
        id: crypto.randomUUID(),
        service: null,
        serviceId: null,
        hsn: "",
        expiry: null,
        cost: "",
        narration: "",
      },
    ]);
  };

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      invoiceId: invoiceNo || "",
    }));
  }, [invoiceNo]);

  const [bill, setBill] = useState({
    subTotal: 0,
    totalTax: 0,
    grandTotal: 0,
  });

  const companyState = companyData?.gst?.slice(0, 2);
  const clientState = data.clientGst?.slice(0, 2);

  const hasGST = !!data.clientGst;

  const isGST = data.invoiceType === "GST";
  const isCustomTax = data.invoiceType === "CUSTOM_TAX";

  const isTaxable = isGST || isCustomTax;

  const isIGST =
    isGST && companyState && clientState && companyState !== clientState;

  const igstAmount =
    data.invoiceType === "GST" ? round(isIGST ? bill.totalTax : 0) : 0;
  const cgstAmount =
    data.invoiceType === "GST" ? round(!isIGST ? bill.totalTax / 2 : 0) : 0;
  const sgstAmount =
    data.invoiceType === "GST" ? round(!isIGST ? bill.totalTax / 2 : 0) : 0;

  const taxRate =
    data.invoiceType === "GST"
      ? 18
      : data.invoiceType === "CUSTOM_TAX"
        ? customTax
        : 0;

  useEffect(() => {
    const subTotal = round(
      items.reduce((sum, item) => sum + Number(item.cost || 0), 0),
    );

    const totalTax = round((subTotal * taxRate) / 100);

    const grandTotal = subTotal + totalTax;

    setBill({
      subTotal,
      totalTax,
      grandTotal,
    });
  }, [items, data.clientGst, data.invoiceType, customTax]);

  useEffect(() => {
    if (!data.clientId) return;

    if (!data.clientGst && data.invoiceType === "GST") {
      setData((prev) => ({ ...prev, invoiceType: "NON_GST" }));
    }
  }, [data.clientId]);

  useEffect(() => {
    if (!open || !id) return;

    const loadData = async () => {
      const [res, clientData, servicesData, invoiceNo] = await Promise.all([
        fetchInvoiceById(id),
        fetchClients(),
        fetchServices(),
        invoiceString(),
      ]);
      if (
        !res.success ||
        !clientData.success ||
        !servicesData.success ||
        !invoiceNo
      ) {
        alert(res.message);
        return;
      }

      setClients(clientData.data!);
      setServices(servicesData.data);

      const data = res.data;

      const isLocked =
        data?.invoice.status === "paid" || data?.invoice.status === "cancelled";

      setLocked(mode === "update" ? isLocked : false);

      const baseData = {
        clientId: data?.invoice.client.id || 0,
        invoiceType: data?.invoice.type || "GST",
        currency: data?.invoice.currency || "INR",
        dollar_rate: data?.invoice.dollar_rate || 0,
        invoiceId: mode === "renew" ? invoiceNo : data?.invoice.invoiceId || "",
        invoiceDate:
          mode === "renew"
            ? new Date().toISOString().split("T")[0]
            : data?.invoice.invoiceDate || "",
        clientGst: data?.invoice.client.gstNumber || "",
        tax_number: data?.invoice.client.taxNumber || "",
        PONo: data?.invoice.poNo || "",
        PODate: mode === "renew" ? null : data?.invoice.poDate || null,
        reference: data?.invoice.reference || "",
      };

      setData(baseData);
      setCustomTax(data?.invoice.customRate || 0);

      const items = data?.invoice.items;

      if (items) {
        setItems(
          items.map((item: any) => ({
            id: crypto.randomUUID(),
            service: item.service
              ? {
                  label: item.service,
                  value: String(item.serviceId ?? item.service),
                }
              : null,
            serviceId: item.serviceId || null,

            igst: mode === "renew" ? null : (item.igst ?? null),
            cgst: mode === "renew" ? null : (item.cgst ?? null),
            sgst: mode === "renew" ? null : (item.sgst ?? null),
            expiry: mode === "renew" ? null : item.expiry || null,

            hsn: item.hsn || "",
            cost: item.cost?.toString() || "",
            narration: item.narration || "",
          })),
        );
      }
    };

    loadData();
  }, [open, mode, id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    try {
      if (mode === "new") {
        const res = await insertInvoice(data, items, customTax);
        if (!res.success) {
          alert(res.message);
          return;
        }
      } else if (mode === "update" && id) {
        const res = await updateInvoice(id, data, items, customTax);
        if (!res.success) {
          alert(res.message);
          return;
        }
        triggerInvoiceRefresh();
      } else if (mode === "renew" && id) {
        const renewed = await markAsRenewed(id);
        if (!renewed.success) {
          alert(renewed.message);
          return;
        }
        const res = await insertInvoice(data, items, customTax);
        if (!res.success) {
          alert(res.message);
          return;
        }
        triggerInvoiceRefresh();
      }

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (error) {
      alert("Something went wrong!!!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {user?.role !== "user" && (
        <>
          {mode === "new" && (
            <Button
              type="button"
              className="p-4"
              onClick={() => {
                setOpen(true);
              }}
            >
              <Plus /> Generate Invoice
            </Button>
          )}

          {mode === "update" && (
            <Edit
              size={32}
              className="text-primary hover:bg-secondary p-1 rounded-sm"
              onClick={() => {
                setOpen(true);
              }}
            />
          )}

          {mode === "renew" && (
            <Button
              type="button"
              className="p-2 h-8 rounded-sm "
              onClick={() => {
                setOpen(true);
              }}
            >
              <RefreshCcw /> Renew Invoice
            </Button>
          )}
        </>
      )}

      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!val) resetForm();
          setOpen(val);
        }}
      >
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
          {isLocked ? (
            <>
              <div className="flex flex-col items-center justify-center h-full px-4">
                {/* Icon */}
                <div className="rounded-full bg-muted p-4 mb-6">
                  <Lock className="w-6 h-6 text-foreground" />
                </div>

                {/* Content */}
                <div className="text-center space-y-4 max-w-sm mb-8">
                  <h2 className="text-3xl font-semibold text-foreground">
                    Invoice Locked
                  </h2>

                  <div className="space-y-2">
                    <p className="text-lg text-foreground">
                      This invoice cannot be edited.
                    </p>
                    <p className="text-base text-muted-foreground">
                      This Invoice has already been processed. All details are
                      locked to maintain record integrity.
                    </p>
                  </div>
                </div>

                {/* Actions */}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-xl">Invoice Details</DialogTitle>
                <DialogDescription>
                  Enter the details below to generate a new invoice in the
                  system.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <FieldGroup className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Select Client</FieldLabel>
                    <Select<ClientOption, false>
                      // isDisabled={blocked}
                      instanceId={`client`}
                      options={formattedClients}
                      value={formattedClients.find(
                        (option) => option.value === data.clientId,
                      )}
                      onChange={(selected) => {
                        const client = ClientList?.find(
                          (c) => c.id === Number(selected?.value),
                        );

                        setData((prev) => ({
                          ...prev,
                          clientId: selected?.value || 0,
                          clientGst: client?.gst_number || "",
                          tax_number: client?.tax_number || "",
                          reference: client?.assigned_person || "",
                        }));
                      }}
                      placeholder="Select Client..."
                      menuPortalTarget={mounted ? document.body : undefined}
                      menuPosition="fixed"
                      menuShouldBlockScroll={true}
                      unstyled
                      styles={selectStyles}
                      classNames={selectClassNames}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Invoice Type</FieldLabel>
                    <Select<Option, false>
                      instanceId="invoiceType"
                      options={invoiceTypeOptions}
                      value={
                        invoiceTypeOptions.find(
                          (option) => option.value === data.invoiceType,
                        ) || null
                      }
                      onChange={(selected) =>
                        setData((prev) => ({
                          ...prev,
                          invoiceType:
                            (selected?.value as InvoiceType) || "GST",
                        }))
                      }
                      placeholder="Select service..."
                      menuPortalTarget={mounted ? document.body : undefined}
                      menuPosition="fixed"
                      menuShouldBlockScroll={true}
                      unstyled
                      styles={selectStyles}
                      classNames={selectClassNames}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="InvoiceId">Invoice ID</Label>
                    <Input
                      id="invoiceId"
                      name="invoiceId"
                      placeholder="Invoice ID"
                      disabled
                      value={data.invoiceId}
                      className="h-10 mb-0 pb-0"
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          invoiceId: e.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="invoiceDate">Invoice Date</Label>
                    <Input
                      id="invoiceDate"
                      name="invoiceDate"
                      type="date"
                      required
                      value={
                        data.invoiceDate ? data.invoiceDate.slice(0, 10) : ""
                      }
                      className="h-10"
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          invoiceDate: e.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="clientGst">
                      {hasGST ? "Client GSTIN" : "Client Tax Number"}
                    </Label>
                    <Input
                      id="clientGst"
                      name="clientGst"
                      placeholder={hasGST ? "22AAAAA0000A1Z5" : "Tax Number"}
                      required
                      disabled
                      value={hasGST ? data.clientGst : data.tax_number}
                      className="h-10"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="poNo">PO No</Label>
                    <Input
                      id="poNo"
                      name="poNo"
                      placeholder="999999XXXX"
                      required
                      value={data.PONo}
                      className="h-10"
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          PONo: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="PODate">PO Date</Label>
                    <Input
                      type="date"
                      className="h-10"
                      value={data.PODate || ""}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          PODate: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      name="reference"
                      placeholder="Name"
                      required
                      value={data.reference}
                      className="h-10"
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          reference: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </FieldGroup>
                <div className="h-4"></div>

                <div className="grid grid-cols-4 py-2">
                  <div>
                    <Label className="text-lg font-semibold">
                      Billing Currency
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="inr">INR(₹)</Label>
                      <Switch
                        disabled={blocked}
                        id="invoice-currency"
                        checked={data.currency === "USD"}
                        onCheckedChange={(checked) => {
                          setCurrencySymbol(checked ? "$" : "₹");
                          setData((prev) => ({
                            ...prev,
                            currency: checked ? "USD" : "INR",
                          }));
                        }}
                      />
                      <Label htmlFor="dollar">Dollar($)</Label>
                    </div>
                  </div>

                  {data.currency === "USD" && (
                    <div>
                      <Field>
                        <Label htmlFor="reference">Dollar Rates (₹)</Label>
                        <Input
                          id="tax_rate"
                          name="tax_rate"
                          placeholder="Tax Rate"
                          required
                          value={data.dollar_rate}
                          className="h-10"
                          onChange={(e) => {
                            setData((prev) => ({
                              ...prev,
                              dollar_rate: Number(e.target.value),
                            }));
                          }}
                        />
                      </Field>
                    </div>
                  )}

                  {data.invoiceType === "CUSTOM_TAX" && (
                    <div>
                      <Field>
                        <Label htmlFor="reference">Tax Rates(%)</Label>
                        <Input
                          id="tax_rate"
                          name="tax_rate"
                          placeholder="Tax Rate"
                          required
                          value={customTax}
                          className="h-10"
                          onChange={(e) => {
                            setCustomTax(Number(e.target.value || 0));
                          }}
                        />
                      </Field>
                    </div>
                  )}
                </div>

                {items.map((item, index) => (
                  <FieldGroup
                    key={item.id}
                    className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 mt-4"
                  >
                    <Field>
                      <Label>Service Name</Label>

                      <CreatableSelect<ServiceOptions>
                        instanceId={`service-${index}`}
                        options={formattedServices}
                        value={item.service}
                        onChange={(selected) => {
                          const service = services?.find(
                            (c) => c.id === Number(selected?.value),
                          );

                          console.log(service, ServicesList);

                          setItems((prev) =>
                            prev.map((it) => {
                              if (it.id !== item.id) return it;

                              if (!selected) {
                                return {
                                  ...it,
                                  serviceId: null,
                                  service: null,
                                };
                              }

                              const value = selected.value;

                              if (!isNaN(Number(value))) {
                                return {
                                  ...it,
                                  serviceId: Number(value),
                                  service: selected,
                                  hsn: String(service?.hsn_code),
                                };
                              }

                              return {
                                ...it,
                                serviceId: null,
                                service: { label: value, value: value },
                              };
                            }),
                          );
                        }}
                        onInputChange={(input) => {
                          setInputValues((prev) => ({
                            ...prev,
                            [item.id]: input,
                          }));
                        }}
                        onBlur={() => {
                          const input = inputValues[item.id];

                          if (
                            !input ||
                            item.serviceId ||
                            input === item.service?.label
                          )
                            return;

                          setItems((prev) =>
                            prev.map((it) =>
                              it.id === item.id
                                ? {
                                    ...it,
                                    serviceId: null,
                                    service: { label: input, value: input },
                                  }
                                : it,
                            ),
                          );
                        }}
                        placeholder="Select service..."
                        menuPortalTarget={mounted ? document.body : undefined}
                        menuPosition="fixed"
                        menuShouldBlockScroll={true}
                        unstyled
                        styles={selectStyles}
                        classNames={selectClassNames}
                      />
                    </Field>

                    {/* HSN */}
                    <Field>
                      <Label>HSN code</Label>
                      <Input
                        value={item.hsn}
                        placeholder="HSN code"
                        className="h-10"
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it) =>
                              it.id === item.id
                                ? { ...it, hsn: e.target.value.toUpperCase() }
                                : it,
                            ),
                          )
                        }
                      />
                    </Field>

                    {/* Duration */}
                    <Field>
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={item.expiry ? formatDate(item.expiry) : ""}
                        className="h-10"
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it) =>
                              it.id === item.id
                                ? { ...it, expiry: new Date(e.target.value) }
                                : it,
                            ),
                          )
                        }
                      />
                    </Field>

                    {/* Cost */}
                    <Field>
                      <Label>Cost</Label>
                      <Input
                        value={item.cost}
                        placeholder="Cost"
                        className="h-10"
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it) =>
                              it.id === item.id
                                ? { ...it, cost: e.target.value }
                                : it,
                            ),
                          )
                        }
                      />
                    </Field>

                    {/* Delete */}
                    <Field className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="border border-muted rounded-lg group hover:bg-muted"
                      >
                        <Trash className="text-red-700 m-2 group-hover:text-primary" />
                      </button>
                    </Field>

                    <Field className="col-span-3">
                      <Label>Narration</Label>
                      <Input
                        value={item.narration}
                        placeholder="Narration about the service"
                        className="h-10"
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it) =>
                              it.id === item.id
                                ? { ...it, narration: e.target.value }
                                : it,
                            ),
                          )
                        }
                      />
                    </Field>
                  </FieldGroup>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    setItems((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        service: null,
                        serviceId: null,
                        igst: null,
                        cgst: null,
                        sgst: null,
                        hsn: "",
                        expiry: null,
                        cost: "",
                        narration: "",
                      },
                    ])
                  }
                >
                  + Add More
                </Button>

                {isTaxable ? (
                  <div className="mt-10">
                    <h1 className="text-xl font-semibold">GST Details</h1>

                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-3 items-center border-b pb-2">
                        <span className="">Tax Type</span>

                        <span className="flex items-center justify-center">
                          Amount ({currencySymbol})
                        </span>

                        <span className="font-medium text-right">
                          Rates (%)
                        </span>
                      </div>

                      {data.invoiceType === "CUSTOM_TAX" ? (
                        <div>
                          <div className="grid grid-cols-3 items-center border-b pb-2">
                            <span className="text-muted-foreground">
                              Custom Tax
                            </span>

                            <span className="text-muted-foreground flex items-center justify-center">
                              {currencySymbol}
                              {formatCurrency(bill.totalTax)}
                            </span>

                            <span className="font-medium text-right">
                              {customTax}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 items-center border-b pb-2">
                            <span className="text-muted-foreground">IGST</span>

                            <span className="text-muted-foreground flex items-center justify-center">
                              {currencySymbol}
                              {formatCurrency(igstAmount)}
                            </span>

                            <span className="font-medium text-right">
                              {isTaxable ? (isIGST ? "18" : "0") : "0"}%
                            </span>
                          </div>

                          <div className="grid grid-cols-3 items-center border-b pb-2">
                            <span className="text-muted-foreground">CGST</span>

                            <span className="text-muted-foreground flex items-center justify-center">
                              {currencySymbol}
                              {formatCurrency(cgstAmount)}
                            </span>

                            <span className="font-medium text-right">
                              {isTaxable ? (!isIGST ? "9" : "0") : "0"}%
                            </span>
                          </div>

                          <div className="grid grid-cols-3 items-center">
                            <span className="text-muted-foreground">SGST</span>

                            <span className="text-muted-foreground flex items-center justify-center">
                              {currencySymbol}
                              {formatCurrency(sgstAmount)}
                            </span>

                            <span className="font-medium text-right">
                              {isTaxable ? (!isIGST ? "9" : "0") : "0"}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-10">
                    <h1 className="text-xl font-semibold">
                      Tax Not Applicable
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      This is a non-taxable supply. No GST applied.
                    </p>
                  </div>
                )}
                <div className="mt-10">
                  <h1 className="text-xl font-semibold">Billing Details</h1>

                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Sub Total</span>
                      <span className="font-medium flex items-center">
                        {currencySymbol} {formatCurrency(bill.subTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Total Tax</span>
                      <span className="font-medium flex items-center">
                        {currencySymbol} {formatCurrency(bill.totalTax)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-primary">Grand Total</span>
                      <span className="font-medium flex items-center">
                        {currencySymbol} {formatCurrency(bill.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean Footer */}
              <div className="p-6 pt-4 flex justify-end gap-3">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Submit</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddInvoicePopup;
