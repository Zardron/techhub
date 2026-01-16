"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Calendar, MapPin, Clock, QrCode, CheckCircle, XCircle, AlertCircle, User, Mail } from "lucide-react";
import { formatDateToReadable, formatDateTo12Hour } from "@/lib/formatters";
import Image from "next/image";

interface TicketVerificationData {
    ticket: {
        ticketNumber: string;
        status: string;
        checkedInAt?: string;
    };
    event: {
        title: string;
        date: string;
        time: string;
        location: string;
        venue: string;
        image: string;
        mode?: string;
        organizer?: string;
    };
    attendee: {
        name: string;
        email: string;
        avatar?: string;
    };
}

export default function TicketVerificationPage() {
    const params = useParams();
    const ticketNumber = params.ticketNumber as string;
    const [data, setData] = useState<TicketVerificationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (ticketNumber) {
            fetchTicket();
        }
    }, [ticketNumber]);

    const fetchTicket = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch(`/api/tickets/${ticketNumber}/verify`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to verify ticket");
            }

            const result = await response.json();
            setData(result.data || result);
        } catch (error: any) {
            setError(error.message || "Failed to load ticket information");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Verifying ticket...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Ticket Not Found</h1>
                    <p className="text-muted-foreground">{error || "The ticket you're looking for doesn't exist or is invalid."}</p>
                </div>
            </div>
        );
    }

    const getStatusBadge = () => {
        switch (data.ticket.status) {
            case 'used':
                return (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-500/10 px-4 py-2 rounded-full">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Checked In</span>
                    </div>
                );
            case 'cancelled':
                return (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-full">
                        <XCircle className="w-5 h-5" />
                        <span className="font-medium">Cancelled</span>
                    </div>
                );
            case 'active':
                return (
                    <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-full">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Valid Ticket</span>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 px-4 py-2 rounded-full">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">{data.ticket.status}</span>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-card border rounded-lg shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 md:p-8 border-b">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Ticket Verification</h1>
                                <p className="text-muted-foreground">Ticket #{data.ticket.ticketNumber}</p>
                            </div>
                            {getStatusBadge()}
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Event Details */}
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">{data.event.title}</h2>
                                    <div className="relative w-full h-48 rounded-md overflow-hidden mb-4 border">
                                        <Image
                                            src={data.event.image}
                                            alt={data.event.title}
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
                                        <Calendar className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Date</p>
                                            <p className="font-medium">{formatDateToReadable(data.event.date)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
                                        <Clock className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Time</p>
                                            <p className="font-medium">{formatDateTo12Hour(data.event.time)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
                                        <MapPin className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Location</p>
                                            <p className="font-medium">{data.event.location}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{data.event.venue}</p>
                                        </div>
                                    </div>

                                    {data.event.mode && (
                                        <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
                                            <div className="w-5 h-5 mt-1 shrink-0 flex items-center justify-center">
                                                <span className="text-primary text-xs">📍</span>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Mode</p>
                                                <p className="font-medium capitalize">{data.event.mode}</p>
                                            </div>
                                        </div>
                                    )}

                                    {data.event.organizer && (
                                        <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
                                            <div className="w-5 h-5 mt-1 shrink-0 flex items-center justify-center">
                                                <span className="text-primary text-xs">👤</span>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Organizer</p>
                                                <p className="font-medium">{data.event.organizer}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attendee Information */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold mb-4">Attendee Information</h3>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
                                            <User className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Name</p>
                                                <p className="font-medium">{data.attendee.name}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
                                            <Mail className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Email</p>
                                                <p className="font-medium">{data.attendee.email}</p>
                                            </div>
                                        </div>

                                        <div className="p-4 border rounded-md bg-muted/30">
                                            <p className="text-sm text-muted-foreground mb-1">Ticket Number</p>
                                            <p className="font-mono font-bold text-lg">{data.ticket.ticketNumber}</p>
                                        </div>

                                        {data.ticket.checkedInAt && (
                                            <div className="p-4 border border-green-500/20 rounded-md bg-green-50 dark:bg-green-500/10">
                                                <p className="text-sm text-muted-foreground mb-1">Checked In At</p>
                                                <p className="font-medium text-green-600 dark:text-green-400">
                                                    {new Date(data.ticket.checkedInAt).toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
