import { GoogleGenAI, Type } from "@google/genai";
import { VideoRecommendation, VideoAnalysis } from "../types";

// Initialize Gemini Client
// Note: process.env.API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Step 1: Search for videos using Google Search Grounding.
 * Ensure results are parsed correctly.
 */
export const searchVideos = async (topic: string): Promise<VideoRecommendation[]> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Find exactly 5 YouTube videos related to the school lesson topic: "${topic}".
    
    Return a list in the following plain text format for each video.
    IMPORTANT: Write the "Description" in Korean.
    
    Format:
    Video 1
    Title: [Video Title]
    Channel: [Channel Name]
    URL: [YouTube URL]
    Description: [Short 1 sentence description in Korean]
    
    Video 2
    ...
    
    Ensure you find valid YouTube links.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    return parseVideoResponse(text);
  } catch (error) {
    console.error("Error searching videos:", error);
    throw new Error("비디오를 검색하는 중 오류가 발생했습니다.");
  }
};

/**
 * Helper to parse the raw text response from the search into objects.
 */
const parseVideoResponse = (text: string): VideoRecommendation[] => {
  const videos: VideoRecommendation[] = [];
  const lines = text.split('\n');
  let currentVideo: Partial<VideoRecommendation> = {};
  let counter = 1;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.toLowerCase().startsWith('video') && (cleanLine.includes(counter.toString()) || cleanLine.length < 10)) {
      if (currentVideo.title && currentVideo.url) {
        videos.push({ ...currentVideo, id: counter - 1 } as VideoRecommendation);
        currentVideo = {};
      }
      counter++;
    } else if (cleanLine.startsWith('Title:') || cleanLine.startsWith('제목:')) {
      currentVideo.title = cleanLine.replace(/^(Title:|제목:)/, '').trim();
    } else if (cleanLine.startsWith('Channel:') || cleanLine.startsWith('채널:')) {
      currentVideo.channel = cleanLine.replace(/^(Channel:|채널:)/, '').trim();
    } else if (cleanLine.startsWith('URL:') || cleanLine.startsWith('Link:') || cleanLine.startsWith('링크:')) {
      currentVideo.url = cleanLine.replace(/^(URL:|Link:|링크:)/, '').trim();
    } else if (cleanLine.startsWith('Description:') || cleanLine.startsWith('설명:')) {
      currentVideo.description = cleanLine.replace(/^(Description:|설명:)/, '').trim();
    }
  }
  // Push the last one
  if (currentVideo.title && currentVideo.url) {
    videos.push({ ...currentVideo, id: counter - 1 } as VideoRecommendation);
  }

  return videos.slice(0, 5).map((v, i) => ({...v, id: i + 1}));
};

/**
 * Step 3: Summarize selected video and suggest assessments.
 * Strict Korean output requested.
 */
export const analyzeVideoAndSuggest = async (videoTitle: string, videoUrl: string): Promise<VideoAnalysis> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Analyze the YouTube video titled "${videoTitle}" (URL: ${videoUrl}).
    1. Provide a concise summary of the educational content in Korean (max 3 sentences).
    2. Suggest 3 distinct performance assessment tasks (수행평가) students could do based on this video, described in Korean.
    
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Summary of the video content in Korean" },
            assessments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  title: { type: Type.STRING, description: "Title of the assessment task in Korean" },
                  description: { type: Type.STRING, description: "Brief explanation of the task in Korean" }
                },
                required: ["id", "title", "description"]
              }
            }
          },
          required: ["summary", "assessments"]
        }
      }
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    
    const assessments = (data.assessments || []).map((a: any, index: number) => ({
      ...a,
      id: index + 1
    }));

    return {
      summary: data.summary,
      assessments
    };

  } catch (error) {
    console.error("Error analyzing video:", error);
    throw new Error("비디오 분석 및 수행평가 제안 중 오류가 발생했습니다.");
  }
};

/**
 * Step 6: Generate detailed Lesson Plan in Korean.
 */
export const generateLessonPlan = async (
  topic: string,
  videoTitle: string,
  assessmentTitle: string
): Promise<string> => {
  const model = "gemini-3-pro-preview"; 
  const prompt = `
    Create a detailed Lesson Plan and Performance Assessment Guide **strictly in Korean language**.
    
    Context:
    - Subject/Topic: ${topic}
    - Resource Video: ${videoTitle}
    - Selected Assessment Task: ${assessmentTitle}
    
    Please write a professional document using **Standard Markdown**.
    
    CRITICAL FORMATTING RULES:
    1. **Do NOT use HTML tags** like <br>, <div>, or <span>. Use standard Markdown syntax only.
    2. **Tables**: Use standard Markdown table syntax. Do NOT use HTML tables.
       Example:
       | Header 1 | Header 2 |
       | :--- | :--- |
       | Content | Content |
    3. **Line Breaks**: Use two spaces at the end of a line for a line break, or leave a blank line for a new paragraph.
    
    Required Sections (Translate headers to Korean):
    1. **수업 개요 (Lesson Overview)**
       - 학습 목표 (Learning Objectives)
       - 영상 활용 방안 (Connection to Video)
    
    2. **수업 지도안 (Detailed Lesson Plan)**
       - Create a Markdown Table with columns: [단계, 시간, 교수-학습 활동, 유의점].
       - Include Introduction (도입), Development (전개), Conclusion (정리).
    
    3. **준비물 (Materials)**
       - Bulleted list.
    
    4. **수행 평가 계획 (Performance Assessment)**
       - Procedure detail.
       - Timeline.
    
    5. **평가 기준 (Grading Criteria)**
       - Create a Markdown Table for Grading Criteria (상/중/하).
       - Columns: [등급, 평가 기준].
    
    Ensure the tone is professional (educational formal Korean).
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "수업 지도안을 생성하지 못했습니다.";
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    throw new Error("수업 지도안 생성 중 오류가 발생했습니다.");
  }
};