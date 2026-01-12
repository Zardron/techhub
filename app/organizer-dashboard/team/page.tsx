"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { Users, Plus, X, Mail, User as UserIcon, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatDateToReadable } from "@/lib/formatters";

export default function TeamPage() {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });

    // Fetch team members
    const { data, isLoading, error } = useQuery({
        queryKey: ["organizer", "team"],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            
            const response = await fetch("/api/organizer/team", {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (!response.ok) throw new Error("Failed to fetch team members");
            return response.json();
        },
        enabled: !!token,
    });

    const teamMembers = data?.data?.teamMembers || [];

    // Add team member mutation
    const addMemberMutation = useMutation({
        mutationFn: async (memberData: { name: string; email: string; password: string }) => {
            if (!token) throw new Error("Not authenticated");
            
            const response = await fetch("/api/organizer/team", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(memberData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to add team member");
            }

            return response.json();
        },
        onSuccess: () => {
            toast.success("Team member added successfully");
            queryClient.invalidateQueries({ queryKey: ["organizer", "team"] });
            setShowAddForm(false);
            setFormData({ name: "", email: "", password: "" });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to add team member");
        },
    });

    // Remove team member mutation
    const removeMemberMutation = useMutation({
        mutationFn: async (memberId: string) => {
            if (!token) throw new Error("Not authenticated");
            
            const response = await fetch(`/api/organizer/team?memberId=${memberId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to remove team member");
            }

            return response.json();
        },
        onSuccess: () => {
            toast.success("Team member removed successfully");
            queryClient.invalidateQueries({ queryKey: ["organizer", "team"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to remove team member");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addMemberMutation.mutate(formData);
    };

    const handleRemove = (memberId: string, memberName: string) => {
        if (!confirm(`Are you sure you want to remove ${memberName} from your team?`)) {
            return;
        }
        removeMemberMutation.mutate(memberId);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 bg-muted rounded w-64 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
                    </div>
                    <div className="h-10 bg-muted rounded w-40 animate-pulse"></div>
                </div>

                {/* Team Members List Skeleton */}
                <div className="border rounded-lg bg-card overflow-hidden animate-pulse">
                    <div className="p-6 border-b">
                        <div className="h-6 bg-muted rounded w-48"></div>
                    </div>
                    <div className="divide-y">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-muted rounded-full"></div>
                                        <div className="space-y-2">
                                            <div className="h-5 bg-muted rounded w-32"></div>
                                            <div className="h-4 bg-muted rounded w-48"></div>
                                            <div className="h-3 bg-muted rounded w-40"></div>
                                        </div>
                                    </div>
                                    <div className="h-9 bg-muted rounded w-24"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-500">Error loading team members</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Team Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your team members who can help organize events
                    </p>
                </div>
                <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Team Member
                </Button>
            </div>

            {/* Add Team Member Form */}
            {showAddForm && (
                <div className="p-6 border rounded-lg bg-card">
                    <h2 className="text-xl font-semibold mb-4">Add New Team Member</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormInput
                            label="Full Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <FormInput
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                        <FormInput
                            label="Password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            helperText="Password must be at least 8 characters with uppercase, lowercase, number, and special character"
                        />
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                disabled={addMemberMutation.isPending}
                            >
                                {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setFormData({ name: "", email: "", password: "" });
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Team Members List */}
            <div className="border rounded-lg bg-card overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        <h2 className="text-xl font-semibold">
                            Team Members ({teamMembers.length})
                        </h2>
                    </div>
                </div>

                {teamMembers.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                        <p className="text-muted-foreground mb-4">No team members yet</p>
                        <Button onClick={() => setShowAddForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Team Member
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y">
                        {teamMembers.map((member: any) => (
                            <div
                                key={member.id}
                                className="p-6 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                            <UserIcon className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{member.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <Mail className="w-4 h-4" />
                                                <span>{member.email}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Added {formatDateToReadable(member.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemove(member.id, member.name)}
                                        disabled={removeMemberMutation.isPending}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

