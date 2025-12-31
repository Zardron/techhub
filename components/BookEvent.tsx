"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

interface BookEventProps {
    eventSlug: string;
}

const BookEvent = ({ eventSlug }: BookEventProps) => {
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);
    const [alreadyBooked, setAlreadyBooked] = useState<boolean>(false);
    const [checkingBooking, setCheckingBooking] = useState<boolean>(true);
    const router = useRouter();

    const checkIfAlreadyBooked = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                setCheckingBooking(false);
                return;
            }

            const response = await fetch('/api/bookings', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const bookings = data.bookings || [];

                // Check if any booking matches the current event slug
                const hasBooked = bookings.some((booking: any) => booking.event?.slug === eventSlug);
                setAlreadyBooked(hasBooked);

                // If already booked, show as submitted
                if (hasBooked) {
                    setSubmitted(true);
                }
            }
        } catch (err) {
            console.error('Error checking booking status:', err);
        } finally {
            setCheckingBooking(false);
        }
    }, [eventSlug]);

    useEffect(() => {
        setMounted(true);
        checkIfAlreadyBooked();
    }, [checkIfAlreadyBooked]);

    const handleBookNowClick = () => {
        const token = localStorage.getItem('token');

        if (!token) {
            router.push('/sign-in');
            return;
        }

        setShowConfirmation(true);
    };

    const handleConfirmBooking = async () => {
        setIsLoading(true);
        setError(null);
        setShowConfirmation(false);

        try {
            const token = localStorage.getItem('token');

            if (!token) {
                router.push('/sign-in');
                return;
            }

            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ eventSlug }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to book event');
            }

            setSubmitted(true);
            setAlreadyBooked(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while booking');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelBooking = () => {
        setShowConfirmation(false);
    }

    if (checkingBooking) {
        return (
            <div id="book-event">
                <div className="flex items-center justify-center py-4">
                    <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <>
            <div id="book-event">
                {submitted || alreadyBooked ? (
                    <div className="flex flex-col items-center gap-4 text-center py-4">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-light-100 text-base font-medium">
                            {alreadyBooked ? "You've already booked this event!" : "Thank you for booking your spot!"}
                        </p>
                        <p className="text-light-200 text-sm">
                            {alreadyBooked ? "Your spot is confirmed. Please check your email for updates." : "Your booking has been confirmed. Please wait for an email update with further details."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}
                        <button
                            onClick={handleBookNowClick}
                            className="button-submit w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Booking...
                                </span>
                            ) : (
                                'Book Now'
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {mounted && showConfirmation && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass rounded-2xl p-6 md:p-8 border border-primary/30 max-w-md w-full card-shadow" style={{ boxShadow: '0 0 20px rgba(89, 222, 202, 0.2), 0 0 40px rgba(89, 222, 202, 0.1)' }}>
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-light-100">Confirm Booking</h3>
                            <p className="text-light-200 text-base">Are you sure you want to be part of this event?</p>
                            <div className="flex gap-3 w-full mt-6">
                                <button
                                    onClick={handleCancelBooking}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-dark-200/50 border border-border-dark/50 text-light-100 font-medium hover:bg-dark-200/70 transition-colors duration-200"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmBooking}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-dark-100 font-semibold hover:bg-primary/90 transition-colors duration-200"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Booking...
                                        </span>
                                    ) : (
                                        'Confirm'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}

export default BookEvent