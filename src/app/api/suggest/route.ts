import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, { limit: 10, windowSeconds: 60, routeName: 'suggest' });
    if (limited) return limited;
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
    const { recipientName, occasion, prompt, existingText } = body;

    if (!recipientName || !occasion) {
      return NextResponse.json(
        { error: 'recipientName and occasion are required' },
        { status: 400 }
      );
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (existingText && existingText.trim().length > 5) {
      // "Improve my text" mode — polish what they already wrote
      systemPrompt = `You are a writing assistant for SendKindly, a celebration platform. The user has written a draft message and wants help improving it. Generate exactly 3 improved versions that preserve their original meaning and personal details but enhance the writing. Each version should have a distinct style:
1. Polished & concise — tighten the wording, fix grammar, keep it brief
2. Warm & expressive — expand slightly with more feeling and emotion
3. Creative & playful — add personality, could include emojis or a light touch of humour
Return ONLY a JSON array of 3 strings, no other text.`;

      userPrompt = `Here is the user's draft message for ${recipientName}'s ${occasion.replace(/_/g, ' ')} celebration:\n\n"${existingText.trim()}"\n\nImprove it in 3 different styles. Keep each under 100 words. Preserve any personal details or names they mentioned.`;
    } else {
      // "Generate from scratch" mode — diverse styles
      systemPrompt = `You are a message assistant for SendKindly, a celebration platform. Generate exactly 3 message suggestions that each have a CLEARLY DIFFERENT style and tone:
1. Short & heartfelt — 1-2 sentences, simple and sincere
2. Warm & detailed — 2-3 sentences, descriptive and emotional
3. Fun & light — uses casual language, may include 1-2 emojis, feels like a text from a close friend
The messages should feel personal and genuine — not generic or corporate. Return ONLY a JSON array of 3 strings, no other text.`;

      userPrompt = `Write 3 message suggestions for ${recipientName}'s ${occasion.replace(/_/g, ' ')} celebration.${prompt ? ` Context: "${prompt}"` : ''} Make each suggestion feel distinctly different in style and length.`;
    }

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
