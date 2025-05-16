import {onRequest} from "firebase-functions/v2/https";
import admin from "firebase-admin";
import axios from "axios";
import {GEMINI_URL, today} from "../_lib/init.js";

const GEM = GEMINI_URL;

export const chatBot = onRequest(async (req, res) => {
  try {
    if (!GEMINI_URL) throw new Error("GEMINI_URL not set");

    const {uid, question} = req.body;
    let intent = "qa";
    let context = "";

    if (/약|복약/.test(question)) {
      intent = "med";
    } else if (/혈압/.test(question)) {
      intent = "bp";
    } else if (/혈당/.test(question)) {
      intent = "sugar";
    } else if (/체온|열/.test(question)) {
      intent = "temp";
    }

    if (intent !== "qa") {
      const recordSnap = await admin.firestore().doc(`users/${uid}/records/${today()}`).get();
      const data = recordSnap.data() || {};

      if (!data) {
        return res.status(404).json({error: "기록 없음"});
      }

      switch (intent) {
        case "med": {
          const med = data.medication ?? {};
          context = `약 이름: ${med.drug ?? "기록 없음"}\n용량: ${med.dose ?? "기록 없음"}\n복용 시간: ${(med.times || []).join(", ") || "기록 없음"}`;
          break;
        }
        case "bp":
          context = `혈압: ${data?.vital?.blood_pressure ?? "기록 없음"}`;
          break;
        case "sugar":
          context = `혈당: ${data?.vital?.blood_sugar ?? "기록 없음"}`;
          break;
        case "temp":
          context = `체온: ${data?.vital?.temperature ?? "기록 없음"}`;
          break;
      }
    }
    const prompt = `${context}\n\nQ: ${question}\nA를 친절한 한국어 3줄로, 의학책임면책 포함:`;
    const {data} = await axios.post(GEM, {
      contents: [{parts: [{text: prompt}]}],
    });
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "응답 생성 실패";
    res.json({answer});
  } catch (err) {
    console.error("Gemini error ►", err.response?.status, err.response?.data || err.message);
    res.status(502).json({error: "Gemini API 호출 실패", detail: err.message});
  }
});
