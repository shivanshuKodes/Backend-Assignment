import { Request, Response } from 'express';
import { PutCommand, GetCommand, QueryCommand, UpdateCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import ddbDocClient from "../config/dynamoDB";
import { generateCourseId, sortByRegistrationId } from "../utils/helpers";
import { RegistrationStatus, CourseStatus, EntityType } from "../constants/constants";
import { isValidDateFormat, sanitizeInput, isEmptyAfterTrim, isValidCourseIdFormat } from "../utils/validators";
import { handleControllerError } from "../constants/errorMessages";

const TABLE_NAME = process.env.TABLE_NAME || "CourseManagementTable";

/**
 * Add a new course offering
 * @route POST /add/courseOffering
 * @param {Request} req - Express request with course details in body
 * @param {Response} res - Express response
 * @returns {Promise<void>}
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

        // Sanitize string inputs
        const sanitizedCourseName = sanitizeInput(course_name);
        const sanitizedInstructorName = sanitizeInput(instructor_name);
        const sanitizedStartDate = sanitizeInput(start_date);

        // Check for empty strings after trimming
        if (isEmptyAfterTrim(course_name) || isEmptyAfterTrim(instructor_name) || isEmptyAfterTrim(start_date)) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: "course_name, instructor_name, and start_date cannot be empty or contain only whitespace"
                    }
                }
            });
            return;
        }

        // Validate that min_employees and max_employees are not negative
        if (min_employees < 0 || max_employees < 0) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: "min_employees and max_employees cannot be negative"
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

        // Validate date format
        if (!isValidDateFormat(sanitizedStartDate)) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: `Invalid date format. Expected DDMMYYYY with valid calendar date. Provided: ${sanitizedStartDate}`
                    }
                }
            });
            return;
        }

        // Validate start_date is not in the past
        const day = parseInt(sanitizedStartDate.substring(0, 2));
        const month = parseInt(sanitizedStartDate.substring(2, 4)) - 1; // Month is 0-indexed in JS Date
        const year = parseInt(sanitizedStartDate.substring(4, 8));

        const courseStartDate = new Date(year, month, day);
        const currentDate = new Date();

        // Set time to midnight for date only comparison
        courseStartDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);

        if (courseStartDate < currentDate) {
            res.status(400).json({
                status: 400,
                message: "INPUT_DATA_ERROR",
                data: {
                    failure: {
                        Message: `Cannot add course with past start date. Provided date: ${sanitizedStartDate}`
                    }
                }
            });
            return;
        }

        // Generate course ID using sanitized inputs
        const course_id = generateCourseId(sanitizedCourseName, sanitizedInstructorName);

        // Check if course already exists
        const existingCourse = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `COURSE#${course_id}`,
                SK: "METADATA"
            }
        }));

        if (existingCourse.Item) {
            res.status(400).json({
                status: 400,
                message: "DUPLICATE_COURSE_ERROR",
                data: {
                    failure: {
                        Message: `Course with the same name and instructor already exists. Course ID: ${course_id}`
                    }
                }
            });
            return;
        }

        // Save course to DynamoDB
        await ddbDocClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `COURSE#${course_id}`,
                SK: "METADATA",
                course_id,
                course_name: sanitizedCourseName,
                instructor_name: sanitizedInstructorName,
                start_date: sanitizedStartDate,
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
        handleControllerError(error, res, "adding course");
    }
};

/**
 * Allot course to registered employees
 * @route PUT /allot/:course_id
 * @param {Request} req - Express request with course_id in params
 * @param {Response} res - Express response
 * @returns {Promise<void>}
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

        // Check if course start date has passed
        // Assuming start_date format is DDMMYYYY ("15062022")
        const startDateStr = course.start_date;
        if (startDateStr && startDateStr.length === 8) {
            const day = parseInt(startDateStr.substring(0, 2));
            const month = parseInt(startDateStr.substring(2, 4)) - 1; // Month is 0-indexed in JS Date
            const year = parseInt(startDateStr.substring(4, 8));

            const courseStartDate = new Date(year, month, day);
            const currentDate = new Date();

            // Set time to midnight for date only comparison
            courseStartDate.setHours(0, 0, 0, 0);
            currentDate.setHours(0, 0, 0, 0);

            if (currentDate > courseStartDate) {
                res.status(400).json({
                    status: 400,
                    message: "COURSE_ALLOT_DATE_ERROR",
                    data: {
                        failure: {
                            Message: `Cannot allot course after start date. Course started on ${startDateStr}`
                        }
                    }
                });
                return;
            }
        }

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
        handleControllerError(error, res, "allotting course");
    }
};
