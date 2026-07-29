import mongoose from 'mongoose'

async function connectToDatabase() {
    const mongodbUri = process.env.MONGO;

    if (!mongodbUri) {
        throw new Error("Please define the MONGO environment variable");
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }
    const opts = {
        bufferCommands: false,
    }
    await mongoose.connect(mongodbUri, opts);
    return mongoose;
}

export default connectToDatabase;
