import 'dotenv/config';
import ddbDocClient from "./config/dynamoDB";
import express, { Application, Request, Response, NextFunction } from 'express';
import {
    CreateTableCommand,
    DescribeTableCommand,
    ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import courseRoutes from './routes/courseRoutes';
import registrationRoutes from './routes/registrationRoutes';



const app: Application = express();
const PORT = process.env.PORT || 3000;
const TABLE_NAME = "CourseManagementTable";


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Function to create table if it doesn't exist
async function initializeTable(): Promise<void> {
    // 1: Check if the table exists 
    try {
        const result = await ddbDocClient.send(
            new DescribeTableCommand({ TableName: TABLE_NAME })
        );

        if (result.Table?.TableStatus === 'ACTIVE') {
            console.log(`Table '${TABLE_NAME}' already exists and is active.`);
        } else {
            console.log(`Table '${TABLE_NAME}' exists but status is: ${result.Table?.TableStatus}`);
        }
        return;
    } catch (error: unknown) {
        // Only proceed if the error confirms the table doesn't exist
        if (error instanceof ResourceNotFoundException) {
            console.log(`Table '${TABLE_NAME}' does not exist. Creating...`);
        } else {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error("Error checking table status:", message);
            throw error; // Re-throw critical errors
        }
    }

    // 2: Create the table with mandatory PK and SK 
    try {
        await ddbDocClient.send(new CreateTableCommand({
            TableName: TABLE_NAME,
            KeySchema: [
                { AttributeName: 'PK', KeyType: 'HASH' },  // Partition Key
                { AttributeName: 'SK', KeyType: 'RANGE' }  // Sort Key
            ],
            AttributeDefinitions: [
                { AttributeName: 'PK', AttributeType: 'S' },
                { AttributeName: 'SK', AttributeType: 'S' }
            ],
            BillingMode: 'PAY_PER_REQUEST'
        }));

        console.log(`Table '${TABLE_NAME}' creation initiated. Waiting for it to become active...`);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error creating table:', message);
        throw error; // Re-throw to prevent server from starting with broken DB
    }
}


// API Routes
app.use('/', courseRoutes);
app.use('/', registrationRoutes);

//error router
app.use((err: unknown, req: Request, res: Response, next: NextFunction): void => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    res.status(500).json({ message });
})


initializeTable()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize table:', error);
    });

export default app;
