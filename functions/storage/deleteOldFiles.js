import {onSchedule} from "firebase-functions/v2/scheduler";
import admin from "firebase-admin";
import {BUCKET} from "../_lib/init.js";

export const deleteOldFiles = onSchedule("every day 03:00", async () => {
  const [files] = await admin.storage().bucket(BUCKET).getFiles({
    prefix: "users/",
  });

  const now = Date.now();
  const expired = files.filter((f) => now - new Date(f.metadata.timeCreated).getTime() > 3 * 24 * 60 * 60 * 1000);

  for (const f of expired) {
    await f.delete();
    console.log(`Deleted old file: ${f.name}`);
  }
});
