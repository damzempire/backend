# Monthly Claims Report Specification

## Overview
This feature implements a monthly PDF report that summarizes token claims by employees. The report is automatically generated and emailed to the DAO Admin on the 1st of every month.

## Requirements
1.  **PDF Generation**: Use `pdfkit` to generate a PDF document.
2.  **Scheduling**: Use `node-cron` to schedule the task for the 1st of every month.
3.  **Email Delivery**: Use `nodemailer` to send the PDF as an email attachment.
4.  **Content**: The report must show the total tokens claimed by employees in the previous month.

## Architecture
### New Components
1.  **`src/services/reportService.js`**: Responsible for querying claim data and generating the PDF.
2.  **`src/jobs/monthlyReportJob.js`**: Responsible for scheduling the monthly execution and triggering the email service.
3.  **Email Configuration**: Add environment variables for email service credentials.

### Data Flow
1.  Cron job triggers on the 1st of the month.
2.  `reportService` queries `ClaimsHistory` for claims in the previous month.
3.  `reportService` aggregates the data (total claimed per user/token).
4.  `reportService` generates a PDF stream/buffer.
5.  `nodemailer` sends an email with the PDF attached to the DAO Admin.

## Database
-   **Table**: `claims_history`
-   **Query**: Select claims where `claim_timestamp` is within the previous month range.

## Configuration
New environment variables:
-   `EMAIL_SERVICE`: The email service provider (e.g., 'gmail').
-   `EMAIL_USER`: The email address used to send the report.
-   `EMAIL_PASS`: The password or app password for the email account.
-   `DAO_ADMIN_EMAIL`: The recipient email address for the report.
