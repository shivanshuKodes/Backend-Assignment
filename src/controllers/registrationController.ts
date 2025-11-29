import { Request, Response } from 'express';
import { GetCommand, TransactWriteCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import ddbDocClient from "../config/dynamoDB";
import { generateRegistrationId, extractCourseIdFromRegistration } from "../utils/helpers";
import { RegistrationStatus, CancellationStatus, EntityType } from "../constants/constants";
import { isValidEmail, sanitizeInput, isEmptyAfterTrim, isValidCourseIdFormat, isValidRegistrationIdFormat } from "../utils/validators";
import { handleControllerError } from "../constants/errorMessages";

const TABLE_NAME = process.env.TABLE_NAME || "CourseManagementTable";

/**
 * Register an employee for a course
 * @route POST /add/register/:course_id
 * @param {Request} req - Express request with course_id in params, employee details in body
 * @param {Response} res - Express response
 * @returns {Promise<void>}
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

        // Sanitize string inputs
        const sanitizedEmployeeName = sanitizeInput(employee_name);
        const sanitizedEmail = sanitizeInput(email);

        // Check for empty strings after trimming
        if (isEmptyAfterTrim(employee_name) || isEmptyAfterTrim(email)) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: "employee_name and email cannot be empty or contain only whitespace"
                    }
                }
            });
            return;
        }

        // Validate email format
        if (!isValidEmail(sanitizedEmail)) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: `Invalid email format. Provided: ${sanitizedEmail}`
                    }
                }
            });
            return;
        }

        // Validate course ID format
        if (!isValidCourseIdFormat(course_id)) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: `Invalid course ID format. Expected format: OFFERING-COURSENAME-INSTRUCTORNAME. Provided: ${course_id}`
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

        // Check if course is canceled (extra)
        if (course.course_status === RegistrationStatus.COURSE_CANCELED) {
            res.status(400).json({
                status: 400,
                message: "Course canceled",
                data: {
                    failure: {
                        Message: "Cannot register for a canceled course"
                    }
                }
            });
            return;
        }

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
                PK: `EMPLOYEE#${sanitizedEmail.toUpperCase()}`,
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
        const registration_id = generateRegistrationId(sanitizedEmployeeName, course_id);

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
                            employee_name: sanitizedEmployeeName,
                            email: sanitizedEmail,
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
                            PK: `EMPLOYEE#${sanitizedEmail.toUpperCase()}`,
                            SK: `COURSE#${course_id}`,
                            registration_id,
                            employee_name: sanitizedEmployeeName,
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
        handleControllerError(error, res, "registering for course");
    }
};

/**
 * Cancel a course registration
 * @route DELETE /cancel/:registration_id
 * @param {Request} req - Express request with registration_id in params
 * @param {Response} res - Express response
 * @returns {Promise<void>}
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

        // Validate registration ID format
        if (!isValidRegistrationIdFormat(registration_id)) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: `Invalid registration ID format. Expected format: EMPLOYEENAME-OFFERING-COURSENAME-INSTRUCTORNAME. Provided: ${registration_id}`
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
        handleControllerError(error, res, "canceling registration");
    }
};

/**
 * Get all registered employees for a course
 * @route GET /registrations/:course_id
 * @param {Request} req - Express request with course_id in params
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 */
export const getCourseRegistrations = async (req: Request, res: Response): Promise<void> => {
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

        // Validate course ID format
        if (!isValidCourseIdFormat(course_id)) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: `Invalid course ID format. Expected format: OFFERING-COURSENAME-INSTRUCTORNAME. Provided: ${course_id}`
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

        // Query all registrations for this course
        const registrationsResult = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `COURSE#${course_id}`,
                ":sk": "REG#"
            }
        }));

        const registrations = registrationsResult.Items || [];

        // Handle course canceled case
        if (course.course_status === RegistrationStatus.COURSE_CANCELED) {
            res.status(200).json({
                status: 200,
                message: "Course is canceled",
                data: {
                    success: {
                        course_id,
                        course_status: RegistrationStatus.COURSE_CANCELED,
                        is_allotted: course.is_allotted || false,
                        registrations: registrations.map(reg => ({
                            registration_id: reg.registration_id,
                            employee_name: reg.employee_name,
                            email: reg.email,
                            status: reg.status,
                            created_at: reg.created_at
                        }))
                    }
                }
            });
            return;
        }

        // Handle no registrations case
        if (registrations.length === 0) {
            res.status(200).json({
                status: 200,
                message: "No registrations found for this course",
                data: {
                    success: {
                        course_id,
                        course_status: course.course_status,
                        is_allotted: course.is_allotted || false,
                        registrations: []
                    }
                }
            });
            return;
        }

        // Handle course allotted case
        if (course.is_allotted) {
            res.status(200).json({
                status: 200,
                message: "Course is allotted",
                data: {
                    success: {
                        course_id,
                        course_status: course.course_status,
                        is_allotted: true,
                        registrations: registrations.map(reg => ({
                            registration_id: reg.registration_id,
                            employee_name: reg.employee_name,
                            email: reg.email,
                            status: reg.status,
                            created_at: reg.created_at
                        }))
                    }
                }
            });
            return;
        }

        // Handle course not allotted case (default)
        res.status(200).json({
            status: 200,
            message: "Course is not allotted yet",
            data: {
                success: {
                    course_id,
                    course_status: course.course_status,
                    is_allotted: false,
                    registrations: registrations.map(reg => ({
                        registration_id: reg.registration_id,
                        employee_name: reg.employee_name,
                        email: reg.email,
                        status: reg.status,
                        created_at: reg.created_at
                    }))
                }
            }
        });
    } catch (error: unknown) {
        handleControllerError(error, res, "fetching course registrations");
    }
};
