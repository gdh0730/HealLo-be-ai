import {onSchedule} from "firebase-functions/v2/scheduler";
import admin from "firebase-admin";
// import { BUCKET, GEMINI_URL, today, weekId } from "../_lib/init.js";

export const medReminder = onSchedule("every 15 minutes", async () => {
  const HHMM = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const snaps = await admin.firestore().collectionGroup("records")
      .where("medication.times", "array-contains", HHMM).get();

  for (const doc of snaps.docs) {
    const uid = doc.ref.path.split("/")[1];
    const token = (await admin.firestore()
        .doc(`users/${uid}/profile`).get()).data().fcmToken;

    await admin.messaging().sendToDevice(token, {
      notification: {
        title: "HealLo",
        body: "약 복용 시간이에요 💊",
      },
    });
  }
});
