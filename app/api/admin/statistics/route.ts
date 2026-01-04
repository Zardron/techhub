import User from "@/database/user.model";
import Event from "@/database/event.model";
import Booking from "@/database/booking.model";
import connectDB from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        // Verify token
        const tokenPayload = verifyToken(req);

        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized - Invalid or missing token" },
                { status: 401 }
            );
        }

        // Get user to check if they are admin (exclude soft-deleted users)
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

        // Check if user is admin
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        // Get total counts (exclude soft-deleted users)
        const totalUsers = await User.countDocuments({ deleted: { $ne: true } });
        const totalEvents = await Event.countDocuments();
        const totalBookings = await Booking.countDocuments();

        // Get unique organizers count
        const uniqueOrganizers = await Event.distinct('organizer');
        const totalOrganizers = uniqueOrganizers.length;

        // Get user role distribution (exclude soft-deleted users)
        const userRoleDistribution = await User.aggregate([
            {
                $match: {
                    deleted: { $ne: true }
                }
            },
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        const roleDistribution = userRoleDistribution.reduce((acc: Record<string, number>, item: { _id: string; count: number }) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        // Get events created over last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const eventsOverTime = await Event.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Get bookings over last 6 months
        const bookingsOverTime = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Get user registrations over last 6 months (exclude soft-deleted users)
        const usersOverTime = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo },
                    deleted: { $ne: true }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Format events over time data
        const eventsOverTimeFormatted = eventsOverTime.map((item: any) => ({
            month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
            count: item.count
        }));

        // Format bookings over time data
        const bookingsOverTimeFormatted = bookingsOverTime.map((item: any) => ({
            month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
            count: item.count
        }));

        // Format users over time data
        const usersOverTimeFormatted = usersOverTime.map((item: any) => ({
            month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
            count: item.count
        }));

        // Get events by mode (online, offline, hybrid)
        const eventsByMode = await Event.aggregate([
            {
                $group: {
                    _id: '$mode',
                    count: { $sum: 1 }
                }
            }
        ]);

        const modeDistribution = eventsByMode.reduce((acc: Record<string, number>, item: { _id: string; count: number }) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const statistics = {
            totals: {
                users: totalUsers,
                events: totalEvents,
                bookings: totalBookings,
                organizers: totalOrganizers,
            },
            roleDistribution,
            modeDistribution,
            eventsOverTime: eventsOverTimeFormatted,
            bookingsOverTime: bookingsOverTimeFormatted,
            usersOverTime: usersOverTimeFormatted,
        };

        return handleSuccessResponse("Statistics fetched successfully", statistics);
    } catch (error) {
        return handleApiError(error);
    }
}

