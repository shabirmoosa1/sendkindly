import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    // Use SK_ANTHROPIC_API_KEY to avoid collision with Claude Code's ANTHROPIC_API_KEY env override
    const apiKey = process.env.SK_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('SK_ANTHROPIC_API_KEY / ANTHROPIC_API_KEY is not configured');
      return NextResponse.json(
        { error: 'AI suggestions are not available — API key not configured' },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

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

    // Parse safely — strip markdown code fences if present
    let suggestions: string[];
    try {
      let text = content.text.trim();
      // Remove ```json ... ``` wrapper if AI returns it
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      suggestions = JSON.parse(text);
    } catch {
      console.error('Failed to parse AI response:', content.text);
      return NextResponse.json(
        { error: 'Failed to parse suggestions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('AI suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
