/**
 * Centralized error messages and response builders
 * This file contains all error messages used across the application
 * to maintain consistency and follow DRY principles
 */

// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
} as const;

// Error Message Types
export const ERROR_TYPES = {
    INPUT_DATA_ERROR: "INPUT_DATA_ERROR",
    DUPLICATE_COURSE_ERROR: "DUPLICATE_COURSE_ERROR",
    COURSE_FULL_ERROR: "COURSE_FULL_ERROR",
    COURSE_ALLOT_DATE_ERROR: "COURSE_ALLOT_DATE_ERROR"
} as const;

// Success/Info Message Types
export const MESSAGE_TYPES = {
    COURSE_NOT_FOUND: "Course not found",
    REGISTRATION_NOT_FOUND: "Registration not found",
    ALREADY_REGISTERED: "Already registered",
    COURSE_CANCELED: "Course canceled",
    COURSE_ALREADY_ALLOTTED: "Course already allotted",
    CANCEL_REGISTRATION_UNSUCCESSFUL: "Cancel registration unsuccessful",
    CANCEL_REGISTRATION_SUCCESSFUL: "Cancel registration successful"
} as const;

// Error Messages
export const ERROR_MESSAGES = {
    // Required fields
    REQUIRED_FIELDS_COURSE: "course_name, instructor_name, start_date, min_employees, max_employees cannot be empty",
    REQUIRED_FIELDS_REGISTRATION: "employee_name, email and course_id cannot be empty",
    REQUIRED_FIELD_COURSE_ID: "course_id cannot be empty",
    REQUIRED_FIELD_REGISTRATION_ID: "registration_id cannot be empty",

    // Empty/whitespace validation
    EMPTY_COURSE_FIELDS: "course_name, instructor_name, and start_date cannot be empty or contain only whitespace",
    EMPTY_REGISTRATION_FIELDS: "employee_name and email cannot be empty or contain only whitespace",

    // Format validation
    INVALID_EMAIL_FORMAT: (email: string) => `Invalid email format. Provided: ${email}`,
    INVALID_DATE_FORMAT: (date: string) => `Invalid date format. Expected DDMMYYYY with valid calendar date. Provided: ${date}`,
    INVALID_COURSE_ID_FORMAT: (courseId: string) => `Invalid course ID format. Expected format: OFFERING-COURSENAME-INSTRUCTORNAME. Provided: ${courseId}`,
    INVALID_REGISTRATION_ID_FORMAT: (regId: string) => `Invalid registration ID format. Expected format: EMPLOYEENAME-OFFERING-COURSENAME-INSTRUCTORNAME. Provided: ${regId}`,

    // Numeric validation
    NEGATIVE_EMPLOYEES: "min_employees and max_employees cannot be negative",
    MIN_GREATER_THAN_MAX: "min_employees cannot be greater than max_employees",

    // Date validation
    PAST_START_DATE: (date: string) => `Cannot add course with past start date. Provided date: ${date}`,
    ALLOT_AFTER_START_DATE: (date: string) => `Cannot allot course after start date. Course started on ${date}`,

    // Duplicate/existence checks
    DUPLICATE_COURSE: (courseId: string) => `Course with the same name and instructor already exists. Course ID: ${courseId}`,
    COURSE_NOT_FOUND: (courseId: string) => `Course ${courseId} does not exist`,
    REGISTRATION_NOT_FOUND: (regId: string) => `Registration ${regId} does not exist`,
    EMPLOYEE_ALREADY_REGISTERED: "Employee already registered for this course",

    // Business logic
    COURSE_FULL: "cannot register for course, course is full",
    COURSE_CANCELED_NO_REGISTER: "Cannot register for a canceled course",
    COURSE_ALLOTTED_NO_REGISTER: "Cannot register for a course that has already been allotted",
    COURSE_ALREADY_ALLOTTED: "This course has already been allotted",

    // Generic
    ERROR_ADDING_COURSE: "Error adding course",
    ERROR_ALLOTTING_COURSE: "Error allotting course",
    ERROR_REGISTERING: "Error registering for course",
    ERROR_CANCELING: "Error canceling registration"
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
    COURSE_ADDED: "course added successfully",
    COURSE_ALLOTTED: "successfully allotted course to registered employees",
    COURSE_CANCELED_MIN_NOT_MET: "Course canceled - minimum registrations not met",
    REGISTERED: (courseId: string) => `successfully registered for ${courseId}`,
    CANCEL_ACCEPTED: "Cancel registration successful",
    CANCEL_REJECTED: "Cancel registration unsuccessful"
} as const;

/**
 * Response builder for error responses
 * @param {number} status - HTTP status code
 * @param {string} message - Error message type
 * @param {string} errorMessage - Detailed error message
 * @returns {object} Standardized error response object
 */
export const buildErrorResponse = (
    status: number,
    message: string,
    errorMessage: string
) => ({
    status,
    message,
    data: {
        failure: {
            Message: errorMessage
        }
    }
});

/**
 * Response builder for success responses
 * @param {number} status - HTTP status code
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @returns {object} Standardized success response object
 */
export const buildSuccessResponse = (
    status: number,
    message: string,
    data: any
) => ({
    status,
    message,
    data: {
        success: data
    }
});

/**
 * Generic error handler for controller catch blocks
 * @param {unknown} error - The caught error
 * @param {any} res - Express response object
 * @param {string} context - Context string for logging (e.g., "adding course")
 * @returns {void}
 * @example
 * handleControllerError(error, res, "adding course")
 */
export const handleControllerError = (
    error: unknown,
    res: any,
    context: string
): void => {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Error ${context}:`, message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        buildErrorResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, `Error ${context}`, message)
    );
};
