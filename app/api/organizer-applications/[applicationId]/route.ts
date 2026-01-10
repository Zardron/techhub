import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import OrganizerApplication from "@/database/organizer-application.model";
import Organizer from "@/database/organizer.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// PATCH - Review organizer application (approve/reject)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ applicationId: string }> }
): Promise<NextResponse> {
    try {
        await connectDB();

        const { applicationId } = await params;
        const tokenPayload = verifyToken(req);

        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const admin = await User.findOne({
            _id: tokenPayload.id,
            deleted: { $ne: true }
        });

        if (!admin) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        if (admin.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const application = await OrganizerApplication.findById(applicationId)
            .populate('userId');

        if (!application) {
            return NextResponse.json(
                { message: "Application not found" },
                { status: 404 }
            );
        }

        if (application.status !== 'pending') {
            return NextResponse.json(
                { message: "Application has already been reviewed" },
                { status: 400 }
            );
        }

        const { action, rejectionReason } = await req.json();

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { message: "Action must be 'approve' or 'reject'" },
                { status: 400 }
            );
        }

        if (action === 'approve') {
            // Check if organizer name is still available
            const existingOrganizer = await Organizer.findOne({
                name: application.organizerName,
                deleted: { $ne: true }
            });

            if (existingOrganizer) {
                return NextResponse.json(
                    { message: "Organizer name is already taken" },
                    { status: 409 }
                );
            }

            // Create organizer
            const organizer = await Organizer.create({
                name: application.organizerName,
                description: application.description,
                website: application.website,
                logo: undefined, // Can be added later
            });

            // Update user to organizer role
            const applicant = application.userId as any;
            applicant.role = 'organizer';
            applicant.organizerId = organizer._id;
            await applicant.save();

            // Automatically assign Free plan to the new organizer
            try {
                const Plan = (await import("@/database/plan.model")).default;
                const Subscription = (await import("@/database/subscription.model")).default;

                // Find or create Free plan
                let freePlan = await Plan.findOne({ name: 'Free', isActive: true });
                
                if (!freePlan) {
                    // Create Free plan if it doesn't exist
                    freePlan = await Plan.create({
                        name: 'Free',
                        description: 'Perfect for getting started with event management',
                        price: 0,
                        currency: 'php',
                        billingCycle: 'monthly',
                        features: {
                            maxEvents: 3,
                            maxBookingsPerEvent: 50,
                            analytics: false,
                            customBranding: false,
                            prioritySupport: false,
                            apiAccess: false,
                            whiteLabel: false,
                        },
                        limits: {
                            eventsPerMonth: 3,
                            bookingsPerMonth: 150,
                        },
                        isActive: true,
                    });
                }

                // Check if user already has a subscription
                const existingSubscription = await Subscription.findOne({
                    userId: applicant._id,
                    status: { $in: ['active', 'trialing'] }
                });

                // Create free subscription if user doesn't have one
                if (!existingSubscription) {
                    const now = new Date();
                    const periodEnd = new Date(now);
                    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month from now

                    await Subscription.create({
                        userId: applicant._id,
                        planId: freePlan._id,
                        status: 'active', // Free plan is immediately active
                        currentPeriodStart: now,
                        currentPeriodEnd: periodEnd,
                        cancelAtPeriodEnd: false,
                    });
                }
            } catch (subscriptionError) {
                console.error('Failed to assign free plan:', subscriptionError);
                // Don't fail the approval if subscription creation fails
                // The organizer can still subscribe manually later
            }

            // Update application status
            application.status = 'approved';
            application.reviewedBy = admin._id;
            application.reviewedAt = new Date();
            await application.save();

            // Create notification for user
            try {
                const Notification = (await import("@/database/notification.model")).default;
                await Notification.create({
                    userId: applicant._id,
                    type: 'organizer_application_approved',
                    title: 'Organizer Application Approved',
                    message: `Congratulations! Your application to become "${organizer.name}" has been approved. You've been automatically assigned the Free plan. You can now access the organizer dashboard and start creating events!`,
                    link: '/organizer-dashboard',
                    metadata: {
                        organizerId: organizer._id.toString(),
                        applicationId: application._id.toString(),
                    },
                });

                // Send welcome email
                try {
                    const { sendEmail, emailTemplates } = await import("@/lib/email");
                    await sendEmail({
                        to: applicant.email,
                        subject: `Welcome to TechEventX as ${organizer.name}!`,
                        html: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="utf-8">
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                                    .steps { margin: 20px 0; }
                                    .step { padding: 15px; background: white; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>🎉 Welcome to TechEventX!</h1>
                                    </div>
                                    <div class="content">
                                        <p>Congratulations! Your application to become <strong>${organizer.name}</strong> has been approved.</p>
                                        <p>You now have access to the organizer dashboard where you can:</p>
                                        <div class="steps">
                                            <div class="step">
                                                <strong>1. You're on the Free Plan</strong><br>
                                                You've been automatically assigned the Free plan. Upgrade anytime to unlock more features!
                                            </div>
                                            <div class="step">
                                                <strong>2. Create Events</strong><br>
                                                Start hosting amazing tech events
                                            </div>
                                            <div class="step">
                                                <strong>3. Manage Attendees</strong><br>
                                                Track bookings and check-in attendees
                                            </div>
                                            <div class="step">
                                                <strong>4. Track Analytics</strong><br>
                                                Monitor your event performance and revenue
                                            </div>
                                        </div>
                                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://techeventx.com'}/organizer-dashboard" class="button">Go to Organizer Dashboard</a>
                                        <p style="margin-top: 20px; font-size: 12px; color: #666;">
                                            If you have any questions, feel free to contact our support team.
                                        </p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `,
                    });
                } catch (emailError) {
                    console.error('Failed to send welcome email:', emailError);
                    // Don't fail the approval if email fails
                }
            } catch (error) {
                console.error('Failed to create notification:', error);
                // Don't fail the approval if notification fails
            }

            return handleSuccessResponse("Application approved successfully", {
                application: {
                    id: application._id.toString(),
                    status: application.status,
                    organizer: {
                        id: organizer._id.toString(),
                        name: organizer.name,
                    },
                    user: {
                        id: applicant._id.toString(),
                        email: applicant.email,
                    }
                }
            });
        } else {
            // Reject application
            if (!rejectionReason || !rejectionReason.trim()) {
                return NextResponse.json(
                    { message: "Rejection reason is required" },
                    { status: 400 }
                );
            }

            application.status = 'rejected';
            application.reviewedBy = admin._id;
            application.reviewedAt = new Date();
            application.rejectionReason = rejectionReason.trim();
            await application.save();

            // Create notification for user
            try {
                const Notification = (await import("@/database/notification.model")).default;
                const applicant = application.userId as any;
                await Notification.create({
                    userId: applicant._id,
                    type: 'organizer_application_rejected',
                    title: 'Organizer Application Rejected',
                    message: `Your application to become "${application.organizerName}" has been rejected. Reason: ${rejectionReason.trim()}`,
                    link: '/become-organizer',
                    metadata: {
                        applicationId: application._id.toString(),
                        rejectionReason: rejectionReason.trim(),
                    },
                });
            } catch (error) {
                console.error('Failed to create notification:', error);
                // Don't fail the rejection if notification fails
            }

            return handleSuccessResponse("Application rejected successfully", {
                application: {
                    id: application._id.toString(),
                    status: application.status,
                }
            });
        }
    } catch (error) {
        return handleApiError(error);
    }
}

