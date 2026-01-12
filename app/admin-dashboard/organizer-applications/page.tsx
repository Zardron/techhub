"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { CheckCircle, XCircle, Clock, Eye, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { formatDateToReadable } from "@/lib/formatters";

export default function OrganizerApplicationsPage() {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedApplication, setSelectedApplication] = useState<any>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
    const [rejectionReason, setRejectionReason] = useState("");

    // Fetch applications
    const { data, isLoading, error } = useQuery({
        queryKey: ["admin", "organizer-applications"],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/organizer-applications", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch applications");
            return response.json();
        },
        enabled: !!token,
    });

    const applications = data?.data?.applications || [];

    // Review application mutation
    const reviewMutation = useMutation({
        mutationFn: async ({ applicationId, action, rejectionReason }: any) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch(`/api/organizer-applications/${applicationId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ action, rejectionReason }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to review application");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success(`Application ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully`);
            queryClient.invalidateQueries({ queryKey: ["admin", "organizer-applications"] });
            setShowReviewModal(false);
            setSelectedApplication(null);
            setRejectionReason("");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to review application");
        },
    });

    const handleReview = (application: any, action: 'approve' | 'reject') => {
        setSelectedApplication(application);
        setReviewAction(action);
        setShowReviewModal(true);
        setRejectionReason("");
    };

    const handleConfirmReview = () => {
        if (reviewAction === 'reject' && !rejectionReason.trim()) {
            toast.error("Please provide a rejection reason");
            return;
        }
        reviewMutation.mutate({
            applicationId: selectedApplication.id,
            action: reviewAction,
            rejectionReason: reviewAction === 'reject' ? rejectionReason : undefined,
        });
    };

    const pendingApplications = applications.filter((app: any) => app.status === 'pending');
    const approvedApplications = applications.filter((app: any) => app.status === 'approved');
    const rejectedApplications = applications.filter((app: any) => app.status === 'rejected');

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <div className="h-8 bg-muted rounded w-64 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
                </div>

                {/* Statistics Skeleton */}
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 border rounded-lg bg-card animate-pulse">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-4 bg-muted rounded w-24"></div>
                                <div className="w-5 h-5 bg-muted rounded"></div>
                            </div>
                            <div className="h-8 bg-muted rounded w-16"></div>
                        </div>
                    ))}
                </div>

                {/* Application Cards Skeleton */}
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 border rounded-lg bg-card animate-pulse">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 bg-muted rounded w-48"></div>
                                        <div className="h-6 bg-muted rounded w-20"></div>
                                    </div>
                                    <div className="h-4 bg-muted rounded w-64"></div>
                                    <div className="h-4 bg-muted rounded w-56"></div>
                                    <div className="h-4 bg-muted rounded w-40"></div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-9 bg-muted rounded w-24"></div>
                                    <div className="h-9 bg-muted rounded w-20"></div>
                                </div>
                            </div>
                            <div className="h-4 bg-muted rounded w-full mb-2"></div>
                            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                            <div className="flex flex-wrap gap-4">
                                <div className="h-4 bg-muted rounded w-32"></div>
                                <div className="h-4 bg-muted rounded w-40"></div>
                                <div className="h-4 bg-muted rounded w-48"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-500">Error loading applications</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Organizer Applications</h1>
                <p className="text-muted-foreground mt-2">
                    Review and manage applications from users who want to become organizers
                </p>
            </div>

            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Pending</h3>
                        <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <p className="text-3xl font-bold">{pendingApplications.length}</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Approved</h3>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold">{approvedApplications.length}</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Rejected</h3>
                        <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-3xl font-bold">{rejectedApplications.length}</p>
                </div>
            </div>

            {/* Applications List */}
            <div className="space-y-4">
                {applications.length === 0 ? (
                    <div className="p-12 text-center border rounded-lg bg-card">
                        <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                        <p className="text-muted-foreground">No applications found</p>
                    </div>
                ) : (
                    applications.map((application: any) => (
                        <div
                            key={application.id}
                            className={`p-6 border rounded-lg bg-card ${
                                application.status === 'pending' ? 'border-yellow-500/20' :
                                application.status === 'approved' ? 'border-green-500/20' :
                                'border-red-500/20'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-semibold">{application.organizerName}</h3>
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            application.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                            application.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                            'bg-red-500/20 text-red-500'
                                        }`}>
                                            {application.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                        Applicant: {application.userName} ({application.userEmail})
                                    </p>
                                    {application.companyName && (
                                        <p className="text-sm text-muted-foreground mb-1">
                                            Company: {application.companyName}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        Applied: {formatDateToReadable(application.createdAt)}
                                    </p>
                                </div>
                                {application.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleReview(application, 'approve')}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Approve
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleReview(application, 'reject')}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Reject
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm mb-4 line-clamp-3">{application.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {application.website && (
                                    <a href={application.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                        Website
                                    </a>
                                )}
                                {application.phone && <span>Phone: {application.phone}</span>}
                                {application.address && <span>Address: {application.address}</span>}
                            </div>
                            {application.rejectionReason && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded">
                                    <p className="text-sm font-semibold text-red-500 mb-1">Rejection Reason:</p>
                                    <p className="text-sm text-muted-foreground">{application.rejectionReason}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Review Modal */}
            {showReviewModal && selectedApplication && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold mb-4">
                            {reviewAction === 'approve' ? 'Approve Application' : 'Reject Application'}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            {reviewAction === 'approve' 
                                ? `Are you sure you want to approve "${selectedApplication.organizerName}"? This will create an organizer account for ${selectedApplication.userEmail}.`
                                : `Are you sure you want to reject "${selectedApplication.organizerName}"? Please provide a reason.`
                            }
                        </p>
                        {reviewAction === 'reject' && (
                            <div className="mb-4">
                                <FormInput
                                    label="Rejection Reason *"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Please explain why this application is being rejected..."
                                    required
                                />
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowReviewModal(false);
                                    setSelectedApplication(null);
                                    setRejectionReason("");
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmReview}
                                disabled={reviewMutation.isPending || (reviewAction === 'reject' && !rejectionReason.trim())}
                                className={`flex-1 ${
                                    reviewAction === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                                }`}
                            >
                                {reviewMutation.isPending ? "Processing..." : reviewAction === 'approve' ? "Approve" : "Reject"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

