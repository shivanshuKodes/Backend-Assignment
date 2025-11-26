/**
 * Registration status constants
 */
export const RegistrationStatus = {
    ACCEPTED: "ACCEPTED",
    CONFIRMED: "CONFIRMED",
    COURSE_CANCELED: "COURSE_CANCELED",
    COURSE_FULL_ERROR: "COURSE_FULL_ERROR"
} as const;

export type RegistrationStatusType = typeof RegistrationStatus[keyof typeof RegistrationStatus];

/**
 * Cancellation status constants
 */
export const CancellationStatus = {
    CANCEL_ACCEPTED: "CANCEL_ACCEPTED",
    CANCEL_REJECTED: "CANCEL_REJECTED"
} as const;

export type CancellationStatusType = typeof CancellationStatus[keyof typeof CancellationStatus];

/**
 * Course status constants
 */
export const CourseStatus = {
    ACTIVE: "ACTIVE",
    CONFIRMED: "CONFIRMED",
    CANCELED: "CANCELED"
} as const;

export type CourseStatusType = typeof CourseStatus[keyof typeof CourseStatus];

/**
 * Entity type constants for DynamoDB items
 */
export const EntityType = {
    COURSE: "COURSE",
    REGISTRATION: "REGISTRATION",
    EMPLOYEE_COURSE: "EMPLOYEE_COURSE"
} as const;

export type EntityTypeType = typeof EntityType[keyof typeof EntityType];
