import mongoose, { Mongoose } from 'mongoose';

const getMongoURI = (): string => {
    if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

    const { MONGO_DB_SRV, MONGO_DB_USER, MONGO_DB_PASSWORD, MONGO_DB_NAME } = process.env;
    if (!MONGO_DB_SRV || !MONGO_DB_USER || !MONGO_DB_PASSWORD || !MONGO_DB_NAME) {
        throw new Error('Missing MongoDB env vars: MONGODB_URI or MONGO_DB_*');
    }

    return `${MONGO_DB_SRV}${MONGO_DB_USER}:${encodeURIComponent(MONGO_DB_PASSWORD)}${MONGO_DB_NAME}`;
};

// Cache the connection promise to prevent multiple simultaneous connections
let connectionPromise: Promise<Mongoose> | null = null;

async function connectDB(): Promise<Mongoose> {
    try {
        // If already connected, return immediately
        if (mongoose.connection.readyState === 1) {
            return mongoose as Mongoose;
        }

        // If connection is in progress, wait for the existing promise
        if (connectionPromise) {
            return connectionPromise;
        }

        // Create new connection promise
        connectionPromise = mongoose.connect(getMongoURI())
            .then((conn) => {
                console.log('✅ MongoDB: Connected successfully');
                return conn;
            })
            .catch((error) => {
                connectionPromise = null; // Reset on error so we can retry
                console.error('❌ MongoDB: Connection failed', error);
                throw error;
            });

        return connectionPromise;
    } catch (error) {
        connectionPromise = null; // Reset on error
        console.error('❌ MongoDB: Connection failed', error);
        throw error;
    }
}

export default connectDB;
