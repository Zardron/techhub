import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Transaction from "@/database/transaction.model";
import Subscription from "@/database/subscription.model";
import Plan from "@/database/plan.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get financial overview (admin only)
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

        // Only admins can access this
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const timeRange = searchParams.get('timeRange') || 'all';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Calculate date range
        let dateFilter: any = {};
        if (timeRange !== 'all') {
            const now = new Date();
            let start = new Date();
            
            switch (timeRange) {
                case 'today':
                    start.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    start.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    start.setMonth(now.getMonth() - 1);
                    break;
                case '3months':
                    start.setMonth(now.getMonth() - 3);
                    break;
                case '6months':
                    start.setMonth(now.getMonth() - 6);
                    break;
                case 'year':
                    start.setFullYear(now.getFullYear() - 1);
                    break;
            }
            dateFilter.createdAt = { $gte: start };
        }

        // Custom date range
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Get all completed transactions
        const transactions = await Transaction.find({
            status: 'completed',
            ...dateFilter,
        }).populate('eventId', 'title organizerId').populate('userId', 'name email');

        // Calculate platform revenue
        const totalPlatformRevenue = transactions.reduce((sum, t) => sum + (t.platformFee || 0), 0);
        const totalOrganizerRevenue = transactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);
        const totalTransactionAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalRefunded = transactions
            .filter(t => t.status === 'refunded' || t.status === 'partially_refunded')
            .reduce((sum, t) => sum + (t.refundAmount || 0), 0);

        // Get subscription revenue
        const subscriptions = await Subscription.find({
            status: { $in: ['active', 'trialing'] },
            ...dateFilter,
        }).populate('planId');

        const subscriptionRevenue = subscriptions.reduce((sum, sub: any) => {
            const plan = sub.planId;
            if (plan && plan.price) {
                return sum + plan.price;
            }
            return sum;
        }, 0);

        // Monthly breakdown
        const monthlyData: Record<string, { platformRevenue: number; organizerRevenue: number; transactions: number }> = {};
        transactions.forEach((t: any) => {
            const month = new Date(t.createdAt).toISOString().slice(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { platformRevenue: 0, organizerRevenue: 0, transactions: 0 };
            }
            monthlyData[month].platformRevenue += t.platformFee || 0;
            monthlyData[month].organizerRevenue += t.organizerRevenue || 0;
            monthlyData[month].transactions += 1;
        });

        const monthlyBreakdown = Object.entries(monthlyData)
            .map(([month, data]) => ({
                month,
                platformRevenue: data.platformRevenue,
                organizerRevenue: data.organizerRevenue,
                transactions: data.transactions,
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // Top events by revenue
        const eventRevenue: Record<string, { eventId: string; eventTitle: string; revenue: number; transactions: number }> = {};
        transactions.forEach((t: any) => {
            const eventId = t.eventId?._id?.toString();
            if (eventId) {
                if (!eventRevenue[eventId]) {
                    eventRevenue[eventId] = {
                        eventId,
                        eventTitle: t.eventId?.title || 'Unknown',
                        revenue: 0,
                        transactions: 0,
                    };
                }
                eventRevenue[eventId].revenue += t.organizerRevenue || 0;
                eventRevenue[eventId].transactions += 1;
            }
        });

        const topEvents = Object.values(eventRevenue)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        return handleSuccessResponse("Financial data retrieved successfully", {
            summary: {
                totalPlatformRevenue,
                totalOrganizerRevenue,
                totalTransactionAmount,
                totalRefunded,
                subscriptionRevenue,
                totalRevenue: totalPlatformRevenue + subscriptionRevenue,
                netRevenue: totalPlatformRevenue + subscriptionRevenue - totalRefunded,
                transactionCount: transactions.length,
            },
            monthlyBreakdown,
            topEvents,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

