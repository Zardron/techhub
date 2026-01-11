import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Notification from "@/database/notification.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import mongoose from "mongoose";

// GET - Get user's notifications
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

        const { searchParams } = new URL(req.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const limit = parseInt(searchParams.get('limit') || '50');

        // Ensure userId is properly converted to ObjectId for query
        const userId = typeof user._id === 'string' 
            ? new mongoose.Types.ObjectId(user._id) 
            : user._id;

        const query: any = { userId };
        if (unreadOnly) {
            query.read = false;
        }

        console.log('🔔 Fetching notifications for user:', {
            userId: userId.toString(),
            userIdType: typeof userId,
            unreadOnly,
            query
        });

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);

        console.log(`🔔 Found ${notifications.length} notifications`);

        const unreadCount = await Notification.countDocuments({
            userId,
            read: false,
        });

        console.log(`🔔 Unread count: ${unreadCount}`);

        const notificationsData = notifications.map(notif => ({
            id: notif._id.toString(),
            type: notif.type,
            title: notif.title,
            message: notif.message,
            link: notif.link,
            read: notif.read,
            readAt: notif.readAt,
            createdAt: notif.createdAt,
        }));

        return handleSuccessResponse("Notifications retrieved successfully", {
            notifications: notificationsData,
            unreadCount,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH - Mark notification as read
export async function PATCH(req: NextRequest): Promise<NextResponse> {
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

        const { notificationId, markAllAsRead } = await req.json();

        if (markAllAsRead) {
            await Notification.updateMany(
                { userId: user._id, read: false },
                { read: true, readAt: new Date() }
            );
            return handleSuccessResponse("All notifications marked as read");
        }

        if (!notificationId) {
            return NextResponse.json(
                { message: "Notification ID is required" },
                { status: 400 }
            );
        }

        const notification = await Notification.findOne({
            _id: notificationId,
            userId: user._id,
        });

        if (!notification) {
            return NextResponse.json(
                { message: "Notification not found" },
                { status: 404 }
            );
        }

        notification.read = true;
        notification.readAt = new Date();
        await notification.save();

        return handleSuccessResponse("Notification marked as read", {
            notification: {
                id: notification._id.toString(),
                read: notification.read,
                readAt: notification.readAt,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

