# Tasks

1.  [x] Install dependencies: `pdfkit`, `nodemailer`, `node-cron`.
2.  [x] Create `src/services/reportService.js` with methods to:
    -   Fetch monthly claim data from `ClaimsHistory`.
    -   Generate a PDF summary using `pdfkit`.
3.  [x] Create `src/jobs/monthlyReportJob.js` to:
    -   Schedule the task using `node-cron`.
    -   Configure `nodemailer` transporter.
    -   Send the email with the generated PDF.
4.  [x] Update `src/index.js` to initialize the cron job on server start.
5.  [x] Update `.env.example` with new email configuration variables.
6.  [x] Add unit tests for `reportService`.
