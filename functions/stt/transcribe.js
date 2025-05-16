import {onObjectFinalized} from "firebase-functions/v2/storage";
import {IS_EMULATOR, BUCKET, GEMINI_URL, today} from "../_lib/init.js";
// import {SpeechClient} from "@google-cloud/speech";
import admin from "firebase-admin";
import axios from "axios";

// const speech = new SpeechClient();
let SpeechClient;
const GEM = GEMINI_URL;

// 트리거 등록
export const transcribeAudio = IS_EMULATOR ?
  onObjectFinalized(handler) :
  onObjectFinalized({bucket: BUCKET, region: "asia-northeast3"}, handler);

// 실제 핸들러 함수
async function handler({bucket, name}) {
  if (!name.startsWith("users/")) return;
  const [, uid] = name.split("/");

  if (!SpeechClient) {
    ({SpeechClient} = await import("@google-cloud/speech"));
  }
  const speech = new SpeechClient();

  const [job] = await speech.longRunningRecognize({
    audio: {uri: `gs://${bucket}/${name}`},
    config: {languageCode: "ko-KR"},
  });
  const [resp] = await job.promise();
  const raw = resp.results.map((r) => r.alternatives[0].transcript).join(" ");

  // Gemini 요약
  const {data} = await axios.post(GEM, {
    contents: [{parts: [{text: `아래 텍스트를 3줄 요약:\n${raw}`}]}],
  });
  const summary =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "요약 실패";

  await admin.firestore()
      .doc(`users/${uid}/records/${today()}`)
      .set(
          {
            symptom: {
              memo: summary,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          },
          {merge: true},
      );
}
