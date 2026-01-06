import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Appeal from "@/database/appeal.model";
import User from "@/database/user.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import { verifyAdminAccess } from "@/app/api/admin/route";
import mongoose from "mongoose";

// Protected route - Get all appeals (GET)
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const { error } = await verifyAdminAccess(req);
        if (error) return error;

        await connectDB();

        // Get all appeals, sorted by most recent first
        const appeals = await Appeal.find({})
            .sort({ createdAt: -1 })
            .lean();

        // Get all unique user IDs from appeals
        const userIds = appeals
            .map((appeal) => appeal.userId)
            .filter((id): id is string => Boolean(id))
            .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

        // Look up all users referenced in appeals (regardless of banned status)
        const usersMap = new Map();
        if (userIds.length > 0) {
            // Convert string IDs to ObjectIds for the query
            const objectIds = userIds
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
                .map((id) => new mongoose.Types.ObjectId(id));

            if (objectIds.length > 0) {
                const users = await User.find({
                    _id: { $in: objectIds },
                    deleted: { $ne: true }
                })
                    .select('_id name email role createdAt')
                    .lean();

                users.forEach((user) => {
                    usersMap.set(user._id.toString(), user);
                });
            }
        }

        // Get all banned users (for the banned users without appeals section)
        const bannedUsers = await User.find({
            banned: true,
            deleted: { $ne: true }
        })
            .select('_id name email role createdAt')
            .sort({ createdAt: -1 })
            .lean();

        // Match appeals with users
        const appealsWithUsers = appeals.map((appeal) => {
            const user = appeal.userId ? usersMap.get(appeal.userId) : null;
            return {
                ...appeal,
                _id: appeal._id.toString(),
                user: user ? {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                } : null,
            };
        });

        // Get banned users without appeals
        const bannedUsersWithoutAppeals = bannedUsers
            .filter((user) => !appeals.some((appeal) => appeal.userId === user._id.toString()))
            .map((user) => ({
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                bannedAt: user.createdAt,
            }));

        return handleSuccessResponse("Appeals retrieved successfully", {
            appeals: appealsWithUsers,
            bannedUsers: bannedUsersWithoutAppeals,
            totalAppeals: appeals.length,
            totalBannedUsers: bannedUsers.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// Protected route - Update appeal status (PATCH)
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    try {
        const { error, user } = await verifyAdminAccess(req);
        if (error) return error;

        await connectDB();

        const { appealId, status, adminNotes } = await req.json();

        if (!appealId || !status) {
            return NextResponse.json(
                { message: "Appeal ID and status are required" },
                { status: 400 }
            );
        }

        if (!['pending', 'reviewed', 'approved', 'rejected'].includes(status)) {
            return NextResponse.json(
                { message: "Invalid status. Must be one of: pending, reviewed, approved, rejected" },
                { status: 400 }
            );
        }

        const appeal = await Appeal.findById(appealId);

        if (!appeal) {
            return NextResponse.json(
                { message: "Appeal not found" },
                { status: 404 }
            );
        }

        // Update appeal status
        const updatedAppeal = await Appeal.findByIdAndUpdate(
            appealId,
            {
                status,
                reviewedBy: user!._id.toString(),
                reviewedAt: new Date(),
                adminNotes: adminNotes || appeal.adminNotes,
            },
            { new: true }
        );

        // If approved and user exists, unban the user
        if (status === 'approved' && appeal.userId) {
            await User.findByIdAndUpdate(
                appeal.userId,
                { banned: false },
                { new: true }
            );
        }

        return handleSuccessResponse("Appeal updated successfully", {
            appeal: {
                ...updatedAppeal!.toObject(),
                _id: updatedAppeal!._id.toString(),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

