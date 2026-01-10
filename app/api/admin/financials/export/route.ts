import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Transaction from "@/database/transaction.model";
import Subscription from "@/database/subscription.model";
import Plan from "@/database/plan.model";
import { handleApiError } from "@/lib/utils";

// GET - Export financial data as CSV
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
        })
            .populate('eventId', 'title organizerId')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        // Get subscription revenue
        const subscriptions = await Subscription.find({
            status: { $in: ['active', 'trialing'] },
            ...dateFilter,
        }).populate('planId');

        // Format CSV data
        const csvRows = [];
        
        // Summary section
        const totalPlatformRevenue = transactions.reduce((sum, t) => sum + (t.platformFee || 0), 0);
        const totalOrganizerRevenue = transactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);
        const totalTransactionAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const subscriptionRevenue = subscriptions.reduce((sum, sub: any) => {
            const plan = sub.planId;
            if (plan && plan.price) {
                return sum + plan.price;
            }
            return sum;
        }, 0);

        csvRows.push(['Financial Report Summary']);
        csvRows.push(['Period', timeRange === 'all' ? 'All Time' : timeRange]);
        csvRows.push(['Total Platform Revenue', (totalPlatformRevenue / 100).toFixed(2)]);
        csvRows.push(['Total Organizer Revenue', (totalOrganizerRevenue / 100).toFixed(2)]);
        csvRows.push(['Total Transaction Amount', (totalTransactionAmount / 100).toFixed(2)]);
        csvRows.push(['Subscription Revenue', (subscriptionRevenue / 100).toFixed(2)]);
        csvRows.push(['Total Revenue', ((totalPlatformRevenue + subscriptionRevenue) / 100).toFixed(2)]);
        csvRows.push(['']);
        csvRows.push(['Transaction Details']);
        csvRows.push([
            'Date',
            'Event',
            'Customer',
            'Amount',
            'Platform Fee',
            'Organizer Revenue',
            'Status',
            'Payment Method'
        ].join(','));

        transactions.forEach((transaction: any) => {
            const event = transaction.eventId;
            const customer = transaction.userId;
            const row = [
                transaction.createdAt.toISOString(),
                event?.title || 'N/A',
                customer?.name || customer?.email || 'N/A',
                (transaction.amount / 100).toFixed(2),
                (transaction.platformFee / 100).toFixed(2),
                (transaction.organizerRevenue / 100).toFixed(2),
                transaction.status,
                transaction.paymentMethod,
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
            
            csvRows.push(row);
        });

        csvRows.push(['']);
        csvRows.push(['Subscription Details']);
        csvRows.push(['Plan', 'Status', 'Amount', 'Created At'].join(','));

        subscriptions.forEach((subscription: any) => {
            const plan = subscription.planId;
            const row = [
                plan?.name || 'N/A',
                subscription.status,
                plan?.price ? (plan.price / 100).toFixed(2) : '0.00',
                subscription.createdAt.toISOString(),
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
            
            csvRows.push(row);
        });

        const csvContent = csvRows.join('\n');

        // Return CSV file
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="financial-report-${timeRange}-${Date.now()}.csv"`,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

