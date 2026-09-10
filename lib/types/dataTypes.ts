export type User = {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: "admin" | "accounts" | "user";
};

export interface DocumentData {
  id: number;
  title: string;
  file: string;
  remarks: string;
  created_at: string;
}

export interface CompanyProfileData {
  id: number;
  title: string;
  file: string;
  remarks: string;
  created_at: string;
}

export interface CompanyProfileFormData {
  title: string;
  remarks: string;
  file?: File;
  currentFile?: string;
}
export interface ClientDocumentData {
  id: number;
  client_id: number;
  title: string;
  file: string;
  remarks: string;
  created_at: string;
}

export interface ClientDocumentFormData {
  client_id: number;
  title: string;
  remarks: string;
  file?: File;
  currentFile?: string;
}
export type ClientInput = {
  companyName: string;
  gstNumber?: string;
  taxNumber?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  email: string;
  phone: string;
  assignedPerson?: string;
  designation?: string;
  notes?: string;
  tds?: string;
};

export type ClientFormData = {
  companyName: string;
  gstNumber: string;
  taxNumber: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  email: string;
  phone: string;
  assignedPerson: string;
  designation: string;
  notes: string;
};

export type ClientData = {
  id: number;

  company_name: string;

  gst_number: string | null;
  tax_number: string | null;
  pan: string | null;

  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;

  email: string | null;
  phone: string | null;

  assigned_person: string | null;
  designation: string | null;

  notes: string | null;

  created_at: string; // ISO date
  updated_at: string; // ISO date
};

export type Options = {
  value: string;
  label: string;
};

export type ServiceOptions = {
  value: string;
  label: string;
};

export type InvoiceItem = {
  id: string;
  service: { label: string; value: string } | null;
  serviceId: number | null;
  hsn: string;
  expiry: Date | null;
  cost: string;
  narration: string;
};

export type InvoiceData = {
  clientId: number;
  invoiceType: "GST" | "NON_GST" | "NON_TAXABLE" | "CUSTOM_TAX";
  currency: "INR" | "USD";
  dollar_rate: number;
  invoiceId: string;
  invoiceDate: string | null;
  clientGst: string;
  tax_number: string;
  PONo: string;
  PODate: string | null;
  reference: string;
};

export type Service = {
  id: number;
  name: string;
  hsn_code: string;
  created_at: string;
  updated_at: string;
};

export type SellerCompany = {
  id: number;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  email: string;
  cin: string;
  gst: string;
  pan: string;
  created_at: Date;
  updated_at: Date;
};

export type Invoice = {
  id: number;
  invoice_id: string;
  client_id: number;

  client_name: string;
  client_gst_no: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
  client_country: string | null;
  client_pincode: string | null;

  tax_number: string;

  currency: string;
  sub_total: string;
  grand_total: string;

  status: "paid" | "pending";
  created_at: string;

  total_items?: number;
};

export type InvoiceApiResponse = {
  invoice: FetchedInvoice;
};

export type FetchedInvoice = {
  id: number;
  invoiceId: string;
  createdAt: string;

  subTotal: number;
  grandTotal: number;
  status: "paid" | "pending" | "cancelled";

  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;

  cgstRate: number;
  sgstRate: number;
  igstReate: number;
  customRate: number;

  currency: "INR" | "USD";
  poNo: string;
  poDate: string;
  reference: string;

  items: FetchedInvoiceItem[];
  client: Client;
  type: InvoiceType;
  invoiceDate: string;

  dollar_rate: number;
};

export type FetchedInvoiceItem = {
  id: number;
  serviceId: number;

  service: string;
  narration: string;
  hsn: string;

  cost: number;

  cgst: number;
  sgst: number;
  igst: number;

  expiry: string;
};

export type Client = {
  id: number;

  companyName: string;
  gstNumber: string;
  taxNumber: string;

  email: string;
  phone: string;

  address: string | null;

  city: string;
  state: string;
  pincode: string;
};

export type BankAccount = {
  id: number;
  company_id: number;

  account_name: string;
  account_number: string;

  ifsc_code: string;
  swift_code: string;
  bank_name: string;
  branch: string;

  created_at: string;
  updated_at: string;
};

export type UserData = {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: "admin" | "user" | "accounts";
  created_at: string;
};

export type SessionUser = {
  id: number;
  role: "admin" | "user" | "accounts";
  iss: string;
};

