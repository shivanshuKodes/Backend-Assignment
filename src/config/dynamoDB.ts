import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";


// Configuration for DynamoDB (local or AWS)
const client = new DynamoDBClient({
    region: "local",
    endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
    credentials: {
        accessKeyId: "fakeMyKeyId",
        secretAccessKey: "fakeSecretAccessKey",
    },
});

// The Document Client simplifies data handling
const ddbDocClient = DynamoDBDocumentClient.from(client);

export default ddbDocClient;