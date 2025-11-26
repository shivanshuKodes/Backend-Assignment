import { Request, Response } from 'express';
import { PutCommand, GetCommand, QueryCommand, UpdateCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import ddbDocClient from "../config/dynamoDB";
import { generateCourseId, sortByRegistrationId } from "../utils/helpers";
import { RegistrationStatus, CourseStatus, EntityType } from "../types/enums";

const TABLE_NAME = process.env.TABLE_NAME || "CourseManagementTable";

/**
 * Add a new course offering
 * POST /add/courseOffering
 */
export const addCourseOffering = async (req: Request, res: Response): Promise<void> => {
    try {
        const { course_name, instructor_name, start_date, min_employees, max_employees } = req.body;

        // Validate required fields
        if (!course_name || !instructor_name || !start_date ||
            min_employees === undefined || max_employees === undefined) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: "course_name, instructor_name, start_date, min_employees, max_employees cannot be empty"
                    }
                }
            });
            return;
        }

        // Validate min/max logic
        if (min_employees > max_employees) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: "min_employees cannot be greater than max_employees"
                    }
                }
            });
            return;
        }

        // Generate course ID
        const course_id = generateCourseId(course_name, instructor_name);

        // Save course to DynamoDB
        await ddbDocClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `COURSE#${course_id}`,
                SK: "METADATA",
                course_id,
                course_name,
                instructor_name,
                start_date,
                min_employees,
                max_employees,
                current_count: 0,
                is_allotted: false,
                entity_type: EntityType.COURSE
            }
        }));

        res.status(200).json({
            status: 200,
            message: "course added successfully",
            data: {
                success: {
                    course_id
                }
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error adding course:', message);
        res.status(500).json({
            status: 500,
            message: "Error adding course",
            data: {
                failure: {
                    Message: message
                }
            }
        });
    }
};

/**
 * Allot course to registered employees
 * POST /allot/:course_id
 */
export const allotCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { course_id } = req.params;

        // Validate course ID
        if (!course_id) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: "course_id cannot be empty"
                    }
                }
            });
            return;
        }

        // Get course metadata
        const courseResult = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `COURSE#${course_id}`,
                SK: "METADATA"
            }
        }));

        if (!courseResult.Item) {
            res.status(404).json({
                status: 404,
                message: "Course not found",
                data: {
                    failure: {
                        Message: `Course ${course_id} does not exist`
                    }
                }
            });
            return;
        }

        const course = courseResult.Item;

        // Check if already allotted
        if (course.is_allotted) {
            res.status(400).json({
                status: 400,
                message: "Course already allotted",
                data: {
                    failure: {
                        Message: "This course has already been allotted"
                    }
                }
            });
            return;
        }

        // Get all registrations for this course
        const registrationsResult = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `COURSE#${course_id}`,
                ":sk": "REG#"
            }
        }));

        const registrations = registrationsResult.Items || [];

        // Determine final status based on minimum requirement
        const finalStatus = registrations.length >= course.min_employees
            ? RegistrationStatus.CONFIRMED
            : RegistrationStatus.COURSE_CANCELED;

        // Update all registrations with final status
        if (registrations.length > 0) {
            const transactItems = registrations.map(reg => ({
                Update: {
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `COURSE#${course_id}`,
                        SK: `REG#${reg.registration_id}`
                    },
                    UpdateExpression: "SET #status = :status",
                    ExpressionAttributeNames: {
                        "#status": "status"
                    },
                    ExpressionAttributeValues: {
                        ":status": finalStatus
                    }
                }
            }));

            // Add course metadata update to mark as allotted
            transactItems.push({
                Update: {
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `COURSE#${course_id}`,
                        SK: "METADATA"
                    },
                    UpdateExpression: "SET is_allotted = :allotted, course_status = :status",
                    ExpressionAttributeValues: {
                        ":allotted": true,
                        ":status": finalStatus
                    } as any
                }
            } as any);

            await ddbDocClient.send(new TransactWriteCommand({
                TransactItems: transactItems
            }));
        } else {
            // No registrations, just mark course as allotted and canceled
            await ddbDocClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `COURSE#${course_id}`,
                    SK: "METADATA"
                },
                UpdateExpression: "SET is_allotted = :allotted, course_status = :status",
                ExpressionAttributeValues: {
                    ":allotted": true,
                    ":status": RegistrationStatus.COURSE_CANCELED
                }
            }));
        }

        // Prepare response with updated registrations
        const updatedRegistrations = registrations.map(reg => ({
            registration_id: reg.registration_id,
            email: reg.email,
            course_name: course.course_name,
            course_id: course_id,
            status: finalStatus
        }));

        // Sort by registration_id
        const sortedRegistrations = sortByRegistrationId(updatedRegistrations);

        // Determine response message based on final status
        const isCanceled = finalStatus === RegistrationStatus.COURSE_CANCELED;
        const message = isCanceled
            ? "Course canceled - minimum registrations not met"
            : "successfully allotted course to registered employees";

        res.status(200).json({
            status: 200,
            message: message,
            data: {
                success: sortedRegistrations
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error allotting course:', message);
        res.status(500).json({
            status: 500,
            message: "Error allotting course",
            data: {
                failure: {
                    Message: message
                }
            }
        });
    }
};