export type PendingInvoice = {
  id: number;
  invoice_id: string;
  client_id: number;
  sub_total: string;
  grand_total: string;
  created_at: string;
  status: "pending" | "paid";
  company_name: string;
  gst_number: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  total_items: number;
};

export type InvoiceServiceRow = {
  id: number;
  invoice_id: string;
  invoiceId: number;
  service_id: number;
  cost: string;
  expiry: string;
  status: "pending" | "active" | "expired";
  name: string;
  hsn_code: string;
};

export type PageProps = {
  searchParams: Promise<{
    page?: string;
    limit?: string;
  }>;
};

export type ClientStateReport = {
  client_id: number;
  client_name: string;

  total_amount: number;

  paid_amount: number;
  pending_amount: number;

  total_invoices: number;
  paid_invoices: number;
  pending_invoices: number;

  total_items: number;
};

export type ClientLocationReport = {
  client_id: number;
  client_name: string;

  client_city: string;
  client_state: string;

  total_amount: number;

  total_invoices: number;
  total_items: number;
};

export type ClientFull = {
  id: number;
  company_name: string;
  gst_number: string;
  tax_number: string;
  pan: string;
  assigned_person: string;
  designation: string;
  notes: string;

  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  pincode: string;
  created_at?: string;
};

export type ClientInvoice = {
  id: number;
  invoice_id: string;
  sub_total: number;
  grand_total: number;
  reference?: string;
};

export type ClientSummary = {
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
};

export type FullClientDetails = {
  client: ClientFull | null;
  invoices: Invoice[];
  summary: ClientSummary;
};

export type InvoiceType = "GST" | "NON_GST" | "NON_TAXABLE" | "CUSTOM_TAX";

export type PurchaseAdjustment = {
  bill_date: string | null;
  bill_no?: string;
  bill_file?: File | null;

  supplier_name?: string;
  supplier_gstin: string;

  item_name: string;
  hsn_code?: string;

  quantity?: number;
  rate?: number;

  taxable_amount: number | null;
  total_amount: number | null;

  cgst?: number;
  sgst?: number;
  igst?: number;

  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;

  place_of_supply?: string;
  itc_eligibility?: "eligible" | "blocked" | "partial";
};

export type FetchedAdjustment = {
  id: number;

  bill_date: string;
  bill_no: string;

  bill_file: string;

  supplier_name: string;
  supplier_gstin: string;

  item_name: string;
  hsn_code: string;

  quantity: number;
  rate: number;
  taxable_value: number;

  cgst: number;
  sgst: number;
  igst: number;

  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;

  total_amount: number;

  place_of_supply: string;
  itc_eligibility: "eligible" | "blocked" | "partial";

  created_at: string;
};

export type ProspectFormData = {
  visitingCard?: File | null;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  source: string;
  interest?: string;
  requirement: string;
  budget?: string;
  urgency?: string;
  status: "new" | "contacted" | "qualified" | "converted" | "dropped";
  visitingDate?: Date | null;
  assignedTo?: string;
  createdAt: Date;
};

export type ProspectData = {
  id: number;
  visitingCard?: File;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  source: string;
  interest?: string;
  requirement: string;
  budget?: string;
  urgency?: string;
  status: "new" | "contacted" | "qualified" | "converted" | "dropped";
  visiting_date?: Date | null;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  visiting_card: string;
};

export type ProspectDocumentData = {
  id: number;
  prospect_id: number;
  title: string;
  document: string;
  remarks?: string | null;
  created_at: string;
};

export interface ProspectDocumentGroup {
  title: string;
  documents: ProspectDocumentData[];
}

export type ProspectDocumentFormData = {
  title: string;
  document?: File | null;
  remarks?: string;
};

export type TaskType = {
  title: string;
  description: string;
  dueDate: string;
};

export type TaskFetched = {
  id: number;
  title: string;
  description: string;
  due_date: string;
  completed: number;
};

export type TaskResponseType = {
  success: boolean;
  data: TaskType[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
};
export type ProspectFollowUpFormData = {
  follow_up_date: string;
  remarks: string;
  status: "process" | "not_interested" | "converted";
};

export type ProspectFollowUpData = {
  id: number;
  prospect_id: number;
  follow_up_date: string;
  remarks: string | null;
  status: "process" | "not_interested" | "converted";
  created_at: string;
};
