import {setGlobalOptions} from "firebase-functions/v2";
// import {config as fnConfig} from "firebase-functions";
import admin from "firebase-admin";

const PROJECT_ID = process.env.GCLOUD_PROJECT; // stg 또는 prod
const DEFAULT_BUCKET = `${PROJECT_ID}.firebasestorage.app`; // 공식 버킷

export const IS_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true"; // 자동 주입
// **에뮬레이터일 땐 bucket() 호출 X => trigger가 모든 버킷 이벤트 수신**

// ★ admin SDK에 기본 버킷 알려주기
if (!admin.apps.length) {
  admin.initializeApp({storageBucket: DEFAULT_BUCKET});
}

/* ✔ 한 줄로 전역 옵션 설정 */
setGlobalOptions({
  region: "asia-northeast3",
  secrets: ["GEMINI_URL"], // ← **핵심**
});
/*
export const GEMINI_URL =
  process.env.GEMINI_URL || // Firebase CLI가 주입
  process.env.GEMINI_URL || // 개발 PC에서 직접 export
  ""; // 없으면 빈 문자열 (배포-거부 대신 런타임 체크)
*/
export const GEMINI_URL = process.env.GEMINI_URL ?? ""; // 중복 제거
console.log("GEMINI_URL =", GEMINI_URL);

export const today = () =>
  new Date().toISOString().substring(0, 10);

export const weekId = () => {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
};
/* 버킷 상수도 필요하면 공개 */
export const BUCKET = DEFAULT_BUCKET; // 자동으로 prod·stg 모두 대응
