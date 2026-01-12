"use client";

import { useState } from "react";
import { Ban, CheckCircle2, XCircle, Clock, MessageSquare, User, Mail, Calendar } from "lucide-react";
import { useGetAppeals, useUpdateAppeal, type AppealWithUser, type BannedUser } from "@/lib/hooks/api/appeals.queries";
import { useBanUser } from "@/lib/hooks/api/user.queries";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_COLORS = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    reviewed: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    approved: "bg-green-500/10 text-green-500 border-green-500/30",
    rejected: "bg-red-500/10 text-red-500 border-red-500/30",
};

const STATUS_ICONS = {
    pending: Clock,
    reviewed: MessageSquare,
    approved: CheckCircle2,
    rejected: XCircle,
};

export default function AppealsPage() {
    const { data, isLoading, error } = useGetAppeals();
    const updateAppealMutation = useUpdateAppeal();
    const banUserMutation = useBanUser();

    const [selectedAppeal, setSelectedAppeal] = useState<AppealWithUser | null>(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [adminNotes, setAdminNotes] = useState("");

    const appeals = data?.appeals || [];
    const bannedUsers = data?.bannedUsers || [];

    const handleApprove = (appeal: AppealWithUser) => {
        setSelectedAppeal(appeal);
        setActionType('approve');
        setAdminNotes(appeal.adminNotes || "");
        setActionDialogOpen(true);
    };

    const handleReject = (appeal: AppealWithUser) => {
        setSelectedAppeal(appeal);
        setActionType('reject');
        setAdminNotes(appeal.adminNotes || "");
        setActionDialogOpen(true);
    };

    const confirmAction = async () => {
        if (!selectedAppeal || !actionType) return;

        const status = actionType === 'approve' ? 'approved' : 'rejected';

        const updatePromise = updateAppealMutation.mutateAsync({
            appealId: selectedAppeal._id,
            status,
            adminNotes: adminNotes.trim() || undefined,
        }).then(() => {
            setActionDialogOpen(false);
            setSelectedAppeal(null);
            setActionType(null);
            setAdminNotes("");
        });

        toast.promise(updatePromise, {
            loading: `${actionType === 'approve' ? 'Approving' : 'Rejecting'} appeal...`,
            success: actionType === 'approve'
                ? "The user has been unbanned."
                : "The appeal has been rejected.",
            error: (error) => error instanceof Error ? error.message : "An error occurred.",
        });
    };

    const handleUnban = async (userId: string) => {
        const unbanPromise = banUserMutation.mutateAsync({ userId, action: 'unban' });

        toast.promise(unbanPromise, {
            loading: 'Unbanning user...',
            success: "The user has been successfully unbanned.",
            error: (error) => error instanceof Error ? error.message : "An error occurred.",
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-4 sm:space-y-6">
                <div>
                    <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-muted rounded w-80 animate-pulse"></div>
                </div>

                {/* Statistics Skeleton */}
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 border rounded-lg bg-card animate-pulse">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                                    <div className="h-8 bg-muted rounded w-16"></div>
                                </div>
                                <div className="w-8 h-8 bg-muted rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Appeal Cards Skeleton */}
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-4 animate-pulse">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-5 bg-muted rounded w-32"></div>
                                            <div className="h-6 bg-muted rounded w-24"></div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="h-4 bg-muted rounded w-40"></div>
                                            <div className="h-4 bg-muted rounded w-32"></div>
                                        </div>
                                        <div className="h-3 bg-muted rounded w-24"></div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-9 bg-muted rounded w-24"></div>
                                    <div className="h-9 bg-muted rounded w-20"></div>
                                </div>
                            </div>
                            <div className="pl-14 space-y-2">
                                <div className="h-4 bg-muted rounded w-full"></div>
                                <div className="h-4 bg-muted rounded w-3/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4 sm:space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Ban Appeals</h1>
                    <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                        Review and manage user ban appeals
                    </p>
                </div>
                <div className="flex items-center justify-center h-64">
                    <p className="text-destructive">Failed to load appeals</p>
                </div>
            </div>
        );
    }

    const pendingAppeals = appeals.filter((a) => a.status === 'pending');
    const reviewedAppeals = appeals.filter((a) => a.status !== 'pending');

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Ban Appeals</h1>
                <p className="text-muted-foreground mt-2">
                    Review and manage user ban appeals
                </p>
            </div>

            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Banned Users</p>
                            <p className="text-2xl font-bold">{data?.totalBannedUsers || 0}</p>
                        </div>
                        <Ban className="h-8 w-8 text-red-500" />
                    </div>
                </div>
                <div className="p-4 border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Pending Appeals</p>
                            <p className="text-2xl font-bold">{pendingAppeals.length}</p>
                        </div>
                        <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                </div>
                <div className="p-4 border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Appeals</p>
                            <p className="text-2xl font-bold">{data?.totalAppeals || 0}</p>
                        </div>
                        <MessageSquare className="h-8 w-8 text-blue-500" />
                    </div>
                </div>
            </div>

            {/* Pending Appeals */}
            {pendingAppeals.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Pending Appeals</h2>
                    <div className="space-y-4">
                        {pendingAppeals.map((appeal) => (
                            <AppealCard
                                key={appeal._id}
                                appeal={appeal}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Reviewed Appeals */}
            {reviewedAppeals.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Reviewed Appeals</h2>
                    <div className="space-y-4">
                        {reviewedAppeals.map((appeal) => (
                            <AppealCard
                                key={appeal._id}
                                appeal={appeal}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Banned Users Without Appeals */}
            {bannedUsers.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Banned Users Without Appeals</h2>
                    <div className="border rounded-lg">
                        <div className="divide-y">
                            {bannedUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                            <User className="h-5 w-5 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Mail className="h-3 w-3" />
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUnban(user.id)}
                                        disabled={banUserMutation.isPending}
                                    >
                                        Unban User
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {appeals.length === 0 && bannedUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
                    <Ban className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">No Banned Users or Appeals</p>
                    <p className="text-sm text-muted-foreground">
                        There are currently no banned users or appeals to review.
                    </p>
                </div>
            )}

            {/* Action Dialog */}
            <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionType === 'approve' ? 'Approve Appeal' : 'Reject Appeal'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionType === 'approve'
                                ? 'This will unban the user and mark the appeal as approved. Are you sure?'
                                : 'This will mark the appeal as rejected. Are you sure?'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Admin Notes (Optional)</label>
                            <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Add any notes about this decision..."
                                rows={4}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        {selectedAppeal && (
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-2">Appeal Reason:</p>
                                <p className="text-sm text-muted-foreground">{selectedAppeal.reason}</p>
                            </div>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmAction}
                            disabled={updateAppealMutation.isPending}
                            className={actionType === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
                        >
                            {updateAppealMutation.isPending
                                ? 'Processing...'
                                : actionType === 'approve'
                                    ? 'Approve & Unban'
                                    : 'Reject'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function AppealCard({
    appeal,
    onApprove,
    onReject,
}: {
    appeal: AppealWithUser;
    onApprove: (appeal: AppealWithUser) => void;
    onReject: (appeal: AppealWithUser) => void;
}) {
    const StatusIcon = STATUS_ICONS[appeal.status];

    return (
        <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                            <p className="font-medium">
                                {appeal.user?.name || 'Unknown User'}
                            </p>
                            <span
                                className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${STATUS_COLORS[appeal.status]}`}
                            >
                                <StatusIcon className="h-3 w-3" />
                                {appeal.status.charAt(0).toUpperCase() + appeal.status.slice(1)}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {appeal.email}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(appeal.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        {appeal.user && (
                            <div className="text-xs text-muted-foreground">
                                Role: {appeal.user.role}
                            </div>
                        )}
                    </div>
                </div>
                {appeal.status === 'pending' && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onApprove(appeal)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject(appeal)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                        </Button>
                    </div>
                )}
            </div>

            <div className="pl-14 space-y-2">
                <div>
                    <p className="text-sm font-medium mb-1">Appeal Reason:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{appeal.reason}</p>
                </div>

                {appeal.adminNotes && (
                    <div>
                        <p className="text-sm font-medium mb-1">Admin Notes:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{appeal.adminNotes}</p>
                    </div>
                )}

                {appeal.reviewedAt && (
                    <div className="text-xs text-muted-foreground">
                        Reviewed on {new Date(appeal.reviewedAt).toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
}

