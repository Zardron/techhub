"use client";

import { useState } from "react";
import { PlusIcon, Ban, Trash2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useGetAllUsers, useDeleteUser, useBanUser } from "@/lib/hooks/api/user.queries";
import { DataTable, type Column } from "@/components/DataTable";
import { IUser } from "@/database/user.model";
import { useAuthStore } from "@/lib/store/auth.store";
import { toast } from "sonner";
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

export default function AllUsersPage() {
    const { data, isLoading, error, isError } = useGetAllUsers();
    const deleteUserMutation = useDeleteUser();
    const banUserMutation = useBanUser();
    const { user: currentUser } = useAuthStore();

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
    const [banActionType, setBanActionType] = useState<'ban' | 'unban' | null>(null);

    const users = data?.data || [];

    const handleDelete = (user: IUser) => {
        setSelectedUser(user);
        setDeleteDialogOpen(true);
    };

    const handleBan = (user: IUser) => {
        setSelectedUser(user);
        setBanActionType(user.banned ? 'unban' : 'ban');
        setBanDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!selectedUser) return;

        deleteUserMutation.mutate(selectedUser._id.toString(), {
            onSuccess: () => {
                toast.success("User Deleted Successfully!", {
                    description: `User "${selectedUser.name}" has been deleted.`,
                    duration: 5000,
                });
                setDeleteDialogOpen(false);
                setSelectedUser(null);
            },
            onError: (error) => {
                toast.error("Failed to Delete User", {
                    description: error.message || "An error occurred while deleting the user.",
                    duration: 5000,
                });
            },
        });
    };

    const confirmBan = () => {
        if (!selectedUser || !banActionType) return;

        banUserMutation.mutate(
            { userId: selectedUser._id.toString(), action: banActionType },
            {
                onSuccess: () => {
                    toast.success(
                        banActionType === 'ban' ? "User Banned Successfully!" : "User Unbanned Successfully!",
                        {
                            description: `User "${selectedUser.name}" has been ${banActionType === 'ban' ? 'banned' : 'unbanned'}.`,
                            duration: 5000,
                        }
                    );
                    setBanDialogOpen(false);
                    setSelectedUser(null);
                    setBanActionType(null);
                },
                onError: (error) => {
                    toast.error(`Failed to ${banActionType === 'ban' ? 'Ban' : 'Unban'} User`, {
                        description: error.message || `An error occurred while ${banActionType === 'ban' ? 'banning' : 'unbanning'} the user.`,
                        duration: 5000,
                    });
                },
            }
        );
    };

    const isCurrentUser = (userId: string) => {
        return currentUser?.id === userId;
    };

    const columns: Column<IUser>[] = [
        {
            key: "name",
            header: "Name",
            render: (value: string, row: IUser) => {
                return (
                    <div className="flex items-center gap-2">
                        <span>{value}</span>
                        {row.banned && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                Banned
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: "email",
            header: "Email",
        },
        {
            key: "role",
            header: "Role",
            render: (value: string) => {
                const isAdmin = value === "admin";
                return (
                    <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isAdmin
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}
                    >
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                    </span>
                );
            },
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
                    <h1 className="text-3xl font-bold">All Users</h1>
                    <p className="text-muted-foreground mt-2">
                        View and manage all users on the platform
                    </p>
                </div>
                <Link
                    href="/admin-dashboard/add-users"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                    <PlusIcon className="w-4 h-4" />
                    Add User
                </Link>
            </div>

            <div className="border rounded-lg p-6">
                <DataTable
                    data={users}
                    columns={columns}
                    searchable={true}
                    searchPlaceholder="Search by name or email..."
                    searchKeys={["name", "email"]}
                    filters={[
                        {
                            key: "role",
                            label: "Role",
                            options: [
                                { value: "admin", label: "Admin" },
                                { value: "user", label: "User" },
                                { value: "organizer", label: "Organizer" },
                            ],
                        },
                    ]}
                    loading={isLoading}
                    emptyMessage="No users found"
                    actions={(row: IUser) => {
                        const userId = row._id.toString();
                        const canModify = !isCurrentUser(userId);

                        return (
                            <div className="flex items-center gap-2">
                                {row.banned ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBan(row)}
                                        disabled={!canModify || banUserMutation.isPending}
                                        className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 cursor-pointer"
                                    >
                                        <ShieldCheck className="w-4 h-4 mr-1" />
                                        Unban
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBan(row)}
                                        disabled={!canModify || banUserMutation.isPending}
                                        className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 cursor-pointer"
                                    >
                                        <Ban className="w-4 h-4 mr-1" />
                                        Ban
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(row)}
                                    disabled={!canModify || deleteUserMutation.isPending}
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone and will permanently remove the user account.
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

            {/* Ban/Unban Confirmation Dialog */}
            <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {banActionType === 'ban' ? 'Ban User' : 'Unban User'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to {banActionType === 'ban' ? 'ban' : 'unban'} <strong>{selectedUser?.name}</strong>?
                            {banActionType === 'ban'
                                ? ' Banned users will not be able to access the platform.'
                                : ' The user will regain access to the platform.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmBan}
                            className={banActionType === 'ban' ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"}
                            disabled={banUserMutation.isPending}
                        >
                            {banUserMutation.isPending
                                ? (banActionType === 'ban' ? 'Banning...' : 'Unbanning...')
                                : (banActionType === 'ban' ? 'Ban' : 'Unban')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}