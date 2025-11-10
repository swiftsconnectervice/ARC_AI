// Fix: Import necessary modules from @google/genai and local types.
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProductImage, StyleBrief, StrategyBrief, CreativeImage, CampaignKit } from '../types';

// Fix: Initialize the GoogleGenAI client as per the guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Utility to handle JSON parsing from model response
const parseJsonResponse = <T>(jsonString: string, functionName: string): T => {
    try {
        const match = jsonString.match(/```json\n([\s\S]*?)\n```/);
        const parsableString = match ? match[1] : jsonString;
        return JSON.parse(parsableString) as T;
    } catch (e) {
        console.error(`Error parsing JSON from ${functionName}:`, e);
        console.error("Original string:", jsonString);
        throw new Error(`Failed to parse JSON response in ${functionName}.`);
    }
};

// --- 💡 NUEVA FUNCIÓN DE AYUDA (Helper) 1 ---
// Descarga una URL (como las de Firebase) y la convierte a Base64
const urlToDataPart = async (url: string) => {
    // Usa fetch para descargar la imagen
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    
    // Usa FileReader para convertir el blob a una data URL (Base64)
    return new Promise<{ mimeType: string; data: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve({
                mimeType: blob.type,
                data: base64String.split(',')[1] // Obtiene solo la parte de datos Base64
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- 💡 NUEVA FUNCIÓN DE AYUDA (Helper) 2 ---
// Decide si la URL es 'data:' o 'https:' y la prepara para la API
const createImagePart = async (url: string) => {
    if (url.startsWith('data:')) {
        // Ya está en Base64
        return {
            inlineData: {
                mimeType: url.match(/data:(image\/.+);/)?.[1] || 'image/png',
                data: url.split(',')[1],
            },
        };
    } else {
        // Es una URL 'https:', hay que descargarla y convertirla
        const { mimeType, data } = await urlToDataPart(url);
        return {
            inlineData: {
                mimeType: mimeType,
                data: data,
            },
        };
    }
};

// (Tu función analyzeImageStyle está bien como la tenías)
export const analyzeImageStyle = async (inspirationImage: ProductImage): Promise<StyleBrief> => {
    const prompt = `
        CRITICAL INSTRUCTION: Your ONLY task is to analyze the *visual style* and abstract *aesthetics* of the image.
        You MUST completely ignore the specific *product*, *object*, or *subject* shown. Do not mention what it is (e.g., "watch," "soap").
        EXAMPLE: If you see a luxury watch on a dark background, DO NOT describe the mood as "luxurious." Instead, describe the *style* (e.g., "dramatic studio lighting with high contrasts").
        Your goal is to extract a visual style "filter" that can be applied to ANY OTHER product.
        Analyze EXCLUSIVELY: palette, lighting, composition, mood, subject_focus.
        Return the analysis as a JSON object.
    `;
    const imagePart = {
        inlineData: {
            mimeType: inspirationImage.mimeType,
            data: inspirationImage.base64,
        },
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    palette: { type: Type.STRING, description: "Descriptive summary of the color palette (e.g. 'Warm, muted earth tones')" },
                    lighting: { type: Type.STRING, description: "Description of the lighting style (e.g. 'Soft, diffuse natural light', 'High-contrast studio')" },
                    composition: { type: Type.STRING, description: "Summary of the composition (e.g. 'Minimalist, negative space', 'Symmetrical')" },
                    mood: { type: Type.STRING, description: "The overall abstract feeling (e.g. 'Serene and peaceful', 'Energetic and vibrant')" },
                    subject_focus: { type: Type.STRING, description: "How the subject is focused (e.g. 'Sharp focus with a heavily blurred background')" }
                },
                required: ["palette", "lighting", "composition", "mood", "subject_focus"],
            }
        }
    });
    return parseJsonResponse<StyleBrief>(response.text, 'analyzeImageStyle');
};

