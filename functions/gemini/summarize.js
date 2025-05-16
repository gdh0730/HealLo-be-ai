import {onRequest} from "firebase-functions/v2/https";
import axios from "axios";
import {GEMINI_URL} from "../_lib/init.js";

const GEM = GEMINI_URL;

export const summarizeText = onRequest(async (req, res) => {
  const {text} = req.body;
  const {data} = await axios.post(GEM, {
    contents: [{
      parts: [{text}],
    }],
  });
  res.json({summary: data.candidates[0].content.parts[0].text});
});
