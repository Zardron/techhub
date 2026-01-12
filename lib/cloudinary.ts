import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary - ensure it's configured on every call
const configureCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        console.error('❌ Cloudinary environment variables missing:', {
            hasCloudName: !!cloudName,
            hasApiKey: !!apiKey,
            hasApiSecret: !!apiSecret,
        });
        return false;
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
    });

    return true;
};

// Handle Image Upload to Cloudinary
export async function handleImageUpload(
    file: File | null,
    folder: string = 'TechEventX'
): Promise<{ success: true; url: string } | { success: false; response: NextResponse }> {
    if (!file) {
        return {
            success: false,
            response: NextResponse.json({ message: 'Image file is required' }, { status: 400 })
        };
    }

    // Configure Cloudinary
    if (!configureCloudinary()) {
        return {
            success: false,
            response: NextResponse.json(
                {
                    message: 'Image upload service is not configured. Please contact support.',
                    error: 'Cloudinary configuration missing'
                },
                { status: 500 }
            )
        };
    }

    try {
        console.log('📤 Starting file upload:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            folder: folder,
        });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log('📦 File converted to buffer, size:', buffer.length);

        // Add timeout to prevent hanging
        const uploadResult = await Promise.race([
            new Promise<{ secure_url: string }>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'image',
                        folder: folder,
                        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                        timeout: 60000, // 60 seconds timeout
                    },
                    (error, result) => {
                        if (error) {
                            console.error('❌ Cloudinary Upload Error Details:', {
                                message: error.message,
                                http_code: error.http_code,
                                name: error.name,
                            });
                            reject(error);
                        } else if (!result || !result.secure_url) {
                            console.error('❌ Cloudinary Upload Error: No URL returned', result);
                            reject(new Error('Upload failed: No URL returned from Cloudinary'));
                        } else {
                            console.log('✅ Upload successful, URL:', result.secure_url);
                            resolve(result as { secure_url: string });
                        }
                    }
                );
                
                uploadStream.end(buffer);
            }),
            new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Upload timeout: Request took too long'));
                }, 60000); // 60 second timeout
            })
        ]);

        return {
            success: true,
            url: uploadResult.secure_url
        };
    } catch (error) {
        console.error('❌ Image Upload Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown Error';
        return {
            success: false,
            response: NextResponse.json(
                {
                    message: 'Failed to upload image. Please try again.',
                    error: errorMessage
                },
                { status: 500 }
            )
        };
    }
}

