"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { Save, User, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            // TODO: Implement user profile update API
            toast.success("Settings saved successfully!");
        } catch (error: any) {
            toast.error(error.message || "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-2">Manage your account settings</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile Settings */}
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center gap-3 mb-6">
                        <User className="w-5 h-5" />
                        <h2 className="text-xl font-semibold">Profile Information</h2>
                    </div>

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
                            disabled
                        />

                        <Button type="submit" disabled={isSaving}>
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </div>

                {/* Security Settings */}
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="w-5 h-5" />
                        <h2 className="text-xl font-semibold">Security</h2>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Password management and security settings will be available soon.
                        </p>
                        <Button variant="outline" disabled>
                            Change Password
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

