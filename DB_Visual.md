# Grouped by Partition Key
This shows how DynamoDB physically groups data:

**Group 1: JAVA Course Data:**
PK: COURSE#OFFERING-JAVA-JAMES
├── SK: METADATA                          → Course details
├── SK: REG#ANDY-OFFERING-JAVA-JAMES      → Andy's registration
└── SK: REG#JHON-OFFERING-JAVA-JAMES      → Jhon's registration

**Group 2: ANDY's Registrations:**
PK: EMPLOYEE#ANDY@GMAIL.COM
├── SK: COURSE#OFFERING-JAVA-JAMES        → Registered for JAVA
└── SK: COURSE#OFFERING-KUBERNETES-WOODY  → Registered for KUBERNETES

**Group 3: JHON's Registrations:**
PK: EMPLOYEE#JHON@GMAIL.COM
└── SK: COURSE#OFFERING-JAVA-JAMES        → Registered for JAVA

**Group 4: KUBERNETES Course Data:**
PK: COURSE#OFFERING-KUBERNETES-WOODY
├── SK: METADATA                              → Course details
└── SK: REG#ANDY-OFFERING-KUBERNETES-WOODY    → Andy's registration


**Pattern 1: Get Course Details**
`Query: PK = "COURSE#OFFERING-JAVA-JAMES" AND SK = "METADATA"`

Returns:
┌────────────────────────────────┬──────────┬─────────────────────┐
│ PK                             │ SK       │ Attributes          │
├────────────────────────────────┼──────────┼─────────────────────┤
│ COURSE#OFFERING-JAVA-JAMES     │ METADATA │ course_name: JAVA   │
│                                │          │ instructor: JAMES   │
│                                │          │ min_employees: 1    │
│                                │          │ max_employees: 2    │
└────────────────────────────────┴──────────┴─────────────────────┘

**Pattern 2: Get All Registrations for a Course:**
`Query: PK = "COURSE#OFFERING-JAVA-JAMES" AND SK begins_with "REG#`

Returns:
┌────────────────────────────────┬──────────────────────────────┬──────────────────┐
│ PK                             │ SK                           │ Attributes       │
├────────────────────────────────┼──────────────────────────────┼──────────────────┤
│ COURSE#OFFERING-JAVA-JAMES     │ REG#ANDY-OFFERING-JAVA-JAMES │ employee: ANDY   │
│                                │                              │ email: ANDY@...  │
├────────────────────────────────┼──────────────────────────────┼──────────────────┤
│ COURSE#OFFERING-JAVA-JAMES     │ REG#JHON-OFFERING-JAVA-JAMES │ employee: JHON   │
│                                │                              │ email: JHON@...  │
└────────────────────────────────┴──────────────────────────────┴──────────────────┘

**Pattern 3: Check if Employee Already Registered:**
`Query: PK = "EMPLOYEE#ANDY@GMAIL.COM" AND SK = "COURSE#OFFERING-JAVA-JAMES"`

Returns:
┌─────────────────────────────┬────────────────────────────────┬─────────────────────────────┐
│ PK                          │ SK                             │ Attributes                  │
├─────────────────────────────┼────────────────────────────────┼─────────────────────────────┤
│ EMPLOYEE#ANDY@GMAIL.COM     │ COURSE#OFFERING-JAVA-JAMES     │ registration_id: ANDY-...   │
│                             │                                │ status: ACCEPTED            │
└─────────────────────────────┴────────────────────────────────┴─────────────────────────────┘

**Pattern 4: Get All Courses an Employee Registered For**
`Query: PK = "EMPLOYEE#ANDY@GMAIL.COM" AND SK begins_with "COURSE#"`

Returns:
┌─────────────────────────────┬────────────────────────────────────┬─────────────────────────────┐
│ PK                          │ SK                                 │ Attributes                  │
├─────────────────────────────┼────────────────────────────────────┼─────────────────────────────┤
│ EMPLOYEE#ANDY@GMAIL.COM     │ COURSE#OFFERING-JAVA-JAMES         │ course_id: OFFERING-JAVA... │
├─────────────────────────────┼────────────────────────────────────┼─────────────────────────────┤
│ EMPLOYEE#ANDY@GMAIL.COM     │ COURSE#OFFERING-KUBERNETES-WOODY   │ course_id: OFFERING-KUBE... │
└─────────────────────────────┴────────────────────────────────────┴─────────────────────────────┘


Complete Table:

