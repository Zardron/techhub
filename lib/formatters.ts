// Client-safe formatting utilities
// This file should not import any Node.js-only modules (like fs, path, etc.)

// Function to format organizer count in tiers
// 5-9: "5+", 10-19: "10+", 20-29: "20+", etc.
export function formatOrganizerCount(count: number): string {
    if (count < 5) {
        return "5+";
    } else if (count < 10) {
        return "5+";
    } else if (count < 20) {
        return "10+";
    } else {
        // Round down to nearest 10 for counts >= 20
        const rounded = Math.floor(count / 10) * 10;
        return `${rounded}+`;
    }
}

