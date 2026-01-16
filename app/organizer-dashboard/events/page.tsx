"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrganizerEvents } from "@/lib/hooks/api/organizer.queries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, Calendar, MapPin, Users, DollarSign, Copy, Download, PhilippinePesoIcon, CreditCard, X, Upload } from "lucide-react";
import { formatDateToReadable } from "@/lib/formatters";
import toast from "react-hot-toast";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";

export default function OrganizerEventsPage() {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useOrganizerEvents();
    // handleSuccessResponse spreads the data object, so events is at the root level
    const events = data?.events || data?.data?.events || [];

    console.log("Events:", events);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'bank' | 'ewallet'>('bank');
    const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
    const [paymentDetails, setPaymentDetails] = useState({
        bank: {
            bankName: '',
            accountName: '',
            accountNumber: '',
        },
        gcash: {
            name: '',
            number: '',
        },
        grabpay: {
            name: '',
            number: '',
        },
        paymaya: {
            name: '',
            number: '',
        },
    });

    // Duplicate event mutation
    const duplicateMutation = useMutation({
        mutationFn: async (eventId: string) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch(`/api/organizer/events/${eventId}/duplicate`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to duplicate event");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Event duplicated successfully");
            queryClient.invalidateQueries({ queryKey: ["organizer", "events"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to duplicate event");
        },
    });

    // Export events
    const handleExport = async () => {
        try {
            if (!token) {
                toast.error("Not authenticated");
                return;
            }

            const response = await fetch("/api/organizer/events/export", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error("Failed to export events");
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `events-${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            
            toast.success("Events exported successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to export events");
        }
    };

    const handleDelete = async (eventId: string, eventTitle: string) => {
        if (!confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/organizer/events/${eventId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to delete event");
            }

            toast.success("Event deleted successfully");
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete event");
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-10 bg-muted rounded w-24 animate-pulse"></div>
                        <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
                    </div>
                </div>

                {/* Event Cards Skeleton */}
                <div className="grid gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 border rounded-md animate-pulse">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 bg-muted rounded w-64"></div>
                                        <div className="h-6 bg-muted rounded w-20"></div>
                                    </div>
                                    <div className="h-4 bg-muted rounded w-full"></div>
                                    <div className="h-4 bg-muted rounded w-3/4"></div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[...Array(4)].map((_, j) => (
                                            <div key={j} className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-muted rounded"></div>
                                                <div className="h-4 bg-muted rounded w-24"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="ml-4 flex items-center gap-2">
                                    {[...Array(4)].map((_, j) => (
                                        <div key={j} className="w-9 h-9 bg-muted rounded"></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">My Events</h1>
                    <p className="text-muted-foreground mt-2">Failed to load events</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">My Events</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage all your events ({events.length} total)
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Link href="/organizer-dashboard/events/create">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Event
                        </Button>
                    </Link>
                </div>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-12 border rounded-md">
                    <p className="text-muted-foreground mb-4">You haven't created any events yet</p>
                    <Link href="/organizer-dashboard/events/create">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Event
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="p-6 border rounded-md hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <h3 className="text-xl font-semibold">{event.title}</h3>
                                        <div className="flex items-center gap-1">
                                        <span
                                            className={`px-2 py-1 rounded-sm uppercase text-[10px] font-medium ${
                                                event.status === "published"
                                                    ? "bg-green-500/10 text-green-500"
                                                    : event.status === "draft"
                                                    ? "bg-gray-500/10 text-gray-500"
                                                    : "bg-red-500/10 text-red-500"
                                            }`}
                                        >
                                            {event.status}
                                        </span>
                                        <span
                                            className={`px-2 py-1 rounded-sm uppercase text-[10px] font-medium ${
                                                event.isFree
                                                    ? "bg-blue-500/10 text-blue-500"
                                                    : "bg-purple-500/10 text-purple-500"
                                            }`}
                                        >
                                            {event.isFree ? "Free" : "Paid"}
                                        </span>
                                        </div>
                                    </div>

                                    <p className="text-muted-foreground mb-4 line-clamp-2">
                                        {event.description}
                                    </p>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>{formatDateToReadable(event.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <span>
                                                {event.capacity
                                                    ? `${event.confirmedBookings || 0}/${event.capacity}`
                                                    : "Unlimited"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <PhilippinePesoIcon className="w-4 h-4 text-muted-foreground" />
                                            <span>{event.isFree ? "Free" : `₱${((event.price || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}</span>
                                        </div>
                                    </div>

                                    {/* Setup Payment Button for Paid Events */}
                                    {!event.isFree && (
                                        <div className="mt-4">
                                            <Button
                                                onClick={() => {
                                                    setSelectedEvent(event);
                                                    setSelectedPaymentMethods(event.paymentMethods || []);
                                                    const existingDetails = event.paymentDetails || {};
                                                    setPaymentDetails({
                                                        bank: existingDetails.bank || { bankName: '', accountName: '', accountNumber: '' },
                                                        gcash: existingDetails.gcash || { name: '', number: '' },
                                                        grabpay: existingDetails.grabpay || { name: '', number: '' },
                                                        paymaya: existingDetails.paymaya || { name: '', number: '' },
                                                    });
                                                    setPaymentModalOpen(true);
                                                }}
                                                className="bg-purple-500 hover:bg-purple-600 text-white"
                                            >
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                {event.status === "draft" ? "Setup Payment Method" : "Manage Payment Methods"}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    <Link href={`/events/${event.slug}`}>
                                        <Button variant="outline" size="sm">
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Link href={`/organizer-dashboard/events/${event.id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => duplicateMutation.mutate(event.id)}
                                        disabled={duplicateMutation.isPending}
                                        title="Duplicate Event"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(event.id, event.title)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Payment Setup Modal */}
            {paymentModalOpen && selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/80" onClick={() => {
                        setPaymentModalOpen(false);
                        setSelectedEvent(null);
                        setSelectedPaymentMethods([]);
                        setActiveTab('bank');
                    }}></div>
                    <div className="relative bg-background border rounded-md p-6 w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">
                                {selectedEvent?.status === "draft" ? "Setup Payment Method" : "Manage Payment Methods"}
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setPaymentModalOpen(false);
                                    setSelectedEvent(null);
                                    setSelectedPaymentMethods([]);
                                    setActiveTab('bank');
                                }}
                                className="h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Event: <span className="font-medium">{selectedEvent.title}</span>
                                </p>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Price: <span className="font-medium">₱{((selectedEvent.price || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </p>
                                {selectedEvent.status === "draft" && (
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Select payment methods to configure and publish this event.
                                    </p>
                                )}
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 border-b">
                                <button
                                    onClick={() => setActiveTab('bank')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                                        activeTab === 'bank'
                                            ? 'border-b-2 border-purple-500 text-purple-500'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Bank
                                </button>
                                <button
                                    onClick={() => setActiveTab('ewallet')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                                        activeTab === 'ewallet'
                                            ? 'border-b-2 border-purple-500 text-purple-500'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    E-Wallet
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="space-y-3 min-h-[200px]">
                                {activeTab === 'bank' && (
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPaymentMethods.includes('bank_transfer')}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedPaymentMethods([...selectedPaymentMethods, 'bank_transfer']);
                                                    } else {
                                                        setSelectedPaymentMethods(selectedPaymentMethods.filter(m => m !== 'bank_transfer'));
                                                    }
                                                }}
                                                className="w-4 h-4"
                                            />
                                            <div>
                                                <p className="font-medium">Bank Transfer</p>
                                                <p className="text-xs text-muted-foreground">Direct bank deposit</p>
                                            </div>
                                        </label>
                                        
                                        {selectedPaymentMethods.includes('bank_transfer') && (
                                            <div className="ml-7 space-y-3 p-4 border rounded-md bg-muted/20">
                                                <FormSelect
                                                    label="Bank"
                                                    value={paymentDetails.bank.bankName}
                                                    onChange={(e) => setPaymentDetails({
                                                        ...paymentDetails,
                                                        bank: { ...paymentDetails.bank, bankName: e.target.value }
                                                    })}
                                                    options={[
                                                        { value: '', label: 'Select Bank' },
                                                        { value: 'bpi', label: 'BPI (Bank of the Philippine Islands)' },
                                                        { value: 'bdo', label: 'BDO (Banco de Oro)' },
                                                        { value: 'metrobank', label: 'Metrobank' },
                                                        { value: 'landbank', label: 'Land Bank of the Philippines' },
                                                        { value: 'security_bank', label: 'Security Bank' },
                                                        { value: 'unionbank', label: 'UnionBank' },
                                                        { value: 'chinabank', label: 'China Bank' },
                                                        { value: 'rcbc', label: 'RCBC' },
                                                        { value: 'pnb', label: 'PNB (Philippine National Bank)' },
                                                        { value: 'other', label: 'Other' },
                                                    ]}
                                                    required
                                                />
                                                <FormInput
                                                    label="Account Name"
                                                    value={paymentDetails.bank.accountName}
                                                    onChange={(e) => setPaymentDetails({
                                                        ...paymentDetails,
                                                        bank: { ...paymentDetails.bank, accountName: e.target.value }
                                                    })}
                                                    placeholder="Enter account name"
                                                    required
                                                />
                                                <FormInput
                                                    label="Account Number"
                                                    value={paymentDetails.bank.accountNumber}
                                                    onChange={(e) => setPaymentDetails({
                                                        ...paymentDetails,
                                                        bank: { ...paymentDetails.bank, accountNumber: e.target.value }
                                                    })}
                                                    placeholder="Enter account number"
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'ewallet' && (
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPaymentMethods.includes('gcash')}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedPaymentMethods([...selectedPaymentMethods, 'gcash']);
                                                    } else {
                                                        setSelectedPaymentMethods(selectedPaymentMethods.filter(m => m !== 'gcash'));
                                                    }
                                                }}
                                                className="w-4 h-4"
                                            />
                                            <div>
                                                <p className="font-medium">GCash</p>
                                                <p className="text-xs text-muted-foreground">Pay via GCash wallet</p>
                                            </div>
                                        </label>
                                        
                                        {selectedPaymentMethods.includes('gcash') && (
                                            <div className="ml-7 space-y-3 p-4 border rounded-md bg-muted/20">
                                                <FormInput
                                                    label="GCash Name"
                                                    value={paymentDetails.gcash.name}
                                                    onChange={(e) => setPaymentDetails({
                                                        ...paymentDetails,
                                                        gcash: { ...paymentDetails.gcash, name: e.target.value }
                                                    })}
                                                    placeholder="Enter GCash account name"
                                                    required
                                                />
                                                <FormInput
                                                    label="GCash Number"
                                                    value={paymentDetails.gcash.number}
                                                    onChange={(e) => setPaymentDetails({
                                                        ...paymentDetails,
                                                        gcash: { ...paymentDetails.gcash, number: e.target.value }
                                                    })}
                                                    placeholder="Enter GCash mobile number"
                                                    required
                                                />
                                            </div>
                                        )}
                                        
                                        <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPaymentMethods.includes('grab_pay')}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedPaymentMethods([...selectedPaymentMethods, 'grab_pay']);
                                                    } else {
                                                        setSelectedPaymentMethods(selectedPaymentMethods.filter(m => m !== 'grab_pay'));
                                                    }
                                                }}
                                                className="w-4 h-4"
                                            />
                                            <div>
                                                <p className="font-medium">GrabPay</p>
                                                <p className="text-xs text-muted-foreground">Pay via GrabPay wallet</p>
                                            </div>
                                        </label>
                                        
                                        {selectedPaymentMethods.includes('grab_pay') && (
                                            <div className="ml-7 space-y-3 p-4 border rounded-md bg-muted/20">
                                                <FormInput
                                                    label="GrabPay Name"
                                                    value={paymentDetails.grabpay.name}
                                                    onChange={(e) => setPaymentDetails({
                                                        ...paymentDetails,
                                                        grabpay: { ...paymentDetails.grabpay, name: e.target.value }
                                                    })}
                                                    placeholder="Enter GrabPay account name"
                                                    required
                                                />
                                                <FormInput
                                                    label="GrabPay Number"
                                                    value={paymentDetails.grabpay.number}
                                                    onChange={(e) => setPaymentDetails({
                                                        ...paymentDetails,
                                                        grabpay: { ...paymentDetails.grabpay, number: e.target.value }
                                                    })}
                                                    placeholder="Enter GrabPay mobile number"
                                                    required
                                                />
                                            </div>
                                        )}
                                        
                                        <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPaymentMethods.includes('paymaya')}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedPaymentMethods([...selectedPaymentMethods, 'paymaya']);
                                                    } else {
                                                        setSelectedPaymentMethods(selectedPaymentMethods.filter(m => m !== 'paymaya'));
                                                    }
                                                }}
                                                className="w-4 h-4"
                                            />
                                            <div>
                                                <p className="font-medium">PayMaya</p>
                                                <p className="text-xs text-muted-foreground">Pay via PayMaya wallet</p>
                                            </div>
                                        </label>
                                        
                                        {selectedPaymentMethods.includes('paymaya') && (
                                            <div className="ml-7 space-y-3 p-4 border rounded-md bg-muted/20">
                                                <FormInput
                                                    label="PayMaya Name"
                                                    value={paymentDetails.paymaya.name}
                                                    onChange={(e) => setPaymentDetails({
                                                        ...paymentDetails,
                                                        paymaya: { ...paymentDetails.paymaya, name: e.target.value }
                                                    })}
                                                    placeholder="Enter PayMaya account name"
                                                    required
                                                />
                                                <FormInput
                                                    label="PayMaya Number"
                                                    value={paymentDetails.paymaya.number}
                                                    onChange={(e) => setPaymentDetails({
                                                        ...paymentDetails,
                                                        paymaya: { ...paymentDetails.paymaya, number: e.target.value }
                                                    })}
                                                    placeholder="Enter PayMaya mobile number"
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>

                            <div className="flex gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setPaymentModalOpen(false);
                                        setSelectedEvent(null);
                                        setSelectedPaymentMethods([]);
                                            setPaymentDetails({
                                                bank: { bankName: '', accountName: '', accountNumber: '' },
                                                gcash: { name: '', number: '' },
                                                grabpay: { name: '', number: '' },
                                                paymaya: { name: '', number: '' },
                                            });
                                            setActiveTab('bank');
                                    }}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={async () => {
                                        if (selectedPaymentMethods.length === 0) {
                                            toast.error("Please select at least one payment method");
                                            return;
                                        }

                                        // Validate required fields based on selected payment methods
                                        if (selectedPaymentMethods.includes('bank_transfer')) {
                                            if (!paymentDetails.bank.bankName || !paymentDetails.bank.accountName || !paymentDetails.bank.accountNumber) {
                                                toast.error("Please fill in all bank details");
                                                return;
                                            }
                                        }
                                        if (selectedPaymentMethods.includes('gcash')) {
                                            if (!paymentDetails.gcash.name || !paymentDetails.gcash.number) {
                                                toast.error("Please fill in GCash name and number");
                                                return;
                                            }
                                        }
                                        if (selectedPaymentMethods.includes('grab_pay')) {
                                            if (!paymentDetails.grabpay.name || !paymentDetails.grabpay.number) {
                                                toast.error("Please fill in GrabPay name and number");
                                                return;
                                            }
                                        }
                                        if (selectedPaymentMethods.includes('paymaya')) {
                                            if (!paymentDetails.paymaya.name || !paymentDetails.paymaya.number) {
                                                toast.error("Please fill in PayMaya name and number");
                                                return;
                                            }
                                        }

                                        try {
                                            const formData = new FormData();
                                            // Only publish if event is currently draft
                                            if (selectedEvent.status === "draft") {
                                                formData.append('status', 'published');
                                            }
                                            formData.append('imageSource', 'url');
                                            formData.append('imageUrl', selectedEvent.image || '');
                                            formData.append('paymentMethods', JSON.stringify(selectedPaymentMethods));
                                            formData.append('paymentDetails', JSON.stringify(paymentDetails));

                                            const response = await fetch(`/api/organizer/events/${selectedEvent.id}`, {
                                                method: "PATCH",
                                                headers: {
                                                    Authorization: `Bearer ${token}`,
                                                },
                                                body: formData,
                                            });

                                            if (!response.ok) {
                                                const errorData = await response.json();
                                                throw new Error(errorData.message || "Failed to setup payment");
                                            }

                                            const successMessage = selectedEvent.status === "draft" 
                                                ? "Payment methods configured successfully! Event is now published."
                                                : "Payment methods updated successfully!";
                                            toast.success(successMessage);
                                            setPaymentModalOpen(false);
                                            setSelectedEvent(null);
                                            setSelectedPaymentMethods([]);
                                            setPaymentDetails({
                                                bank: { bankName: '', accountName: '', accountNumber: '' },
                                                gcash: { name: '', number: '' },
                                                grabpay: { name: '', number: '' },
                                                paymaya: { name: '', number: '' },
                                            });
                                            setActiveTab('bank');
                                            queryClient.invalidateQueries({ queryKey: ["organizer", "events"] });
                                            queryClient.invalidateQueries({ queryKey: ["organizer", "stats"] });
                                        } catch (error: any) {
                                            toast.error(error.message || "Failed to setup payment methods");
                                        }
                                    }}
                                    className="flex-1 bg-purple-500 hover:bg-purple-600"
                                >
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    {selectedEvent?.status === "draft" ? "Setup & Publish" : "Save Payment Methods"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


