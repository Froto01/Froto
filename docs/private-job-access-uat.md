# Private job company access UAT — 30 September 2026

Status: unrelated-company browser denial PASS from user screenshot; authorised-company control check pending.

Preview: https://froto-cpyhrpywz-david-froto-project.vercel.app/platform/jobs/uat-private-job-20260930
Git branch: billing-uat, commit bef1f9f04010101781af2c1b901675a439b46d35.
Neon branch: br-fancy-heart-axjf1fzn.

The simulated job is between Froto test company (buyer) and Tree of Life (provider). Hardlywork is unrelated. Job amount is $432.10. The AWARDED event contains the private sentinel PRIVATE-JOB-EVENT-NOT-FOR-HARDLYWORK.

1. While signed in as Hardlywork, open the job link. Expected: “This job does not belong to your company.” Job price, parties, event note and actions must not be shown. Capture the screen.
2. While signed in as Froto test company, open the same link. Expected: the simulated AWARDED job loads with the $432.10 agreed amount. This control distinguishes tenant rejection from a missing/broken job.
3. If a Tree of Life test login is available, it should also load the job as provider.

No lifecycle action is required for these read-only checks. Leave the simulated job AWARDED.

Database verification after fixture creation found one job, one AWARDED event and zero fee snapshots on the isolated branch. The original branch br-sparkling-flower-ax1kb2y2 contained zero matching jobs and requirements. Direct fixture creation did not generate notifications and does not test the award flow.

Automated handler permission tests already pass; real-session browser evidence remains pending. Concurrent award HTTP requests remain a separate open check.

## Browser evidence — 1 October 2026, 07:17 Brisbane

User attachment image(20260930-211729).png shows a signed-in header (Sign out button) and the expected red message “This job does not belong to your company.” No job price, party names, private event or lifecycle actions are visible. This passes the unrelated-company browser denial check in the instructed Hardlywork test context. The screenshot itself does not display the company name or URL. A follow-up request-log retrieval timed out, so no independent HTTP 403 evidence is claimed for this attempt.

The earlier attempt at 07:10 Brisbane returned API 401 before sign-in; it was not a tenant-access result. Froto test company's positive access control remains pending. Do not mark dashboard-wide tenant isolation complete from this one job-page check.
