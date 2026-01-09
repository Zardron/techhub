"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateOrganizerEvent } from "@/lib/hooks/api/organizer.queries";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { X, Plus } from "lucide-react";

export default function CreateEventPage() {
    const router = useRouter();
    const createEventMutation = useCreateOrganizerEvent();
    
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Create New Event</h1>
                <p className="text-muted-foreground mt-2">Fill in the details to create your event</p>
            </div>

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
    );
}

