import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import Booking from "@/database/booking.model";
import Transaction from "@/database/transaction.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

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

        const { searchParams } = new URL(req.url);
        const timeRange = searchParams.get('timeRange') || '6months';

        // Get organizer's events
        const events = await Event.find({
            organizerId: user._id
        });

        const eventIds = events.map(e => e._id);

        // Get bookings
        const bookings = await Booking.find({
            eventId: { $in: eventIds }
        });

        // Get transactions
        const transactions = await Transaction.find({
            eventId: { $in: eventIds },
            status: 'completed'
        });

        // Calculate time range
        const now = new Date();
        let startDate = new Date();
        switch (timeRange) {
            case '1month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case '3months':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case '6months':
                startDate.setMonth(now.getMonth() - 6);
                break;
            default:
                startDate = new Date(0); // All time
        }

        // Filter transactions by time range
        const filteredTransactions = transactions.filter(t => 
            new Date(t.createdAt) >= startDate
        );

        // Revenue analytics
        const totalRevenue = transactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);
        const periodRevenue = filteredTransactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);

        // Bookings over time
        const bookingsByMonth = new Map<string, number>();
        bookings.forEach(booking => {
            const month = new Date(booking.createdAt).toISOString().slice(0, 7);
            bookingsByMonth.set(month, (bookingsByMonth.get(month) || 0) + 1);
        });

        // Revenue over time
        const revenueByMonth = new Map<string, number>();
        transactions.forEach(transaction => {
            const month = new Date(transaction.createdAt).toISOString().slice(0, 7);
            const current = revenueByMonth.get(month) || 0;
            revenueByMonth.set(month, current + (transaction.organizerRevenue || 0));
        });

        // Events by status
        const eventsByStatus = events.reduce((acc: any, event) => {
            acc[event.status] = (acc[event.status] || 0) + 1;
            return acc;
        }, {});

        // Events by mode
        const eventsByMode = events.reduce((acc: any, event) => {
            acc[event.mode] = (acc[event.mode] || 0) + 1;
            return acc;
        }, {});

        // Top performing events
        const eventPerformance = events.map(event => {
            const eventBookings = bookings.filter(b => b.eventId.toString() === event._id.toString());
            const eventTransactions = transactions.filter(t => t.eventId.toString() === event._id.toString());
            const eventRevenue = eventTransactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);

            return {
                eventId: event._id.toString(),
                title: event.title,
                bookings: eventBookings.length,
                revenue: eventRevenue,
            };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        const analytics = {
            totalRevenue,
            periodRevenue,
            totalBookings: bookings.length,
            periodBookings: bookings.filter(b => new Date(b.createdAt) >= startDate).length,
            bookingsOverTime: Array.from(bookingsByMonth.entries()).map(([month, count]) => ({
                month,
                count,
            })),
            revenueOverTime: Array.from(revenueByMonth.entries()).map(([month, revenue]) => ({
                month,
                revenue,
            })),
            eventsByStatus,
            eventsByMode,
            topEvents: eventPerformance,
        };

        return handleSuccessResponse("Analytics retrieved successfully", analytics);
    } catch (error) {
        return handleApiError(error);
    }
}

