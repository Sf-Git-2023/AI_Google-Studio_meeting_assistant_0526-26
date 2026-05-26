import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";

// Load environment variables for local development (vercel dev)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// System Instructions constant for AI behavior and formatting rules
const SYSTEM_INSTRUCTION = `
你是一個專業的「會議記錄生成與雙語翻譯助理」。你的任務是將使用者提供的會議逐字稿，整理出結構化的會議紀錄，並將中英文完全對照翻譯。

請務必遵守以下輸出格式要求，以 Markdown 格式輸出。所有繁體中文部分必須使用繁體中文，且「英文翻譯版」部分必須翻譯為專業、通順的商用英文。請勿包含任何額外的問候語或結語。

## 📘 繁體中文會議紀錄 (Traditional Chinese Version)

### 1. 會議主題與時間
- **會議主題**：[根據逐字稿內容，提煉出一個具體、精確的會議標題]
- **會議時間**：[若口述中有提及具體日期與時間（如 Q4 行銷、週五下午五點），請在此條列；若無則標示為 "未特別提及"]

### 2. 與會者
- [列出發言者或有提及的出席人員、主管姓名，若無則標示為 "未在逐字稿中提及"]

### 3. 會議重點總結
請依據會議核心議題，用 3 到 5 個具體、結構清晰的重點總結會議內容，涵蓋核心討論、進度或遇到的卡關事項：
- **重點一**：[核心要點與背景說明]
- **重點二**：[核心要點與背景說明]
- **重點三**：[核心要點與背景說明]
*(可列出 3 至 5 個重點)*

### 4. Action Items (Excel 待辦事項追蹤表)
請以 Excel 專案規劃追蹤表的標準格式輸出，以便使用者直接複製貼上到 Excel / Google Sheets 中使用：
| 序號 (No.) | 任務內容 (Action Item / Task) | 負責人 (Owner) | 協同人員 (Contributors) | 截止日期 (Due Date) | 優先權 (Priority) | 目前狀態 (Status) |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| 1 | [具體待辦事項 / 任務詳細內容] | [姓名/部門，未提及則寫待確認] | [相關協同人員，無則寫無] | [時程、幾月幾日，未提及則寫儘速/待確認] | [高/中/低] | 未開始 |

---

## 🌐 英文翻譯版 (Professional English Translation)

### 1. Meeting Topic & Time
- **Topic**: [English Translation of Topic]
- **Time**: [English Translation of Time]

### 2. Attendees
- [English Translation of Attendees List]

### 3. Key Summary Points
- **Point 1**: [English Translation of Point 1]
- **Point 2**: [English Translation of Point 2]
- **Point 3**: [English Translation of Point 3]

### 4. Action Items (Excel Task Tracker)
Please output as a structured Excel table pattern for easy copy-pasting into spreadsheets:
| No. | Action Item / Task Description | Lead Owner | Contributors | Due Date | Priority | Status |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| 1 | [Task details and description] | [Name/Dept, or TBD] | [Contributors, or None] | [Due Date, or TBD] | [High/Medium/Low] | Not Started |

⚠️ **輸出限制**：
1. 保持段落分明、版面幾何結構整齊。
2. 絕對不要在回覆中包含任何多餘的「好的，這是我為您整理的...」或「希望有幫助！」等額外哈啦問候語，必須直接以 Markdown 標頭起頭輸出，完成後即結束。
`;

interface GenerateRequest {
  provider: "gemini" | "nvidia";
  transcript: string;
  focusNotes?: string;
  translationType?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST request
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed. Please use POST.",
    });
  }

  try {
    const { provider, transcript, focusNotes, translationType } = req.body as GenerateRequest;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "會議內容（逐字稿或筆記）不可為空！",
      });
    }

    // Combine user prompt with custom instructions/focus notes if provided
    let userPrompt = `【會議逐字稿內容 / 重點筆記】：\n"""\n${transcript}\n"""\n`;
    if (focusNotes && focusNotes.trim().length > 0) {
      userPrompt += `\n【使用者特別指定的重點或指示】：\n"""\n${focusNotes}\n"""\n`;
    }
    if (translationType) {
      userPrompt += `\n【輸出語系與翻譯特別要求】：請加強執行 "${translationType}" 相關的翻譯需求。`;
    }

    if (provider === "nvidia") {
      const apiKey = process.env.NVIDIA_API_KEY;
      if (!apiKey || apiKey === "你的_NVIDIA_API_Key") {
        return res.status(400).json({
          success: false,
          message: "未偵測到有效的 NVIDIA_API_KEY。請確認您的 .env.local 或雲端環境變數設定。",
        });
      }

      // Call NVIDIA OpenAI-compatible API
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-mini-4b-instruct",
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        throw new Error(`NVIDIA API 回應異常: ${response.status} ${response.statusText} - ${errorDetail}`);
      }

      const data = await response.json();
      const resultText = data.choices?.[0]?.message?.content;

      if (!resultText) {
        throw new Error("NVIDIA AI 無法返回有效對答，請重試或檢視 API Key 狀態。");
      }

      return res.status(200).json({
        success: true,
        result: resultText,
        modelUsed: "nvidia/nemotron-mini-4b-instruct",
      });

    } else {
      // Default to gemini-2.5-flash-lite
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "你的_Gemini_API_Key") {
        return res.status(400).json({
          success: false,
          message: "未偵測到有效的 GEMINI_API_KEY。請確認您的 .env.local 或雲端環境變數設定。",
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const modelName = "gemini-2.5-flash-lite";

      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.3,
        },
      });

      const resultText = response.text;

      if (!resultText) {
        throw new Error("Gemini AI 無法返回有效會議摘要紀錄，請重試。");
      }

      return res.status(200).json({
        success: true,
        result: resultText,
        modelUsed: modelName,
      });
    }
  } catch (error: any) {
    console.error("Error in /api/generate Serverless Function:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "伺服器在處理 AI 摘要時遇到內部異常，請重試。",
    });
  }
}
