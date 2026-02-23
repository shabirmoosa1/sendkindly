import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientName, occasion, prompt } = body;

    if (!recipientName || !occasion) {
      return NextResponse.json(
        { error: 'recipientName and occasion are required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a warm, heartfelt message assistant for SendKindly, a celebration platform. Generate exactly 3 short, sincere message suggestions (each 1-2 sentences, max 80 words each). The messages should feel personal and genuine — not generic or corporate. Return ONLY a JSON array of 3 strings, no other text.`;

    const userPrompt = `Write 3 heartfelt message suggestions for ${recipientName}'s ${occasion.replace(/_/g, ' ')} celebration.${prompt ? ` The creator asked contributors: "${prompt}"` : ''} Keep each message warm, personal, and concise.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
    }

    const suggestions: string[] = JSON.parse(content.text);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('AI suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
