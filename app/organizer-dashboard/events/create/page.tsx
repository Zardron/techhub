"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCreateOrganizerEvent } from "@/lib/hooks/api/organizer.queries";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/store/auth.store";
import toast from "react-hot-toast";
import { X, Plus, Info, Check } from "lucide-react";

export default function CreateEventPage() {
    const router = useRouter();
    const createEventMutation = useCreateOrganizerEvent();
    const { token } = useAuthStore();
    
    // Fetch current subscription
    const { data: subscriptionData } = useQuery({
        queryKey: ["subscription"],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/subscriptions", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch subscription");
            return response.json();
        },
        enabled: !!token,
    });

    const subscription = subscriptionData?.subscription || subscriptionData?.data?.subscription;
    const currentPlan = subscription?.plan;
    
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        overview: "",
        venue: "",
        location: "",
        date: "",
        time: "",
        mode: "Virtual" as "Virtual" | "Onsite" | "Hybrid",
        audience: "",
        organizer: "",
        tags: [] as string[],
        agenda: [] as string[],
        isFree: true,
        price: "",
        capacity: "",
        waitlistEnabled: false,
    });

    const [imageSource, setImageSource] = useState<"file" | "url">("file");
    const [image, setImage] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string>("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [tagInput, setTagInput] = useState("");
    const [agendaInput, setAgendaInput] = useState("");
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.title.trim()) newErrors.title = "Title is required";
        if (!formData.description.trim()) newErrors.description = "Description is required";
        if (!formData.overview.trim()) newErrors.overview = "Overview is required";
        if (!formData.venue.trim()) newErrors.venue = "Venue is required";
        if (!formData.location.trim()) newErrors.location = "Location is required";
        if (!formData.date) newErrors.date = "Date is required";
        if (!formData.time) newErrors.time = "Time is required";
        if (!formData.audience.trim()) newErrors.audience = "Audience is required";
        if (formData.tags.length === 0) newErrors.tags = "At least one tag is required";
        if (formData.agenda.length === 0) newErrors.agenda = "At least one agenda item is required";
        if (!image && !imageUrl && imageSource === "file") newErrors.image = "Image is required";
        if (imageSource === "url" && !imageUrl.trim()) newErrors.image = "Image URL is required";
        if (!formData.isFree && !formData.price) newErrors.price = "Price is required for paid events";
        if (formData.price && parseFloat(formData.price) < 0) newErrors.price = "Price cannot be negative";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            setImageUrl("");
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
            setTagInput("");
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    };

    const handleAddAgenda = () => {
        if (agendaInput.trim() && !formData.agenda.includes(agendaInput.trim())) {
            setFormData({ ...formData, agenda: [...formData.agenda, agendaInput.trim()] });
            setAgendaInput("");
        }
    };

    const handleRemoveAgenda = (item: string) => {
        setFormData({ ...formData, agenda: formData.agenda.filter(a => a !== item) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Please fix the errors in the form");
            return;
        }

        const submitFormData = new FormData();
        submitFormData.append("title", formData.title);
        submitFormData.append("description", formData.description);
        submitFormData.append("overview", formData.overview);
        submitFormData.append("venue", formData.venue);
        submitFormData.append("location", formData.location);
        submitFormData.append("date", formData.date);
        submitFormData.append("time", formData.time);
        submitFormData.append("mode", formData.mode);
        submitFormData.append("audience", formData.audience);
        submitFormData.append("tags", JSON.stringify(formData.tags));
        submitFormData.append("agenda", JSON.stringify(formData.agenda));
        submitFormData.append("isFree", formData.isFree.toString());
        submitFormData.append("imageSource", imageSource);
        
        if (imageSource === "file" && image) {
            submitFormData.append("image", image);
        } else {
            submitFormData.append("imageUrl", imageUrl);
        }

        if (!formData.isFree && formData.price) {
            submitFormData.append("price", (parseFloat(formData.price) * 100).toString()); // Convert to cents
        }

        if (formData.capacity) {
            submitFormData.append("capacity", formData.capacity);
        }

        submitFormData.append("waitlistEnabled", formData.waitlistEnabled.toString());

        createEventMutation.mutate(submitFormData, {
            onSuccess: () => {
                toast.success("Event created successfully!");
                router.push("/organizer-dashboard/events");
            },
            onError: (error: any) => {
                toast.error(error.message || "Failed to create event");
            },
        });
    };

    // Format plan features for display
    const getPlanFeatures = () => {
        if (!currentPlan) {
            return {
                name: "Free Plan",
                features: [
                    "Basic event creation",
                    "Secure Payment Processing",
                    "QR Code Tickets",
                    "Email Notifications",
                ],
                limits: {
                    maxEvents: "Limited events",
                    maxBookings: "Limited bookings per event",
                }
            };
        }

        const features: string[] = [];
        
        // Core features (always available)
        features.push("Secure Payment Processing");
        features.push("QR Code Tickets");
        features.push("Email Notifications");

        // Plan-specific features
        if (currentPlan.features?.analytics) features.push("Analytics & Insights");
        if (currentPlan.features?.customBranding) features.push("Custom Branding");
        if (currentPlan.features?.prioritySupport) features.push("Priority Support");
        if (currentPlan.features?.apiAccess) features.push("API Access");
        if (currentPlan.features?.whiteLabel) features.push("White Label Solution");
        if (currentPlan.features?.teamManagement) features.push("Team Management");
        if (currentPlan.features?.advancedReporting) features.push("Advanced Reporting");
        if (currentPlan.features?.dedicatedAccountManager) features.push("Dedicated Account Manager");
        if (currentPlan.features?.slaGuarantee) features.push("SLA Guarantee");
        if (currentPlan.features?.customIntegrations) features.push("Custom Integrations");
        if (currentPlan.features?.advancedSecurity) features.push("Advanced Security");

        const limits = {
            maxEvents: currentPlan.features?.maxEvents === null || currentPlan.features?.maxEvents === undefined
                ? "Unlimited events"
                : `${currentPlan.features.maxEvents} events`,
            maxBookings: currentPlan.features?.maxBookingsPerEvent === null || currentPlan.features?.maxBookingsPerEvent === undefined
                ? "Unlimited bookings per event"
                : `Up to ${currentPlan.features.maxBookingsPerEvent} bookings/event`,
        };

        return {
            name: currentPlan.name || "Current Plan",
            features,
            limits,
        };
    };

    const planInfo = getPlanFeatures();

    return (
        <div className="space-y-6 relative">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Create New Event</h1>
                    <p className="text-muted-foreground mt-2">Fill in the details to create your event</p>
                </div>
                
                {/* Plan Features Tooltip */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <Info className="w-4 h-4" />
                                Your Plan Features
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent 
                            side="left" 
                            className="w-80 p-0 bg-card border"
                            sideOffset={10}
                        >
                            <div className="p-4 space-y-4">
                                <div>
                                    <h3 className="font-semibold text-lg mb-1">{planInfo.name}</h3>
                                    <p className="text-sm text-muted-foreground">Current plan features</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">LIMITS</p>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                <span>{planInfo.limits.maxEvents}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                <span>{planInfo.limits.maxBookings}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">FEATURES</p>
                                        <div className="space-y-1">
                                            {planInfo.features.map((feature, index) => (
                                                <div key={index} className="flex items-center gap-2 text-sm">
                                                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                    <span>{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-2 border-t">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => router.push("/organizer-dashboard/billing")}
                                    >
                                        View Plans & Upgrade
                                    </Button>
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <FormInput
                        label="Event Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        error={errors.title}
                        required
                    />

                    <FormInput
                        label="Venue"
                        value={formData.venue}
                        onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                        error={errors.venue}
                        required
                    />

                    <FormInput
                        label="Location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        error={errors.location}
                        required
                    />

                    <FormInput
                        label="Date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        error={errors.date}
                        required
                    />

                    <FormInput
                        label="Time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        error={errors.time}
                        required
                    />

                    <FormSelect
                        label="Mode"
                        value={formData.mode}
                        onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })}
                        options={[
                            { value: "Virtual", label: "Virtual" },
                            { value: "Onsite", label: "Onsite" },
                            { value: "Hybrid", label: "Hybrid" },
                        ]}
                        required
                    />
                </div>

                <FormInput
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    error={errors.description}
                    required
                    multiline
                    rows={3}
                />

                <FormInput
                    label="Overview"
                    value={formData.overview}
                    onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                    error={errors.overview}
                    required
                    multiline
                    rows={5}
                />

                <FormInput
                    label="Target Audience"
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    error={errors.audience}
                    required
                />

                {/* Pricing Section */}
                <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isFree"
                            checked={formData.isFree}
                            onChange={(e) => setFormData({ ...formData, isFree: e.target.checked, price: "" })}
                            className="w-4 h-4"
                        />
                        <label htmlFor="isFree" className="font-medium">Free Event</label>
                    </div>

                    {!formData.isFree && (
                        <FormInput
                            label="Price (PHP)"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            error={errors.price}
                            required={!formData.isFree}
                        />
                    )}
                </div>

                {/* Capacity Section */}
                <div className="p-4 border rounded-lg space-y-4">
                    <FormInput
                        label="Capacity (leave empty for unlimited)"
                        type="number"
                        min="1"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    />

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="waitlistEnabled"
                            checked={formData.waitlistEnabled}
                            onChange={(e) => setFormData({ ...formData, waitlistEnabled: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <label htmlFor="waitlistEnabled">Enable waitlist when event is full</label>
                    </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Tags {errors.tags && <span className="text-destructive">*</span>}</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                            className="flex-1 px-3 py-2 border rounded-md"
                            placeholder="Add a tag"
                        />
                        <Button type="button" onClick={handleAddTag} variant="outline">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="hover:text-destructive"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    {errors.tags && <p className="text-sm text-destructive">{errors.tags}</p>}
                </div>

                {/* Agenda */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Agenda {errors.agenda && <span className="text-destructive">*</span>}</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={agendaInput}
                            onChange={(e) => setAgendaInput(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAgenda())}
                            className="flex-1 px-3 py-2 border rounded-md"
                            placeholder="Add agenda item (e.g., 09:00 AM - Keynote)"
                        />
                        <Button type="button" onClick={handleAddAgenda} variant="outline">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                        {formData.agenda.map((item, index) => (
                            <li key={index} className="flex items-center justify-between">
                                <span>{item}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAgenda(item)}
                                    className="text-destructive hover:underline"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    {errors.agenda && <p className="text-sm text-destructive">{errors.agenda}</p>}
                </div>

                {/* Image Upload */}
                <div className="space-y-4">
                    <label className="text-sm font-medium">Event Image {errors.image && <span className="text-destructive">*</span>}</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                value="file"
                                checked={imageSource === "file"}
                                onChange={() => {
                                    setImageSource("file");
                                    setImageUrl("");
                                    setImagePreview(null);
                                }}
                            />
                            Upload File
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                value="url"
                                checked={imageSource === "url"}
                                onChange={() => {
                                    setImageSource("url");
                                    setImage(null);
                                    setImagePreview(null);
                                }}
                            />
                            Image URL
                        </label>
                    </div>

                    {imageSource === "file" ? (
                        <div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="w-full"
                            />
                            {imagePreview && (
                                <img src={imagePreview} alt="Preview" className="mt-4 max-w-md rounded-lg" />
                            )}
                        </div>
                    ) : (
                        <FormInput
                            label="Image URL"
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            error={errors.image}
                            required
                        />
                    )}
                </div>

                <div className="flex gap-4">
                    <Button
                        type="submit"
                        disabled={createEventMutation.isPending}
                    >
                        {createEventMutation.isPending ? "Creating..." : "Create Event"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
                </div>

                {/* Guidelines Section */}
                <div className="lg:col-span-1">
                    <div className="border rounded-lg bg-card shadow-sm sticky top-4">
                        <div className="p-6 border-b">
                            <h2 className="text-lg font-semibold">Event Guidelines</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Tips for creating great events
                            </p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Your Plan Details */}
                            <div className="space-y-3 pb-4 border-b">
                                <div>
                                    <h3 className="font-semibold text-sm mb-1">Your Plan Details</h3>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Current subscription plan features
                                    </p>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
                                        <p className="font-medium text-sm mb-2">{planInfo.name}</p>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                <span className="text-muted-foreground">{planInfo.limits.maxEvents}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                <span className="text-muted-foreground">{planInfo.limits.maxBookings}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-medium text-muted-foreground">Available Features:</p>
                                        <div className="space-y-1">
                                            {planInfo.features.slice(0, 5).map((feature, index) => (
                                                <div key={index} className="flex items-center gap-2 text-xs">
                                                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                    <span className="text-muted-foreground">{feature}</span>
                                                </div>
                                            ))}
                                            {planInfo.features.length > 5 && (
                                                <p className="text-xs text-muted-foreground pl-5">
                                                    +{planInfo.features.length - 5} more features
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-3"
                                        onClick={() => router.push("/organizer-dashboard/billing")}
                                    >
                                        View Full Plan & Upgrade
                                    </Button>
                                </div>
                            </div>

                            {/* Event Information */}
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Event Details</h3>
                                <p className="text-sm text-muted-foreground">
                                    Provide clear and detailed information about your event. Include all relevant details to help attendees understand what to expect.
                                </p>
                            </div>

                            {/* Image Guidelines */}
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Image Requirements</h3>
                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Use high-quality images (recommended: 1200x630px)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Supported formats: JPG, PNG, WebP</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Keep file size under 5MB for faster uploads</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Tags & Agenda */}
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Tags & Agenda</h3>
                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Add relevant tags to help users discover your event</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Include a detailed agenda with time slots</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Use clear, descriptive agenda items</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Event Modes */}
                            <div className="pt-4 border-t space-y-3">
                                <h3 className="font-semibold text-sm">Event Modes</h3>
                                <div className="space-y-2 text-xs text-muted-foreground">
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-500 mt-0.5">•</span>
                                        <div>
                                            <span className="font-medium">Virtual:</span> Virtual events accessible from anywhere
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5">•</span>
                                        <div>
                                            <span className="font-medium">Onsite:</span> In-person events at a physical location
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-purple-500 mt-0.5">•</span>
                                        <div>
                                            <span className="font-medium">Hybrid:</span> Combination of virtual and onsite attendance
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Tips */}
                            <div className="pt-4 border-t space-y-3">
                                <h3 className="font-semibold text-sm">Quick Tips</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Double-check all dates and times before submitting</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Add at least 3-5 relevant tags for better discoverability</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Include detailed agenda items with time information</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Set appropriate capacity limits to manage attendance</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

