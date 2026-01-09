"use client";

import { useMemo } from "react";
import { PlusIcon, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import { useGetAllUsers } from "@/lib/hooks/api/user.queries";
import { DataTable, type Column } from "@/components/DataTable";
import { IUser } from "@/database/user.model";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
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
import toast from "react-hot-toast";
import { useDeleteUser, useBanUser } from "@/lib/hooks/api/user.queries";

interface OrganizerDisplay {
    name: string;
    email: string;
    createdAt: Date;
    userId?: string; // For actual user accounts
    organizerId?: string; // Organizer ID from user's organizerId field
}

export default function AllOrganizersPage() {
    const { data, isLoading, error, isError } = useGetAllUsers();
    const deleteUserMutation = useDeleteUser();
    const banUserMutation = useBanUser();
    const { token } = useAuthStore();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [selectedOrganizer, setSelectedOrganizer] = useState<OrganizerDisplay | null>(null);
    const [viewUsersDialogOpen, setViewUsersDialogOpen] = useState(false);
    const [selectedOrganizerForView, setSelectedOrganizerForView] = useState<OrganizerDisplay | null>(null);
    const [organizerUsers, setOrganizerUsers] = useState<IUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
    const [banActionType, setBanActionType] = useState<'ban' | 'unban' | null>(null);

    // Get actual organizer accounts from database
    const organizers = useMemo(() => {
        const result: OrganizerDisplay[] = [];

        // Add actual organizer user accounts from database
        if (data?.data) {
            const userOrganizers = data.data
                .filter((user: IUser) => 
                    user.role === 'organizer' && 
                    user.email.toLowerCase().includes('admin')
                )
                .map((user: IUser) => ({
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                    userId: user._id.toString(),
                    organizerId: user.organizerId?.toString(),
                }));
            result.push(...userOrganizers);
        }

        // Sort by name
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [data]);

    const handleDelete = (organizer: OrganizerDisplay) => {
        setSelectedOrganizer(organizer);
        setDeleteDialogOpen(true);
    };

    const handleViewUsers = async (organizer: OrganizerDisplay) => {
        setSelectedOrganizerForView(organizer);
        setViewUsersDialogOpen(true);
        setLoadingUsers(true);
        setOrganizerUsers([]);

        try {
            if (!organizer.organizerId) {
                toast.error("No organizer ID found");
                setLoadingUsers(false);
                return;
            }

            const response = await fetch(`/api/admin/organizers/${organizer.organizerId}/users`, {
                headers: {
                    'Authorization': `Bearer ${token || ''}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const result = await response.json();
            setOrganizerUsers(result.data || []);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An error occurred");
        } finally {
            setLoadingUsers(false);
        }
    };

    const confirmDelete = async () => {
        if (!selectedOrganizer || !selectedOrganizer.userId) return;

        const deletePromise = deleteUserMutation.mutateAsync(selectedOrganizer.userId)
            .then(() => {
                setDeleteDialogOpen(false);
                setSelectedOrganizer(null);
            });

        toast.promise(deletePromise, {
            loading: 'Deleting organizer...',
            success: `Organizer "${selectedOrganizer.name}" has been deleted.`,
            error: (error) => error instanceof Error ? error.message : "An error occurred while deleting the organizer.",
        });
    };

    const handleDisableUser = (user: IUser) => {
        setSelectedUser(user);
        setBanActionType(user.banned ? 'unban' : 'ban');
        setBanDialogOpen(true);
    };

    const handleRemoveUser = (user: IUser) => {
        setSelectedUser(user);
        setDeleteDialogOpen(true);
    };

    const confirmDisableUser = async () => {
        if (!selectedUser || !banActionType) return;

        const banPromise = banUserMutation.mutateAsync({
            userId: selectedUser._id.toString(),
            action: banActionType,
        }).then(() => {
            setBanDialogOpen(false);
            setSelectedUser(null);
            setBanActionType(null);
            // Refresh the users list
            if (selectedOrganizerForView?.organizerId) {
                handleViewUsers(selectedOrganizerForView);
            }
        });

        toast.promise(banPromise, {
            loading: `${banActionType === 'ban' ? 'Disabling' : 'Enabling'} user...`,
            success: `User "${selectedUser.name}" has been ${banActionType === 'ban' ? 'disabled' : 'enabled'}.`,
            error: (error) => error instanceof Error ? error.message : `An error occurred while ${banActionType === 'ban' ? 'disabling' : 'enabling'} the user.`,
        });
    };

    const confirmRemoveUser = async () => {
        if (!selectedUser) return;

        const deletePromise = deleteUserMutation.mutateAsync(selectedUser._id.toString())
            .then(() => {
                setDeleteDialogOpen(false);
                setSelectedUser(null);
                // Refresh the users list
                if (selectedOrganizerForView?.organizerId) {
                    handleViewUsers(selectedOrganizerForView);
                }
            });

        toast.promise(deletePromise, {
            loading: 'Removing user...',
            success: `User "${selectedUser.name}" has been removed.`,
            error: (error) => error instanceof Error ? error.message : "An error occurred while removing the user.",
        });
    };

    const columns: Column<OrganizerDisplay>[] = [
        {
            key: "name",
            header: "Name",
            render: (value: string) => value,
        },
        {
            key: "email",
            header: "Email",
        },
        {
            key: "createdAt",
            header: "Created At",
            render: (value: Date) => {
                if (!value) return "-";
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                });
            },
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">All Organizers</h1>
                    <p className="text-muted-foreground mt-2">
                        View and manage all event organizers on the platform
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin-dashboard/add-organizers"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Add Organizer
                    </Link>
                </div>
            </div>

            <div className="border rounded-lg p-6">
                <DataTable
                    data={organizers}
                    columns={columns}
                    searchable={true}
                    searchPlaceholder="Search by name or email..."
                    searchKeys={["name", "email"]}
                    loading={isLoading}
                    emptyMessage="No organizers found"
                    actions={(row: OrganizerDisplay) => {
                        return (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewUsers(row)}
                                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 cursor-pointer"
                                    title="View users"
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(row)}
                                    disabled={deleteUserMutation.isPending}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                </Button>
                            </div>
                        );
                    }}
                />
            </div>

            {/* Delete Organizer Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen && !selectedUser} onOpenChange={(open) => {
                if (!open) {
                    setDeleteDialogOpen(false);
                    setSelectedOrganizer(null);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Organizer</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{selectedOrganizer?.name}</strong>? This action cannot be undone and will permanently remove the organizer account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteUserMutation.isPending}
                        >
                            {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Remove User Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen && !!selectedUser} onOpenChange={(open) => {
                if (!open) {
                    setDeleteDialogOpen(false);
                    setSelectedUser(null);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove User Account</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{selectedUser?.name}</strong>? This action cannot be undone and will permanently remove the user account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemoveUser}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteUserMutation.isPending}
                        >
                            {deleteUserMutation.isPending ? "Removing..." : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Disable/Enable User Confirmation Dialog */}
            <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{banActionType === 'ban' ? 'Disable' : 'Enable'} User Account</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to {banActionType === 'ban' ? 'disable' : 'enable'} <strong>{selectedUser?.name}</strong>? 
                            {banActionType === 'ban' 
                                ? ' The user will not be able to access their account.' 
                                : ' The user will be able to access their account again.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDisableUser}
                            className={banActionType === 'ban' ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"}
                            disabled={banUserMutation.isPending}
                        >
                            {banUserMutation.isPending 
                                ? (banActionType === 'ban' ? "Disabling..." : "Enabling...") 
                                : (banActionType === 'ban' ? "Disable" : "Enable")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* View Users Dialog */}
            <AlertDialog open={viewUsersDialogOpen} onOpenChange={setViewUsersDialogOpen}>
                <AlertDialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Users for {selectedOrganizerForView?.name?.replace(/\s+Admin$/i, '')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            All users associated with this organizer
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="mt-4">
                        {loadingUsers ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-muted-foreground">Loading users...</div>
                            </div>
                        ) : organizerUsers.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-muted-foreground">No users found for this organizer</div>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Created At</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {organizerUsers.map((user) => {
                                            const isAdminAccount = user.name.toLowerCase().includes('admin');
                                            return (
                                                <tr key={user._id.toString()} className="border-t">
                                                    <td className="px-4 py-3 text-sm">{user.name}</td>
                                                    <td className="px-4 py-3 text-sm">{user.email}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                                                            year: "numeric",
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDisableUser(user)}
                                                                disabled={isAdminAccount || banUserMutation.isPending}
                                                                className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title={isAdminAccount ? "Cannot disable admin account" : user.banned ? "Enable account" : "Disable account"}
                                                            >
                                                                {user.banned ? "Enable" : "Disable"}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleRemoveUser(user)}
                                                                disabled={isAdminAccount || deleteUserMutation.isPending}
                                                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title={isAdminAccount ? "Cannot remove admin account" : "Remove account"}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <AlertDialogFooter>
                        {selectedOrganizerForView && selectedOrganizerForView.organizerId && (
                            <Link
                                href={`/admin-dashboard/add-users?role=organizer&organizerId=${encodeURIComponent(selectedOrganizerForView.organizerId)}`}
                                onClick={() => setViewUsersDialogOpen(false)}
                            >
                                <Button
                                    variant="outline"
                                    className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                                >
                                    <PlusIcon className="w-4 h-4 mr-1" />
                                    Add Account
                                </Button>
                            </Link>
                        )}
                        <AlertDialogCancel>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
