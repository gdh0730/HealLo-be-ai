import {onRequest} from "firebase-functions/v2/https";
import admin from "firebase-admin";
import PDFDocument from "pdfkit";
import {today, weekId, BUCKET} from "../_lib/init.js";
import stream from "stream";

export const generatePdfReport = onRequest(async (req, res) => {
  try {
    const {uid} = req.body;
    const week = weekId();
    const docRef = admin.firestore().doc(`users/${uid}/reports/${week}`);
    const reportSnap = await docRef.get();

    if (!reportSnap.exists) {
      return res.status(404).json({error: "레포트가 존재하지 않습니다."});
    }

    const report = reportSnap.data();

    // PDF 생성
    const pdf = new PDFDocument();
    const bufferStream = new stream.PassThrough();
    const chunks = [];
    bufferStream.on("data", (chunk) => chunks.push(chunk));
    pdf.pipe(bufferStream);

    // 내용 작성
    pdf.fontSize(20).text("HealLo 주간 건강 리포트", {align: "center"});
    pdf.moveDown();
    pdf.fontSize(14).text(`기간: ${week}`, {align: "left"});
    pdf.text(`생성일: ${today()}`);
    pdf.moveDown();

    pdf.text(`✅ 평균 통증 수치: ${report.painAvg ?? "N/A"}`);
    pdf.text(`✅ 평균 체온: ${report.tempAvg ?? "N/A"} °C`);
    pdf.text(`✅ 평균 혈압: ${report.bpAvg ?? "N/A"} mmHg`);
    pdf.text(`✅ 평균 혈당: ${report.sugarAvg ?? "N/A"} mg/dL`);
    pdf.moveDown();

    pdf.text("📋 Gemini 요약:", {underline: true});
    pdf.text(report.summary ?? "요약 없음");
    pdf.end();

    // PDF 업로드
    const buffer = await new Promise((resolve) =>
      bufferStream.on("end", () => resolve(Buffer.concat(chunks))),
    );

    const filePath = `users/${uid}/pdfs/${week}.pdf`;
    const file = admin.storage().bucket(BUCKET).file(filePath);
    await file.save(buffer, {
      metadata: {contentType: "application/pdf"},
    });

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 5, // 5분 유효
    });

    return res.json({message: "PDF 생성 완료", url});
  } catch (err) {
    console.error("PDF 생성 오류:", err);
    res.status(500).json({error: "PDF 생성 실패", detail: err.message});
  }
});
