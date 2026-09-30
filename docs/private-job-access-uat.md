# Private job company access UAT — 30 September 2026

Status: isolated fixture prepared and database isolation verified. Live signed-in access checks pending.

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
