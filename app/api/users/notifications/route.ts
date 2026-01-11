import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Notification from "@/database/notification.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import mongoose from "mongoose";

// GET - Get user notifications
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

        // Build query
        const query: any = { userId };
        if (unreadOnly) {
            query.read = false;
        }

        console.log('🔔 [users/notifications] Fetching notifications for user:', {
            userId: userId.toString(),
            userIdType: typeof userId,
            unreadOnly,
            query
        });

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);

        console.log(`🔔 [users/notifications] Found ${notifications.length} notifications`);

        const unreadCount = await Notification.countDocuments({
            userId,
            read: false,
        });

        console.log(`🔔 [users/notifications] Unread count: ${unreadCount}`);

        const formattedNotifications = notifications.map((notif: any) => ({
            id: notif._id.toString(),
            type: notif.type,
            title: notif.title,
            message: notif.message,
            link: notif.link,
            read: notif.read,
            readAt: notif.readAt,
            createdAt: notif.createdAt,
            metadata: notif.metadata,
        }));

        return handleSuccessResponse("Notifications retrieved successfully", {
            notifications: formattedNotifications,
            unreadCount,
            count: formattedNotifications.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH - Mark notifications as read
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

        const { notificationIds, markAllAsRead } = await req.json();

        if (markAllAsRead) {
            // Mark all as read
            await Notification.updateMany(
                { userId: user._id, read: false },
                { read: true, readAt: new Date() }
            );
        } else if (notificationIds && Array.isArray(notificationIds)) {
            // Mark specific notifications as read
            await Notification.updateMany(
                { _id: { $in: notificationIds }, userId: user._id },
                { read: true, readAt: new Date() }
            );
        } else {
            return NextResponse.json(
                { message: "notificationIds array or markAllAsRead flag is required" },
                { status: 400 }
            );
        }

        return handleSuccessResponse("Notifications marked as read", {});
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE - Delete notifications
export async function DELETE(req: NextRequest): Promise<NextResponse> {
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
        const notificationId = searchParams.get('notificationId');
        const deleteAll = searchParams.get('deleteAll') === 'true';

        if (deleteAll) {
            // Delete all notifications for the user
            await Notification.deleteMany({ userId: user._id });
            return handleSuccessResponse("All notifications deleted", {});
        }

        if (!notificationId) {
            return NextResponse.json(
                { message: "Notification ID is required" },
                { status: 400 }
            );
        }

        // Delete specific notification
        const result = await Notification.deleteOne({
            _id: notificationId,
            userId: user._id,
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { message: "Notification not found" },
                { status: 404 }
            );
        }

        return handleSuccessResponse("Notification deleted", {});
    } catch (error) {
        return handleApiError(error);
    }
}