┌────────────────────────────────────┬──────────────────────────────────────┬─────────────────────────────────────────────────┐
│ PK (Partition Key)                 │ SK (Sort Key)                        │ Other Attributes                                │
├────────────────────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ COURSE#OFFERING-JAVA-JAMES         │ METADATA                             │ course_id: "OFFERING-JAVA-JAMES"                │
│                                    │                                      │ course_name: "JAVA"                             │
│                                    │                                      │ instructor_name: "JAMES"                        │
│                                    │                                      │ start_date: "15062022"                          │
│                                    │                                      │ min_employees: 1                                │
│                                    │                                      │ max_employees: 2                                │
│                                    │                                      │ current_count: 2                                │
│                                    │                                      │ is_allotted: false                              │
│                                    │                                      │ entity_type: "COURSE"                           │
├────────────────────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ COURSE#OFFERING-JAVA-JAMES         │ REG#ANDY-OFFERING-JAVA-JAMES         │ registration_id: "ANDY-OFFERING-JAVA-JAMES"     │
│                                    │                                      │ employee_name: "ANDY"                           │
│                                    │                                      │ email: "ANDY@GMAIL.COM"                         │
│                                    │                                      │ course_id: "OFFERING-JAVA-JAMES"                │
│                                    │                                      │ status: "ACCEPTED"                              │
│                                    │                                      │ created_at: "2024-11-25T08:00:00Z"              │
│                                    │                                      │ entity_type: "REGISTRATION"                     │
├────────────────────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ COURSE#OFFERING-JAVA-JAMES         │ REG#JHON-OFFERING-JAVA-JAMES         │ registration_id: "JHON-OFFERING-JAVA-JAMES"     │
│                                    │                                      │ employee_name: "JHON"                           │
│                                    │                                      │ email: "JHON@GMAIL.COM"                         │
│                                    │                                      │ course_id: "OFFERING-JAVA-JAMES"                │
│                                    │                                      │ status: "ACCEPTED"                              │
│                                    │                                      │ created_at: "2024-11-25T08:05:00Z"              │
│                                    │                                      │ entity_type: "REGISTRATION"                     │
├────────────────────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ EMPLOYEE#ANDY@GMAIL.COM            │ COURSE#OFFERING-JAVA-JAMES           │ registration_id: "ANDY-OFFERING-JAVA-JAMES"     │
│                                    │                                      │ employee_name: "ANDY"                           │
│                                    │                                      │ course_id: "OFFERING-JAVA-JAMES"                │
│                                    │                                      │ status: "ACCEPTED"                              │
│                                    │                                      │ entity_type: "EMPLOYEE_COURSE"                  │
├────────────────────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ EMPLOYEE#JHON@GMAIL.COM            │ COURSE#OFFERING-JAVA-JAMES           │ registration_id: "JHON-OFFERING-JAVA-JAMES"     │
│                                    │                                      │ employee_name: "JHON"                           │
│                                    │                                      │ course_id: "OFFERING-JAVA-JAMES"                │
│                                    │                                      │ status: "ACCEPTED"                              │
│                                    │                                      │ entity_type: "EMPLOYEE_COURSE"                  │
├────────────────────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ COURSE#OFFERING-KUBERNETES-WOODY   │ METADATA                             │ course_id: "OFFERING-KUBERNETES-WOODY"          │
│                                    │                                      │ course_name: "KUBERNETES"                       │
│                                    │                                      │ instructor_name: "WOODY"                        │
│                                    │                                      │ start_date: "16062022"                          │
│                                    │                                      │ min_employees: 2                                │
│                                    │                                      │ max_employees: 6                                │
│                                    │                                      │ current_count: 1                                │
│                                    │                                      │ is_allotted: false                              │
│                                    │                                      │ entity_type: "COURSE"                           │
├────────────────────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ COURSE#OFFERING-KUBERNETES-WOODY   │ REG#ANDY-OFFERING-KUBERNETES-WOODY   │ registration_id: "ANDY-OFFERING-KUBERNETES-WOODY"│
│                                    │                                      │ employee_name: "ANDY"                           │
│                                    │                                      │ email: "ANDY@GMAIL.COM"                         │
│                                    │                                      │ course_id: "OFFERING-KUBERNETES-WOODY"          │
│                                    │                                      │ status: "ACCEPTED"                              │
│                                    │                                      │ created_at: "2024-11-25T08:10:00Z"              │
│                                    │                                      │ entity_type: "REGISTRATION"                     │
├────────────────────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ EMPLOYEE#ANDY@GMAIL.COM            │ COURSE#OFFERING-KUBERNETES-WOODY     │ registration_id: "ANDY-OFFERING-KUBERNETES-WOODY"│
│                                    │                                      │ employee_name: "ANDY"                           │
│                                    │                                      │ course_id: "OFFERING-KUBERNETES-WOODY"          │
│                                    │                                      │ status: "ACCEPTED"                              │
│                                    │                                      │ entity_type: "EMPLOYEE_COURSE"                  │
└────────────────────────────────────┴──────────────────────────────────────┴─────────────────────────────────────────────────┘