// (Tu función generateStrategyBriefs está bien)
export const generateStrategyBriefs = async (description: string, styleBrief: StyleBrief | null): Promise<{ briefs: StrategyBrief[], campaignName: string }> => {
    const stylePrompt = styleBrief 
        ? `The desired visual style is: ${styleBrief.mood}, with ${styleBrief.lighting} lighting, a ${styleBrief.palette} color palette, and ${styleBrief.composition} composition.`
        : 'No specific visual style was provided.';
    const prompt = `I need to create a marketing campaign for the following product: "${description}".
${stylePrompt}
Based on this, generate a concise, catchy campaign name and three distinct marketing strategy briefs. Each brief should have a clear title, a short description (2-3 sentences), and a list of 3-5 relevant keywords.
The strategies should target different potential audiences or marketing angles.
Return the result as a single JSON object with two keys: "campaignName" (a string) and "briefs" (an array of strategy brief objects).`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    campaignName: { type: Type.STRING },
                    briefs: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ["title", "description", "keywords"]
                        }
                    }
                },
                required: ["campaignName", "briefs"]
            }
        }
    });
    return parseJsonResponse<{ briefs: StrategyBrief[], campaignName: string }>(response.text, 'generateStrategyBriefs');
};

// (Tu función generateCampaignTextContent está bien con la optimización que hicimos)
export const generateCampaignTextContent = async (
    productDescription: string, 
    brief: StrategyBrief, 
    styleBrief: StyleBrief | null
): Promise<any> => {
    const styleInstruction = styleBrief
        ? `
        **3. The Visual Style (Aesthetic Only):**
        - Mood: ${styleBrief.mood}
        - Lighting: ${styleBrief.lighting}
        - Palette: ${styleBrief.palette}
        - Composition: ${styleBrief.composition}`
        : `
        **3. The Visual Style (Aesthetic Only):**
        - No specific style provided.`;
    const prompt = `
        You are a Creative Director. Your job is to create a campaign kit based on three inputs:
        **1. The Product:** ${productDescription}
        **2. The Strategy:** ${brief.title} - ${brief.description} (Keywords: ${brief.keywords.join(', ')})
        ${styleInstruction}
        Based on all three points, generate a detailed campaign kit.
        CRITICAL INSTRUCTION FOR VISUALS:
        The image prompts MUST describe **The Product (1)**, but using the **The Visual Style (3)**.
        - **EXAMPLE:** If The Product is "un juguete para perro" and The Visual Style is "dramatic, high-contrast lighting", a good prompt would be: "A macro shot of a rubber dog toy on a dark concrete surface, lit with a single dramatic high-contrast light."
        - **DO NOT** generate prompts about the original inspiration image (e.g., "a watch"). The prompts must be about **The Product**.
        Return the result as a single JSON object.
    `; // Tu prompt aquí está bien, solo lo acorté para el ejemplo
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    strategyTitle: { type: Type.STRING },
                    targetAudience: { 
                        type: Type.OBJECT, 
                        properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
                        required: ["title", "description"]
                    },
                    keyMessaging: {
                        type: Type.OBJECT,
                        properties: { title: { type: Type.STRING }, points: { type: Type.ARRAY, items: { type: Type.STRING } } },
                        required: ["title", "points"]
                    },
                    marketingChannels: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            channels: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
                                    required: ["name", "description"]
                                }
                            }
                        },
                         required: ["title", "channels"]
                    },
                    visuals: {
                        type: Type.OBJECT,
                        properties: { title: { type: Type.STRING }, imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } } },
                        required: ["title", "imagePrompts"]
                    }
                },
                required: ["strategyTitle", "targetAudience", "keyMessaging", "marketingChannels", "visuals"]
            }
        }
    });
    return parseJsonResponse<Partial<CampaignKit>>(response.text, 'generateCampaignTextContent');
};

// (Tu función generateImage está bien con la corrección que hicimos)
export const generateImage = async (prompt: string, productImage: ProductImage | null, styleBrief: StyleBrief | null): Promise<{ url: string }> => {
    
    const styleInstruction = styleBrief ? ` Adhere to this style: Mood: ${styleBrief.mood}. Lighting: ${styleBrief.lighting}. Palette: ${styleBrief.palette}. Composition: ${styleBrief.composition}.` : '';
    
    let fullPrompt: string;
    const parts: any[] = [];

    if (productImage) {
        // Flow B: Product Anchoring
        fullPrompt = `Take the product from the provided reference image and place it seamlessly into a new scene described by the following prompt: "${prompt}". ${styleInstruction}. It is crucial to preserve the product, including its logo and branding, exactly as it appears in the reference image. Do not add any new or additional text, logos, or graphics to the rest of the scene.`;
        parts.push({ text: fullPrompt });
        
        // --- 💡 LA CORRECCIÓN ESTÁ AQUÍ ---
        // Revierte al método original y simple. No uses el helper "createImagePart".
        // La imagen de producto (productImage) siempre es Base64 la primera vez.
        parts.push({
            inlineData: {
                mimeType: productImage.mimeType,
                data: productImage.base64
            }
        });
        // --- FIN DE LA CORRECCIÓN ---

    } else {
        // Flow A: Conceptual Creation
        fullPrompt = `Generate a high-quality, photorealistic image for a marketing campaign based on this prompt: "${prompt}". ${styleInstruction}. The image must be purely visual and serve as a background for text that will be added later. IMPORTANT: Do NOT include any text, words, letters, or logos in the image.`;
        parts.push({ text: fullPrompt });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData) {
        const { mimeType, data } = imagePart.inlineData;
        if (!mimeType.startsWith('image/')) {
             throw new Error(`API returned a non-image MIME type: ${mimeType}`);
        }
        return { url: `data:${mimeType};base64,${data}` };
    }

    throw new Error('Image generation failed to return an image.');
};

