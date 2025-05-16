// ⚠️ 환경 변수는 import 전에!
// process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
// process.env.GCLOUD_PROJECT = "heallo-stg"; // 또는 GOOGLE_CLOUD_PROJECT

import admin from "firebase-admin";
import {today} from "./_lib/init.js"; // ← init.js 안에 admin 초기화가 *있으므로* 다시 초기화하지 않음

// 이미 init.js 쪽에서 admin.initializeApp() 됐을 수 있으니 중복 방지
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "heallo-1e5e7", // ❶ 프로젝트 ID
    credential: admin.applicationDefault(), // ❷ 로컬-ADC or GCP-SA
  });
}

const db = admin.firestore();
const UID = "test-user-123";
// const today = new Date().toISOString().substring(0, 10); // "2025-05-15"

// 사용자 프로필
await db.doc(`users/${UID}`).set({
  nickname: "홍길동",
  fcmToken: "dummy-token-abc123",
});

// **오늘 날짜** 복약 스케줄 삽입
await db.doc(`users/${UID}/records/${today()}`).set({
  symptom: {
    pain_level: 5,
    emotion: "불안",
    memo: "복통과 어지럼증",
    createdAt: "2025-05-30T09:00:00Z",
  },
  medication: {
    drug: "타이레놀",
    dose: "500mg",
    times: ["09:00", "15:00", "21:00"],
  },
});

console.log("🔥 Seed 완료"); process.exit();
