// ✅ 확장된 generate.js - 건강 점수화, 예측 요약 포함
import {onSchedule} from "firebase-functions/v2/scheduler";
import admin from "firebase-admin";
import axios from "axios";
import {GEMINI_URL, weekId} from "../_lib/init.js";

const GEM = GEMINI_URL;

export const weekly = onSchedule("every sunday 21:00", async () => {
  const users = await admin.firestore().collection("users").listDocuments();
  const week = weekId();

  for (const u of users) {
    const uid = u.id;
    const recs = await u.collection("records")
        .orderBy("date", "desc").limit(21).get();

    let pain = 0; let painCnt = 0;
    const temps = []; const bps = []; const sugars = [];
    const records3w = [];

    recs.forEach((r) => {
      const data = r.data();
      records3w.push(data);

      const p = data.symptom?.pain_level;
      if (typeof p === "number") {
        pain += p;
        painCnt++;
      }

      const v = data.vital || {};
      if (typeof v.temperature === "number") temps.push(v.temperature);
      if (v.blood_pressure) bps.push(v.blood_pressure);
      if (v.blood_sugar) sugars.push(v.blood_sugar);
    });

    const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "0.0";
    const painAvg = (pain / (painCnt || 1)).toFixed(1);
    const tempAvg = avg(temps);
    const bpAvg = avg(bps);
    const sugarAvg = avg(sugars);

    // ✔ 요약 + 건강 점수 요청
    const prompt1 = `지난 7일간 건강 기록 요약:
- 평균 통증: ${painAvg}
- 평균 체온: ${tempAvg}°C
- 평균 혈압: ${bpAvg} mmHg
- 평균 혈당: ${sugarAvg} mg/dL

요약하고 마지막에 다음 문장 포함:
총평: 이번 주 건강 점수는 (숫자)/100입니다.`;

    // ✔ 예측 요약 요청
    const prompt2 = `최근 3주간 건강 기록: ${JSON.stringify(records3w.slice(0, 21))}

다음 주에 예상되는 건강 상태를 요약해줘.`;

    let summary = "요약 생성 실패";
    let score = null;
    let prediction = "예측 생성 실패";

    try {
      const {data} = await axios.post(GEM, {
        contents: [{parts: [{text: prompt1}]}],
      });
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? summary;
      summary = text;
      const match = text.match(/건강 점수는 (\d+)/);
      score = match ? parseInt(match[1]) : null;
    } catch (e) {
      console.error("Gemini 요약 오류:", e.message);
    }

    try {
      const {data} = await axios.post(GEM, {
        contents: [{parts: [{text: prompt2}]}],
      });
      prediction = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? prediction;
    } catch (e) {
      console.error("Gemini 예측 오류:", e.message);
    }

    await u.collection("reports").doc(week).set({
      painAvg,
      tempAvg,
      bpAvg,
      sugarAvg,
      score,
      summary,
      prediction,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

// ✅ 기록 습관 분석 + 칭찬 메시지 전송 (보조 함수)
export const habitAndPraise = onSchedule("every monday 08:00", async () => {
  const users = await admin.firestore().collection("users").listDocuments();
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400000);
  const formatDate = (d) => d.toISOString().substring(0, 10);
  const today = formatDate(now);

  for (const u of users) {
    const uid = u.id;
    const recs = await u.collection("records")
        .where("date", ">=", formatDate(thirtyAgo)).get();

    const days = new Set();
    recs.forEach((r) => days.add(r.id));
    const recordCount = days.size;

    // ✔ 기록 점수 (30일 중 20일 이상이면 80점 이상)
    const habitScore = Math.min(100, Math.round((recordCount / 30) * 100));
    const praise = habitScore >= 70 ? "🎉 멋져요! 꾸준히 건강을 챙기고 계시네요." : null;

    await u.collection("reports").doc(`habit-${today}`).set({
      habitScore,
      recordDays: recordCount,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (praise) {
      const token = (await admin.firestore().doc(`users/${uid}/profile`).get()).data()?.fcmToken;
      if (token) {
        await admin.messaging().sendToDevice(token, {
          notification: {
            title: "HealLo 건강 습관 리포트",
            body: praise,
          },
        });
      }
    }
  }
});
