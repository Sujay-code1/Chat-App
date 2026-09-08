import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const connectDb = async () => {
    const url = process.env.MONGO_URI;

    if (!url) {
        throw new Error("Mongo_uri is not defined in enviorment variable");
    }

    try {
        await mongoose.connect(url, {
            dbName: "Chatappmicroserviceapp"
        });
        console.log("Db connection Sucessfull");
    } catch (error) {
        console.error("Failed to connect Database", error);
        process.exit(1);
    }
};

export default connectDb;