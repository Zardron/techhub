import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import PlatformSettings from "@/database/platformsettings.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get platform settings
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

        // Get or create settings
        let settings = await PlatformSettings.findOne();
        if (!settings) {
            settings = await PlatformSettings.create({});
        }

        return handleSuccessResponse("Platform settings retrieved successfully", {
            settings: {
                platformFeePercentage: settings.platformFeePercentage,
                minimumPayoutAmount: settings.minimumPayoutAmount,
                currency: settings.currency,
                platformName: settings.platformName,
                platformDescription: settings.platformDescription,
                contactEmail: settings.contactEmail,
                supportEmail: settings.supportEmail,
                maintenanceMode: settings.maintenanceMode,
                maintenanceMessage: settings.maintenanceMessage,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// PUT - Update platform settings
export async function PUT(req: NextRequest): Promise<NextResponse> {
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

        // Only admins can update settings
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const {
            platformFeePercentage,
            minimumPayoutAmount,
            currency,
            platformName,
            platformDescription,
            contactEmail,
            supportEmail,
            maintenanceMode,
            maintenanceMessage,
        } = body;

        // Get or create settings
        let settings = await PlatformSettings.findOne();
        if (!settings) {
            settings = await PlatformSettings.create({});
        }

        // Update fields
        if (platformFeePercentage !== undefined) {
            if (platformFeePercentage < 0 || platformFeePercentage > 100) {
                return NextResponse.json(
                    { message: "Platform fee percentage must be between 0 and 100" },
                    { status: 400 }
                );
            }
            settings.platformFeePercentage = platformFeePercentage;
        }

        if (minimumPayoutAmount !== undefined) {
            if (minimumPayoutAmount < 0) {
                return NextResponse.json(
                    { message: "Minimum payout amount cannot be negative" },
                    { status: 400 }
                );
            }
            settings.minimumPayoutAmount = minimumPayoutAmount;
        }

        if (currency) settings.currency = currency.toUpperCase();
        if (platformName) settings.platformName = platformName;
        if (platformDescription) settings.platformDescription = platformDescription;
        if (contactEmail) settings.contactEmail = contactEmail;
        if (supportEmail) settings.supportEmail = supportEmail;
        if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
        if (maintenanceMessage !== undefined) settings.maintenanceMessage = maintenanceMessage;

        await settings.save();

        return handleSuccessResponse("Platform settings updated successfully", {
            settings: {
                platformFeePercentage: settings.platformFeePercentage,
                minimumPayoutAmount: settings.minimumPayoutAmount,
                currency: settings.currency,
                platformName: settings.platformName,
                platformDescription: settings.platformDescription,
                contactEmail: settings.contactEmail,
                supportEmail: settings.supportEmail,
                maintenanceMode: settings.maintenanceMode,
                maintenanceMessage: settings.maintenanceMessage,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

