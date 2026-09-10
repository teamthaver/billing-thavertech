"use client";

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { Button } from "../ui/button";
import { Edit, Plus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchClientDetails, insertClient, updateClient } from "@/lib/actions/clients";
import { useAuth } from "../Users/roleContext";
import Select from "react-select";
import { Country, State, City } from "country-state-city";
import { selectClassNames, selectStyles } from "../Invoice/addInvoicePopup";
import { ClientFormData } from "@/lib/types/dataTypes";
import { triggerClientRefresh } from "./ViewInvoices";

type Option = {
    label: string;
    value: string;
};

const AddClientPopup = ({ id, mode }: {
    id?: number;
    mode: string;
}) => {

    const [country, setCountry] = useState<Option | null>(null);
    const [state, setState] = useState<Option | null>(null);
    const [city, setCity] = useState<Option | null>(null);

    const [countries, setCountries] = useState<Option[]>([]);
    const [states, setStates] = useState<Option[]>([]);
    const [cities, setCities] = useState<Option[]>([]);

    type TaxKey = "gstNumber" | "taxNumber";

    const [taxType, setTaxType] = useState({
        value: "gstNumber" as TaxKey,
        label: "GSTIN"
    })

    type TaxOption = {
        value: TaxKey;
        label: string;
    };

    const taxOption: TaxOption[] = [
        { value: "gstNumber", label: "GSTIN" },
        { value: "taxNumber", label: "TAX Number" }
    ]

    useEffect(() => {
        const allCountries = Country.getAllCountries().map((c) => ({
            label: c.name,
            value: c.isoCode,
        }));
        setCountries(allCountries);

        const india = allCountries.find((c) => c.value === "IN");
        if (india) setCountry(india);
    }, []);

    // Load states when country changes
    useEffect(() => {
        if (!country) return;

        const allStates = State.getStatesOfCountry(country.value).map((s) => ({
            label: s.name,
            value: s.isoCode,
        }));

        setStates(allStates);
        setState(null);
        setCities([]);
        setCity(null);
    }, [country]);

    // Load cities when state changes
    useEffect(() => {
        if (!country || !state) return;

        const allCities = City.getCitiesOfState(
            country.value,
            state.value
        ).map((c) => ({
            label: c.name,
            value: c.name,
        }));

        setCities(allCities);
        setCity(null);
    }, [state, country]);

    const router = useRouter();
    const user = useAuth()

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const initialClientFormData: ClientFormData = {
        companyName: "",
        gstNumber: "",
        taxNumber: "",
        pan: "",
        address: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
        email: "",
        phone: "",
        assignedPerson: "",
        designation: "",
        notes: "",
    };

    const [data, setData] = useState<ClientFormData>(initialClientFormData);

    const [open, setOpen] = useState(false)

    const [block, setBlock] = useState(false);

    useEffect(() => {
        if (open) {
            setData({ ...initialClientFormData });
            setTaxType
        }
    }, [open]);

    useEffect(() => {
        if (!id) return;
        if (mode === "update" && open) {
            const loadClientFormData = async () => {
                const res = await fetchClientDetails(id);
                setData({
                    companyName: res.data.company_name || "",
                    gstNumber: res.data.gst_number || "",
                    taxNumber: res.data.tax_number || "",
                    pan: res.data.pan || "",
                    address: res.data.address || "",
                    city: res.data.city || "",
                    state: res.data.state || "",
                    country: res.data.country || "",
                    pincode: res.data.pincode || "",
                    email: res.data.email || "",
                    phone: res.data.phone || "",
                    assignedPerson: res.data.assigned_person || "",
                    designation: res.data.designation || "",
                    notes: res.data.notes || "",
                })

                if (res.data.tax_number && res.data.tax_number.length > 0) {
                    setTaxType({ value: "taxNumber", label: "TAX Number" })
                }
                setBlock(true)
            }
            loadClientFormData();
        }
    }, [id, mode, open])

    useEffect(() => {
        if (!data.country || countries.length === 0) return;

        const foundCountry = countries.find(
            c => c.label === data.country
        );

        if (foundCountry) {
            setCountry(foundCountry);
        }
    }, [data.country, countries]);

    useEffect(() => {
        if (!data.state || states.length === 0) return;

        const foundState = states.find(
            s => s.label === data.state
        );

        if (foundState) {
            setState(foundState);
        }
    }, [data.state, states]);

    useEffect(() => {
        if (!data.city || cities.length === 0) return;

        const foundCity = cities.find(
            c => c.label === data.city
        );

        if (foundCity) {
            setCity(foundCity);
        }
    }, [data.city, cities]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (mode === "new") {

            const res = await insertClient(data);

            if (!res.success) {
                alert("Failed to insert");
                return;
            }
        } else if (mode === "update" && id) {

            const res = await updateClient(id, data);

            if (!res.success) {
                alert("Failed to update");
                return;
            }

            triggerClientRefresh()
        }

        setOpen(false);
        router.refresh();
    }

    return (
        <div>
            {user?.role !== "user" &&
                <>
                    {mode === "new" ?
                        <>
                            <Button type="button" className="p-4" onClick={() => { setOpen(true) }}>
                                <Plus /> Add Client
                            </Button>

                        </>
                        :
                        <Edit className="my-2" onClick={() => setOpen(true)} />
                    }
                </>
            }


            <Dialog open={open} onOpenChange={setOpen}>
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
                    <form onSubmit={handleSubmit}>
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle className="text-xl">Add Client Details</DialogTitle>
                            <DialogDescription>
                                Enter the details below to register a new client in the system.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-2">

                            <FieldLabel className="text-lg mt-4 text-primary">
                                Company Details
                            </FieldLabel>
                            <FieldGroup className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

                                <Field>
                                    <Label htmlFor="companyName">Company Name</Label>
                                    <Input id="companyName" name="companyName" placeholder="Company" required
                                        value={data.companyName}
                                        className="h-10"
                                        onChange={(e) =>
                                            setData(prev => ({
                                                ...prev,
                                                companyName: e.target.value
                                            }))
                                        }
                                    />
                                </Field>
                                <Field>
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" placeholder="ex@example.com"
                                        value={data.email}
                                        className="h-10"
                                        onChange={(e) =>
                                            setData(prev => ({
                                                ...prev,
                                                email: e.target.value
                                            }))
                                        }
                                    />
                                </Field>
                                <Field>
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input id="phone" name="phone" placeholder="999999XXXX"
                                        value={data.phone}
                                        className="h-10"
                                        onChange={(e) =>
                                            setData(prev => ({
                                                ...prev,
                                                phone: e.target.value
                                            }))
                                        }
                                    />
                                </Field>
                                <Field>
                                    <Label htmlFor="pan">PAN Number</Label>
                                    <Input id="pan" name="pan" placeholder="ABCDE1234F"
                                        className="h-10"
                                        value={data.pan}
                                        onChange={(e) =>
                                            setData(prev => ({
                                                ...prev,
                                                pan: e.target.value.toUpperCase()
                                            }))
                                        }
                                    />
                                </Field>

                                <Field>
                                    <Label htmlFor="phone">Tax Identification Type</Label>
                                    <Select<TaxOption>
                                        required
                                        isDisabled={block}
                                        instanceId={"tax-id"}
                                        options={taxOption}
                                        value={taxType}
                                        placeholder="Select tax ID type"
                                        onChange={(val) => {
                                            if (!val) return;

                                            setData(prev => ({
                                                ...prev,
                                                taxNumber: "",
                                                gstNumber: ""
                                            }));

                                            setTaxType({
                                                value: val.value,
                                                label: val.label
                                            });
                                        }}
                                        menuPortalTarget={mounted ? document.body : undefined}
                                        menuPosition="fixed"
                                        menuShouldBlockScroll={false}
                                        unstyled
                                        styles={selectStyles}
                                        classNames={selectClassNames}
                                    />
                                </Field>

                                <Field>
                                    <Label htmlFor={taxType.value}>{taxType.label}</Label>
                                    <Input id={taxType.value} name={taxType.value} placeholder={taxType.label}
                                        className="h-10"
                                        value={data[taxType.value as TaxKey]}
                                        type="text"
                                        onChange={(e) =>
                                            setData(prev => ({
                                                ...prev,
                                                [taxType.value as TaxKey]: e.target.value.toUpperCase()
                                            }))
                                        }
                                    />
                                </Field>
                                <Field>
                                    <Label htmlFor="address">Address</Label>
                                    <Input id="address" name="address" placeholder="Office Address" required
                                        value={data.address}
                                        className="h-10"
                                        onChange={(e) =>
                                            setData(prev => ({
                                                ...prev,
                                                address: e.target.value
                                            }))
                                        }
                                    />
                                </Field>

                                <Field>
                                    <Label>Country</Label>
                                    <Select
                                        required
                                        instanceId={"Country"}
                                        options={countries}
                                        value={country}
                                        placeholder="Select Country"
                                        onChange={(val) => {
                                            setCountry(val);

                                            setData((prev) => ({
                                                ...prev,
                                                country: val?.label || "",
                                                state: "",
                                                city: "",
                                            }));
                                        }}

                                        menuPortalTarget={mounted ? document.body : undefined}
                                        menuPosition="fixed"
                                        menuShouldBlockScroll={false}

                                        unstyled
                                        styles={selectStyles}
                                        classNames={selectClassNames}
                                    />
                                </Field>

                                <Field>
                                    <Label>State</Label>
                                    <Select
                                        required
                                        instanceId={"state"}
                                        options={states}
                                        value={state}
                                        placeholder="Select State"
                                        isDisabled={!country}
                                        onChange={(val) => {
                                            setState(val);

                                            setData((prev) => ({
                                                ...prev,
                                                state: val?.label || "",
                                                city: "",
                                            }));
                                        }}

                                        menuPortalTarget={mounted ? document.body : undefined}
                                        menuPosition="fixed"
                                        menuShouldBlockScroll={false}

                                        unstyled
                                        styles={selectStyles}
                                        classNames={selectClassNames}
                                    />
                                </Field>

                                <Field>
                                    <Label>City</Label>
                                    <Select
                                        required
                                        instanceId={"city"}
                                        options={cities}
                                        value={city}
                                        placeholder="Select City"
                                        isDisabled={!state}
                                        onChange={(val) => {
                                            setCity(val);

                                            setData((prev) => ({
                                                ...prev,
                                                city: val?.label || "",
                                            }));
                                        }}

                                        menuPortalTarget={mounted ? document.body : undefined}
                                        menuPosition="fixed"
                                        menuShouldBlockScroll={false}

                                        unstyled
                                        styles={selectStyles}
                                        classNames={selectClassNames}
                                    />
                                </Field>

                                <Field>
                                    <Label htmlFor="pincode">Pincode</Label>
                                    <Input id="pincode" name="pincode" placeholder="000000"
                                        value={data.pincode}
                                        className="h-10"
                                        onChange={(e) =>
                                            setData(prev => ({
                                                ...prev,
                                                pincode: e.target.value
                                            }))
                                        }
                                    />
                                </Field>
                            </FieldGroup>

                            <FieldLabel className="text-lg mt-4 text-primary">
                                Person Details
                            </FieldLabel>

                            <FieldGroup className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

                                <Field>
                                    <Label htmlFor="assignedPerson">Person</Label>
                                    <Input id="assignedPerson" name="assignedPerson" placeholder="Full Name"
                                        value={data.assignedPerson}
                                        className="h-10"
                                        onChange={(e) =>
                                            setData(prev => ({
                                                ...prev,
                                                assignedPerson: e.target.value
                                            }))
                                        }
                                    />
                                </Field>
                                <Field>
                                    <Label htmlFor="personDesignation">Person Designation</Label>
                                    <Input id="personDesignation" name="personDesignation" placeholder="Designation"
                                        value={data.designation}
                                        className="h-10"
                                        onChange={(e) =>
                                            setData(prev => ({
                                                ...prev,
                                                designation: e.target.value
                                            }))
                                        }
                                    />
                                </Field>
                                <Field>
                                    <Label htmlFor="notes">Notes</Label>
                                    <Input id="notes" name="notes" placeholder="Notes"
                                        value={data.notes}
                                        className="h-10"
                                        onChange={(e) =>
                                            setData(prev => ({
                                                ...prev,
                                                notes: e.target.value
                                            }))
                                        }
                                    />
                                </Field>
                            </FieldGroup>
                        </div>

                        {/* Clean Footer */}
                        <div className="p-6 pt-4 flex justify-end gap-3">
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Submit</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div >
    )
}

export default AddClientPopup