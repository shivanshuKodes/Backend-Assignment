import { Request, Response } from 'express';
import { GetCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import ddbDocClient from "../config/dynamoDB";
import { generateRegistrationId, extractCourseIdFromRegistration } from "../utils/helpers";
import { RegistrationStatus, CancellationStatus, EntityType } from "../types/enums";

const TABLE_NAME = process.env.TABLE_NAME || "CourseManagementTable";

/**
 * Register an employee for a course
 * POST /add/register/:course_id
 */
export const registerForCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { course_id } = req.params;
        const { employee_name, email, course_id: bodyCourseId } = req.body;

        // Validate required fields
        if (!employee_name || !email || !course_id) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: "employee_name, email and course_id cannot be empty"
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

        // Check if course is already allotted
        if (course.is_allotted) {
            res.status(400).json({
                status: 400,
                message: "Course already allotted",
                data: {
                    failure: {
                        Message: "Cannot register for a course that has already been allotted"
                    }
                }
            });
            return;
        }

        // Check if employee already registered for this course
        const existingRegistration = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `EMPLOYEE#${email.toUpperCase()}`,
                SK: `COURSE#${course_id}`
            }
        }));

        if (existingRegistration.Item) {
            res.status(400).json({
                status: 400,
                message: "Already registered",
                data: {
                    failure: {
                        Message: "Employee already registered for this course"
                    }
                }
            });
            return;
        }

        // Check if course is full
        if (course.current_count >= course.max_employees) {
            res.status(400).json({
                status: 400,
                message: "COURSE_FULL_ERROR",
                data: {
                    failure: {
                        Message: "cannot register for course, course is full"
                    }
                }
            });
            return;
        }

        // Generate registration ID
        const registration_id = generateRegistrationId(employee_name, course_id);

        // Create registration (2 items for different access patterns + update count)
        await ddbDocClient.send(new TransactWriteCommand({
            TransactItems: [
                // Item 1: Registration under course
                {
                    Put: {
                        TableName: TABLE_NAME,
                        Item: {
                            PK: `COURSE#${course_id}`,
                            SK: `REG#${registration_id}`,
                            registration_id,
                            employee_name,
                            email,
                            course_id,
                            status: RegistrationStatus.ACCEPTED,
                            created_at: new Date().toISOString(),
                            entity_type: EntityType.REGISTRATION
                        }
                    }
                },
                // Item 2: Employee's registration (for duplicate check)
                {
                    Put: {
                        TableName: TABLE_NAME,
                        Item: {
                            PK: `EMPLOYEE#${email.toUpperCase()}`,
                            SK: `COURSE#${course_id}`,
                            registration_id,
                            employee_name,
                            course_id,
                            status: RegistrationStatus.ACCEPTED,
                            entity_type: EntityType.EMPLOYEE_COURSE
                        }
                    }
                },
                // Item 3: Increment course count
                {
                    Update: {
                        TableName: TABLE_NAME,
                        Key: {
                            PK: `COURSE#${course_id}`,
                            SK: "METADATA"
                        },
                        UpdateExpression: "ADD current_count :inc",
                        ExpressionAttributeValues: {
                            ":inc": 1
                        }
                    }
                }
            ]
        }));

        res.status(200).json({
            status: 200,
            message: `successfully registered for ${course_id}`,
            data: {
                success: {
                    registration_id,
                    status: RegistrationStatus.ACCEPTED
                }
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error registering for course:', message);
        res.status(500).json({
            status: 500,
            message: "Error registering for course",
            data: {
                failure: {
                    Message: message
                }
            }
        });
    }
};

/**
 * Cancel a course registration
 * POST /cancel/:registration_id
 */
export const cancelRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
        const { registration_id } = req.params;

        // Validate registration ID
        if (!registration_id) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: "registration_id cannot be empty"
                    }
                }
            });
            return;
        }

        // Extract course_id from registration_id
        const course_id = extractCourseIdFromRegistration(registration_id);

        // Get the registration
        const registrationResult = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `COURSE#${course_id}`,
                SK: `REG#${registration_id}`
            }
        }));

        if (!registrationResult.Item) {
            res.status(404).json({
                status: 404,
                message: "Registration not found",
                data: {
                    failure: {
                        Message: `Registration ${registration_id} does not exist`
                    }
                }
            });
            return;
        }

        const registration = registrationResult.Item;

        // Get course to check if allotted
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

        // Check if course is already allotted
        if (course.is_allotted) {
            res.status(200).json({
                status: 200,
                message: "Cancel registration unsuccessful",
                data: {
                    success: {
                        registration_id,
                        course_id,
                        status: CancellationStatus.CANCEL_REJECTED
                    }
                }
            });
            return;
        }

        // Delete registration (both items) and decrement count
        await ddbDocClient.send(new TransactWriteCommand({
            TransactItems: [
                // Delete registration under course
                {
                    Delete: {
                        TableName: TABLE_NAME,
                        Key: {
                            PK: `COURSE#${course_id}`,
                            SK: `REG#${registration_id}`
                        }
                    }
                },
                // Delete employee's registration
                {
                    Delete: {
                        TableName: TABLE_NAME,
                        Key: {
                            PK: `EMPLOYEE#${registration.email.toUpperCase()}`,
                            SK: `COURSE#${course_id}`
                        }
                    }
                },
                // Decrement course count
                {
                    Update: {
                        TableName: TABLE_NAME,
                        Key: {
                            PK: `COURSE#${course_id}`,
                            SK: "METADATA"
                        },
                        UpdateExpression: "ADD current_count :dec",
                        ExpressionAttributeValues: {
                            ":dec": -1
                        }
                    }
                }
            ]
        }));

        res.status(200).json({
            status: 200,
            message: "Cancel registration successful",
            data: {
                success: {
                    registration_id,
                    course_id,
                    status: CancellationStatus.CANCEL_ACCEPTED
                }
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error canceling registration:', message);
        res.status(500).json({
            status: 500,
            message: "Error canceling registration",
            data: {
                failure: {
                    Message: message
                }
            }
        });
    }
};
