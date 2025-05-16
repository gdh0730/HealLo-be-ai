/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const {onRequest} = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");
// import {onRequest} from "firebase-functions/v2/https";
// import logger from "firebase-functions/logger";

export * from "./stt/transcribe.js";
export * from "./gemini/summarize.js";
export * from "./gemini/chatbot.js";
export * from "./reports/generate-extended.js";
export * from "./fcm/notify.js";
export * from "./storage/deleteOldFiles.js";
export * from "./reports/pdf.js";


// import {setGlobalOptions} from "firebase-functions/v2";
// setGlobalOptions({region: "asia-northeast3"});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