// (Tu función generateAdCopy está bien)
export const generateAdCopy = async (campaign: CampaignKit, channel: string, image: CreativeImage): Promise<{ headline: string, body: string, cta: string }> => {
    const textPrompt = `You are an expert copywriter. Analyze the provided image in the context of the marketing campaign described below...`; // Tu prompt está bien
    const imagePart = await createImagePart(image.url); // Usa el helper
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{text: textPrompt}, imagePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    headline: { type: Type.STRING },
                    body: { type: Type.STRING },
                    cta: { type: Type.STRING }
                },
                required: ["headline", "body", "cta"]
            }
        }
    });
    return parseJsonResponse<{ headline: string, body: string, cta: string }>(response.text, 'generateAdCopy');
};


// --- 💡 FUNCIÓN CORREGIDA ---
export const generateImageVariations = async (prompt: string, sourceImage: CreativeImage, styleBrief: StyleBrief | null): Promise<{ prompt: string; url: string }[]> => {
    const styleInstruction = styleBrief ? ` The original style was: Mood: ${styleBrief.mood}. Lighting: ${styleBrief.lighting}. Palette: ${styleBrief.palette}.` : '';
    const fullPrompt = `Based on the provided image, generate one new variation. The new creative direction is: "${prompt}".${styleInstruction}.`;
    
    // Usa el helper para crear la parte de la imagen, sin importar si es data: o https:
    const imagePart = await createImagePart(sourceImage.url);
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePartResponse = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePartResponse && imagePartResponse.inlineData) {
        const { mimeType, data } = imagePartResponse.inlineData;
        if (!mimeType.startsWith('image/')) {
             throw new Error(`API returned a non-image MIME type: ${mimeType}`);
        }
        return [{ prompt, url: `data:${mimeType};base64,${data}` }];
    }
    
    return [];
};

export const editImageWithMask = async (globalPrompt: string, localPrompt: string, sourceImage: CreativeImage, maskBase64: string, styleBrief: StyleBrief | null): Promise<{ prompt: string; url: string }[]> => {
    
    // --- 💡 LA CORRECCIÓN ESTÁ AQUÍ ---
    // Corregí el typo de "globalGrompt" a "globalPrompt"
    const fullPrompt = `I will provide an original image, a mask image, and a text prompt.
The original image has the overall scene.
The mask image is black and white. The white area indicates the region to be edited.
The text prompt describes the desired change for the masked (white) area.

Original scene context: "${globalPrompt}". 
Edit instruction for the masked area: "${localPrompt}".

Please generate a new image that seamlessly incorporates the edit into the original image, maintaining the overall style.`;
    // --- FIN DE LA CORRECCIÓN ---

    // Usa el helper para crear la parte de la imagen, sin importar si es data: o https:
    const sourceImagePart = await createImagePart(sourceImage.url);

    const maskImagePart = {
        inlineData: {
            mimeType: 'image/png',
            data: maskBase64,
        },
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: fullPrompt }, sourceImagePart, maskImagePart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePartResponse = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    
    if (imagePartResponse && imagePartResponse.inlineData) {
        const { mimeType, data } = imagePartResponse.inlineData;
        if (!mimeType.startsWith('image/')) {
             throw new Error(`API returned a non-image MIME type: ${mimeType}`);
        }
        const newPrompt = `${globalPrompt} (edited: ${localPrompt})`;
        return [{ prompt: newPrompt, url: `data:${mimeType};base64,${data}` }];
    }
    
    return [];
};