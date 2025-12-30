import mongoose, { Mongoose } from 'mongoose';

const getMongoURI = (): string => {
    if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

    const { MONGO_DB_SRV, MONGO_DB_USER, MONGO_DB_PASSWORD, MONGO_DB_NAME } = process.env;
    if (!MONGO_DB_SRV || !MONGO_DB_USER || !MONGO_DB_PASSWORD || !MONGO_DB_NAME) {
        throw new Error('Missing MongoDB env vars: MONGODB_URI or MONGO_DB_*');
    }

    return `${MONGO_DB_SRV}${MONGO_DB_USER}:${encodeURIComponent(MONGO_DB_PASSWORD)}${MONGO_DB_NAME}`;
};

async function connectDB(): Promise<Mongoose> {
    try {
        const conn = await mongoose.connect(getMongoURI(), { bufferCommands: false });
        console.log('✅ MongoDB: Connected successfully');
        return conn;
    } catch (error) {
        console.error('❌ MongoDB: Connection failed', error);
        throw error;
    }
}

export default connectDB;
