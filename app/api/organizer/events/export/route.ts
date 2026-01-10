import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import Booking from "@/database/booking.model";
import { handleApiError } from "@/lib/utils";

// GET - Export events as CSV
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        const tokenPayload = verifyToken(req);
        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await User.findOne({
            _id: tokenPayload.id,
            deleted: { $ne: true }
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        if (user.role !== 'organizer' && user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        // Get organizer's events
        const events = await Event.find({ organizerId: user._id })
            .sort({ createdAt: -1 });

        // Get booking counts for each event
        const eventIds = events.map(e => e._id);
        const bookings = await Booking.find({
            eventId: { $in: eventIds }
        });

        const bookingCounts = new Map();
        bookings.forEach((booking: any) => {
            const count = bookingCounts.get(booking.eventId.toString()) || 0;
            bookingCounts.set(booking.eventId.toString(), count + 1);
        });

        // Format CSV data
        const csvRows = [];
        csvRows.push([
            'Title',
            'Description',
            'Date',
            'Time',
            'Location',
            'Mode',
            'Price',
            'Capacity',
            'Available Tickets',
            'Status',
            'Bookings',
            'Created At'
        ].join(','));

        events.forEach((event: any) => {
            const bookingCount = bookingCounts.get(event._id.toString()) || 0;
            const row = [
                event.title || '',
                (event.description || '').replace(/"/g, '""').substring(0, 200),
                event.date || '',
                event.time || '',
                event.location || '',
                event.mode || '',
                event.isFree ? 'Free' : (event.price ? (event.price / 100).toFixed(2) : '0.00'),
                event.capacity || 'Unlimited',
                event.availableTickets || event.capacity || 'Unlimited',
                event.status || 'draft',
                bookingCount,
                event.createdAt.toISOString(),
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
            
            csvRows.push(row);
        });

        const csvContent = csvRows.join('\n');

        // Return CSV file
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="events-${Date.now()}.csv"`,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

