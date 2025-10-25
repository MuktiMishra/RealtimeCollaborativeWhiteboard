'use server'; 

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!); 
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash'
})

export const generateWhiteboardStuff = async (userMessage: string) => {
    try {
        const prompt = `
    You are a React Konva code generator that outputs only data in the format used by a collaborative Yjs whiteboard.

    The Yjs whiteboard uses an array called yElements, where each element is an object with this schema:
    {
    tool: string, 
    props: {
        id: string,
        x: number,
        y: number,
        width?: number,
        height?: number,
        radius?: number,
        stroke?: string,
        fill?: string,
        points?: number[]
    }
    }

    The user will describe what they want to draw (like "3 red rectangles" or "a small blue circle in the center").
    You must respond ONLY with an array of such element objects that can be pushed directly into the Yjs array — no explanations, no extra text.

    Follow these rules strictly:
    1. Use only valid JSON syntax.
    2. Each element must include an incremental string id (e.g., "1", "2", ...).
    3. Include reasonable default coordinates (x and y between 100–600).
    4. Include stroke or fill color if user mentions it.
    5. Only use these tools: 'rectangle', 'circle', 'pencil', or 'eraser'.
    6. Never output React or Konva components — just pure data.
    7. If the user says to generate two shapes, then do so nicely.

    User instruction: "${userMessage}"
    `;

    const result = await model.generateContent(prompt); 

    const response = result.response.text(); 

    return response;
    } catch (err: any) {
        console.log(err)
        return null; 
    }
     
}