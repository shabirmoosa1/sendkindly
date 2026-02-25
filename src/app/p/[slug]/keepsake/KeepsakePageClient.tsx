'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { shareOrCopy, openEmailShare } from '@/lib/share';
import Navbar from '@/components/Navbar';
import QRCodeModal from '@/components/QRCodeModal';

interface PageData {
  id: string;
  slug: string;
  recipient_name: string;
  template_type: string;
  hero_image_url: string | null;
  creator_message: string | null;
  creator_name: string | null;
  status: string;
}

interface Contribution {
  id: string;
  contributor_name: string;
  message_text: string | null;
  photo_url: string | null;
  ai_sticker_url: string | null;
  recipient_reply: string | null;
  created_at: string;
}

interface Reply {
  id: string;
  reply_text: string | null;
  reply_photo_url: string | null;
  created_at: string;
}

export default function KeepsakePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const isRecipient = searchParams.get('recipient') === 'true';

  const [page, setPage] = useState<PageData | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);
  const contributionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .single();

      if (pageError || !pageData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPage(pageData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user && (pageData as any).creator_id === user.id) {
        setIsCreator(true);
      }

      const { data: contribs } = await supabase
        .from('contributions')
        .select('*')
        .eq('page_id', pageData.id)
        .order('created_at', { ascending: true });

      setContributions(contribs || []);

      const { data: replyData } = await supabase
        .from('recipient_replies')
        .select('*')
        .eq('page_id', pageData.id)
        .order('created_at', { ascending: false });

      setReplies(replyData || []);
      setLoading(false);
    }
    loadData();
  }, [slug]);

  // Detect mobile for share vs copy behavior
  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

  const handleShareContributorLink = async () => {
    if (!page) return;
    const url = `${window.location.origin}/p/${slug}`;
    const result = await shareOrCopy({
      title: `Help celebrate ${page.recipient_name}!`,
      text: `Add your message to ${page.recipient_name}'s ${formatOccasion(page.template_type)} celebration`,
      url,
    });
    if (result.copied) {
      setShareFeedback('✅ Link copied!');
      setTimeout(() => setShareFeedback(null), 2000);
    }
  };

  const handleSendReply = async () => {
    if (!page || !replyText.trim()) return;
    setSubmittingReply(true);

    const { error } = await supabase
      .from('recipient_replies')
      .insert({
        page_id: page.id,
        reply_text: replyText.trim(),
      });

    if (!error) {
      setReplySent(true);
      setReplies((prev) => [
        { id: Date.now().toString(), reply_text: replyText.trim(), reply_photo_url: null, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setReplyText('');

      // Transition status to 'thanked' if currently 'revealed'
      if (page.status === 'revealed') {
        await supabase
          .from('pages')
          .update({ status: 'thanked', thanked_at: new Date().toISOString() })
          .eq('id', page.id);
        setPage((prev) => prev ? { ...prev, status: 'thanked' } : prev);
      }
    }
    setSubmittingReply(false);
  };

  const formatOccasion = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  const handleDeleteContribution = async (contrib: Contribution) => {
    if (!confirm(`Delete ${contrib.contributor_name}'s contribution? This cannot be undone.`)) return;

    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', contrib.id);

    if (error) {
      console.error('Delete error:', error);
      alert('Failed to delete. Please try again.');
      return;
    }

    // Delete photo from storage if exists
    if (contrib.photo_url) {
      const urlParts = contrib.photo_url.split('/contributions/');
      if (urlParts.length > 1) {
        await supabase.storage.from('contributions').remove([urlParts[1]]);
      }
    }

    // Delete sticker from storage if exists
    if (contrib.ai_sticker_url) {
      const urlParts = contrib.ai_sticker_url.split('/stickers/');
      if (urlParts.length > 1) {
        await supabase.storage.from('stickers').remove([urlParts[1]]);
      }
    }

    setContributions((prev) => prev.filter((c) => c.id !== contrib.id));
  };

  const handleSaveContributionReply = async (contributionId: string) => {
    if (!inlineReplyText.trim()) return;
    setSavingReply(true);

    const { error } = await supabase
      .from('contributions')
      .update({ recipient_reply: inlineReplyText.trim() })
      .eq('id', contributionId);

    if (!error) {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, recipient_reply: inlineReplyText.trim() } : c
        )
      );
      setReplyingToId(null);
      setInlineReplyText('');
    }
    setSavingReply(false);
  };

  const bgColors = ['#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5', '#ede9fe', '#fee2e2', '#e0e7ff', '#ccfbf1'];

  const OCCASION_EMOJIS: Record<string, string> = {
    birthday: '🎂', wedding: '💒', baby_shower: '👶', graduation: '🎓',
    anniversary: '💕', farewell: '👋', get_well: '💐', thank_you: '🙏',
    work_anniversary: '🏆', retirement: '🌅', promotion: '🚀', new_job: '💼',
    memorial: '🕊️', other: '🎉',
  };

  const handleDownloadPDF = async () => {
    if (!page) return;
    setPdfGenerating(true);
    setPdfToast('Preparing your keepsake PDF...');

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;

      // --- COVER PAGE ---
      // Background
      pdf.setFillColor(246, 242, 236); // ivory
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Decorative top band
      pdf.setFillColor(183, 110, 76); // terracotta
      pdf.rect(0, 0, pageWidth, 6, 'F');

      // Gold accent line
      pdf.setFillColor(200, 169, 81); // gold
      pdf.rect(0, 6, pageWidth, 2, 'F');

      // Gift emoji
      pdf.setFontSize(60);
      pdf.text('🎁', pageWidth / 2, 80, { align: 'center' });

      // Occasion emoji
      const emoji = OCCASION_EMOJIS[page.template_type] || '🎉';
      pdf.setFontSize(28);
      pdf.text(emoji, pageWidth / 2, 100, { align: 'center' });

      // Recipient name
      pdf.setFontSize(36);
      pdf.setTextColor(42, 31, 28); // espresso
      pdf.setFont('helvetica', 'bold');
      const nameLines = pdf.splitTextToSize(page.recipient_name, pageWidth - 40);
      pdf.text(nameLines, pageWidth / 2, 125, { align: 'center' });

      // Occasion type
      const occasionLabel = page.template_type === 'other'
        ? 'Celebration'
        : formatOccasion(page.template_type);
      pdf.setFontSize(16);
      pdf.setTextColor(183, 110, 76); // terracotta
      pdf.setFont('helvetica', 'normal');
      pdf.text(occasionLabel, pageWidth / 2, 125 + nameLines.length * 14 + 8, { align: 'center' });

      // Date
      const createdDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      pdf.setFontSize(11);
      pdf.setTextColor(90, 75, 69); // cocoa
      pdf.text(createdDate, pageWidth / 2, 125 + nameLines.length * 14 + 22, { align: 'center' });

      // Contribution count
      pdf.setFontSize(11);
      pdf.setTextColor(200, 169, 81); // gold
      const countText = `${contributions.length} heartfelt ${contributions.length === 1 ? 'message' : 'messages'}`;
      pdf.text(countText, pageWidth / 2, 125 + nameLines.length * 14 + 34, { align: 'center' });

      // Tagline
      pdf.setFontSize(10);
      pdf.setTextColor(90, 75, 69); // cocoa
      pdf.text('A keepsake created with love on SendKindly', pageWidth / 2, pageHeight - 40, { align: 'center' });

      // Decorative bottom band
      pdf.setFillColor(200, 169, 81); // gold
      pdf.rect(0, pageHeight - 8, pageWidth, 2, 'F');
      pdf.setFillColor(183, 110, 76); // terracotta
      pdf.rect(0, pageHeight - 6, pageWidth, 6, 'F');

      // --- CONTENT PAGES ---
      if (contributionsRef.current) {
        setPdfToast('Capturing contributions...');

        const canvas = await html2canvas(contributionsRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#F6F2EC',
          logging: false,
          onclone: (doc) => {
            // Hide delete buttons and reply forms in the clone
            doc.querySelectorAll('[data-pdf-hide]').forEach((el) => {
              (el as HTMLElement).style.display = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgWidth = pageWidth - 20; // 10mm margin each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Content area per page (with margins)
        const contentTop = 15;
        const contentBottom = pageHeight - 15;
        const contentHeight = contentBottom - contentTop;

        let remainingHeight = imgHeight;
        let sourceY = 0;

        while (remainingHeight > 0) {
          pdf.addPage();
          pdf.setFillColor(246, 242, 236); // ivory background
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');

          const sliceHeight = Math.min(remainingHeight, contentHeight);
          // Calculate source dimensions in the original canvas pixel space
          const sourcePixelY = (sourceY / imgHeight) * canvas.height;
          const sourcePixelHeight = (sliceHeight / imgHeight) * canvas.height;

          // Create a temporary canvas for this slice
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sourcePixelHeight;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#F6F2EC';
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(
              canvas,
              0, sourcePixelY, canvas.width, sourcePixelHeight,
              0, 0, sliceCanvas.width, sourcePixelHeight,
            );
            const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
            pdf.addImage(sliceData, 'JPEG', 10, contentTop, imgWidth, sliceHeight);
          }

          sourceY += sliceHeight;
          remainingHeight -= sliceHeight;
        }
      }

      // --- BACK PAGE ---
      pdf.addPage();
      pdf.setFillColor(246, 242, 236); // ivory
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Top band
      pdf.setFillColor(183, 110, 76);
      pdf.rect(0, 0, pageWidth, 6, 'F');
      pdf.setFillColor(200, 169, 81);
      pdf.rect(0, 6, pageWidth, 2, 'F');

      // Heart
      pdf.setFontSize(40);
      pdf.text('💛', pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });

      // Back page text
      pdf.setFontSize(14);
      pdf.setTextColor(90, 75, 69); // cocoa
      pdf.setFont('helvetica', 'normal');
      pdf.text('Made with love using SendKindly', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

      pdf.setFontSize(11);
      pdf.setTextColor(183, 110, 76); // terracotta
      pdf.text('sendkindly.com', pageWidth / 2, pageHeight / 2 + 22, { align: 'center' });

      // Bottom band
      pdf.setFillColor(200, 169, 81);
      pdf.rect(0, pageHeight - 8, pageWidth, 2, 'F');
      pdf.setFillColor(183, 110, 76);
      pdf.rect(0, pageHeight - 6, pageWidth, 6, 'F');

      // --- SAVE ---
      const safeName = page.recipient_name.replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      pdf.save(`SendKindly_${safeName}_${dateStr}.pdf`);

      setPdfToast('PDF downloaded!');
      setTimeout(() => setPdfToast(null), 2500);
    } catch (err) {
      console.error('PDF generation error:', err);
      setPdfToast('Failed to generate PDF. Please try again.');
      setTimeout(() => setPdfToast(null), 3000);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="text-5xl mb-4">🎁</div>
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold mb-1 text-espresso">Preparing your keepsake...</p>
          <p className="text-sm text-cocoa/60">Gathering all the love in one place</p>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-2xl italic mb-2">Page not found</h1>
        </div>
      </div>
    );
  }

  // Access control: if page is 'active' (not yet revealed), show holding page
  // Creators can still see the full keepsake to manage it
  const isActiveHold = page.status === 'active' && !isCreator;

  if (isActiveHold) {
    return (
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh] px-6">
          <div className="glass rounded-3xl ios-shadow p-10 max-w-md text-center">
            <div className="text-5xl mb-4">💛</div>
            <h1 className="text-2xl italic mb-3">This keepsake is still being prepared with love...</h1>
            <p className="text-cocoa/70 text-sm">Check back soon — something special is on its way!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      {/* Hero Banner */}
      <div
        className="relative h-48 sm:h-56 md:h-72 flex items-center justify-center overflow-hidden"
        style={{
          background: page.hero_image_url
            ? `url(${page.hero_image_url}) center/cover`
            : 'linear-gradient(135deg, var(--gold) 0%, var(--terracotta) 40%, var(--espresso) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        {!page.hero_image_url && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-6 left-8 text-6xl">✨</div>
            <div className="absolute bottom-8 right-10 text-5xl">🎉</div>
            <div className="absolute top-12 right-20 text-4xl">💛</div>
          </div>
        )}
        <div className="relative z-10 text-center text-white px-6">
          <p className="text-[10px] font-medium tracking-[0.2em] opacity-60 mb-1">SENDKINDLY</p>
          <p className="text-xs font-medium tracking-widest opacity-90 mb-2">
            {page.template_type === 'other' ? 'A KEEPSAKE' : `${formatOccasion(page.template_type).toUpperCase()} KEEPSAKE`}
          </p>
          <h1 className="text-4xl md:text-5xl italic mb-3 text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            {page.recipient_name}
          </h1>
          <p className="text-sm opacity-90">
            {contributions.length} heartfelt {contributions.length === 1 ? 'message' : 'messages'} from people who care
          </p>
        </div>
      </div>

      {/* Contributions Grid */}
      <div className="max-w-[1100px] mx-auto px-6 py-10">

        {/* PDF-capturable content area */}
        <div ref={contributionsRef}>

        {/* Organizer's Message — pinned at top */}
        {page.creator_message && (
          <div className="max-w-[600px] mx-auto mb-10">
            <div className="glass rounded-2xl p-6 ios-shadow border-l-4 border-terracotta">
              <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-3">
                {page.creator_name ? `${page.creator_name.toUpperCase()}'S MESSAGE` : 'A MESSAGE FROM THE ORGANIZER'}
              </p>
              <p className="text-gray-800 leading-relaxed italic text-lg break-words">
                &ldquo;{page.creator_message}&rdquo;
              </p>
            </div>
          </div>
        )}

        {contributions.length === 0 && (
          <div className="text-center py-12">
            {!page.creator_message && (
              <>
                <div className="text-5xl mb-4">💌</div>
                <h2 className="text-xl italic mb-2">No contributions yet</h2>
              </>
            )}
            <p className="text-cocoa mb-6">Share the link with friends and family to start collecting messages!</p>
            {isCreator && (
              <div className="flex flex-col sm:flex-row gap-3 max-w-[400px] mx-auto">
                <button
                  onClick={() => window.location.href = `/p/${slug}`}
                  className="flex-1 btn-primary"
                >
                  ✍️ Add Your Contribution
                </button>
                <button
                  onClick={handleShareContributorLink}
                  className="flex-1 py-3 rounded-full text-sm font-semibold border-2 border-gold text-gold transition-all hover:opacity-90"
                >
                  {shareFeedback || '📨 Share Link'}
                </button>
                <button
                  onClick={() => setShowQR(true)}
                  className="flex-1 py-3 rounded-full text-sm font-semibold border-2 border-cocoa/40 text-cocoa hover:border-cocoa transition-all"
                >
                  📱 QR Code
                </button>
              </div>
            )}
          </div>
        )}

        {contributions.length > 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {contributions.map((contrib, i) => (
              <div
                key={contrib.id}
                className="break-inside-avoid glass rounded-2xl p-6 ios-shadow"
                style={{ backgroundColor: bgColors[i % bgColors.length] }}
              >
                {contrib.ai_sticker_url && (
                  <div className="mb-4 flex flex-col items-center">
                    <img
                      src={contrib.ai_sticker_url}
                      alt={`AI sticker from ${contrib.contributor_name}`}
                      className="w-[200px] h-[200px] rounded-2xl object-cover"
                      loading="lazy"
                    />
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold/80">
                      ✨ AI-generated sticker
                    </span>
                  </div>
                )}

                {contrib.photo_url && !contrib.ai_sticker_url && (
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img
                      src={contrib.photo_url}
                      alt={`From ${contrib.contributor_name}`}
                      className="w-full object-cover max-h-[300px]"
                      loading="lazy"
                    />
                  </div>
                )}

                {contrib.message_text && (
                  <p className="text-gray-800 leading-relaxed mb-4 break-words">
                    &ldquo;{contrib.message_text}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-espresso">
                      {contrib.contributor_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-espresso">
                      {contrib.contributor_name}
                    </span>
                  </div>
                  {isCreator && (
                    <button
                      onClick={() => handleDeleteContribution(contrib)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-cocoa/30 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
                      title="Delete contribution"
                      data-pdf-hide
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Existing recipient reply */}
                {contrib.recipient_reply && (
                  <div className="mt-3 pt-3 border-t border-gray-200/60">
                    <p className="text-xs font-semibold text-cocoa/50 mb-1">
                      💛 {page.recipient_name}&apos;s reply
                    </p>
                    <p className="text-sm text-gray-700 italic break-words">
                      &ldquo;{contrib.recipient_reply}&rdquo;
                    </p>
                  </div>
                )}

                {/* Reply form — recipient only, when no reply yet */}
                {isRecipient && !isCreator && !contrib.recipient_reply && (
                  <div className="mt-3 pt-3 border-t border-gray-200/60" data-pdf-hide>
                    {replyingToId === contrib.id ? (
                      <div className="animate-fade-in">
                        <textarea
                          value={inlineReplyText}
                          onChange={(e) => setInlineReplyText(e.target.value.slice(0, 200))}
                          placeholder={`Say thanks to ${contrib.contributor_name}...`}
                          rows={2}
                          className="w-full input-warm resize-none text-sm mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setReplyingToId(null); setInlineReplyText(''); }}
                            className="flex-1 py-1.5 rounded-full text-xs border border-gray-300 text-cocoa"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveContributionReply(contrib.id)}
                            disabled={savingReply || !inlineReplyText.trim()}
                            className="flex-1 py-1.5 rounded-full text-xs bg-terracotta text-white disabled:opacity-50"
                          >
                            {savingReply ? 'Saving...' : 'Reply 💛'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReplyingToId(contrib.id); setInlineReplyText(''); }}
                        className="text-xs text-terracotta hover:text-terracotta/80 font-medium transition-colors"
                      >
                        Reply to {contrib.contributor_name}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        </div>{/* end PDF-capturable content area */}

        {/* Download PDF — gated on status */}
        {(isCreator || isRecipient) && contributions.length > 0 && (
          <div className="flex justify-center mt-10 mb-4" data-pdf-hide>
            {['thanked', 'complete'].includes(page.status) ? (
              <button
                onClick={handleDownloadPDF}
                disabled={pdfGenerating}
                className="py-3 px-6 rounded-full text-sm font-semibold border-2 border-gold text-gold transition-all hover:opacity-90 disabled:opacity-50"
              >
                {pdfGenerating ? '⏳ Generating PDF...' : 'Download PDF 📄'}
              </button>
            ) : page.status === 'revealed' ? (
              <p className="text-sm text-cocoa/60 italic">
                PDF will unlock after {page.recipient_name} leaves a thank you 💛
              </p>
            ) : null}
          </div>
        )}

        {/* Creator View: Simplified tools */}
        {isCreator && (
          <div className="mt-16 mb-10">
            <div className="max-w-[600px] mx-auto">
              <div className="glass rounded-3xl ios-shadow p-6 text-center">
                <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-3">CREATOR TOOLS</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => window.location.href = `/p/${slug}`}
                    className="flex-1 py-3 rounded-full text-sm font-semibold btn-gold"
                  >
                    ✍️ Add Your Contribution
                  </button>
                  <button
                    onClick={handleShareContributorLink}
                    className="flex-1 py-3 rounded-full text-sm font-semibold border-2 border-gold text-gold transition-all hover:opacity-90"
                  >
                    {shareFeedback || '📨 Ask Others to Contribute'}
                  </button>
                  <button
                    onClick={() => setShowQR(true)}
                    className="flex-1 py-3 rounded-full text-sm font-semibold border-2 border-cocoa/40 text-cocoa hover:border-cocoa transition-all"
                  >
                    📱 QR Code
                  </button>
                </div>
                {/* Desktop email option */}
                {!isMobile && (
                  <button
                    onClick={() => {
                      if (!page) return;
                      const url = `${window.location.origin}/p/${slug}`;
                      openEmailShare({
                        subject: `Help celebrate ${page.recipient_name}!`,
                        body: `Hi!\n\nI'm putting together a special keepsake for ${page.recipient_name}'s ${formatOccasion(page.template_type)} celebration. Would you add a message or photo?\n\nHere's the link: ${url}\n\nThanks!`,
                      });
                    }}
                    className="w-full mt-3 py-2 text-xs text-cocoa/50 hover:text-cocoa transition-colors"
                  >
                    ✉️ Or email this link to friends
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Replies Section — visible to everyone (read-only) */}
        {replies.length > 0 && !isCreator && (
          <div className="mt-16 mb-4">
            <div className="max-w-[600px] mx-auto text-center">
              <p className="text-xs font-semibold tracking-widest text-cocoa/60 mb-4">
                💛 {page.recipient_name.toUpperCase()}&apos;S REPLY
              </p>
              {replies.map((reply) => (
                <div key={reply.id} className="glass rounded-2xl ios-shadow p-6 mb-4">
                  <p className="text-cocoa italic break-words">&ldquo;{reply.reply_text}&rdquo;</p>
                  <p className="text-sm text-cocoa/60 mt-2">— {page.recipient_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recipient-Only: Say Thanks Form (only shows with ?recipient=true) */}
        {isRecipient && !isCreator && (
          <div className="mt-8 mb-10">
            <div className="max-w-[600px] mx-auto text-center">
              {!showReplyForm && !replySent && (
                <button
                  onClick={() => setShowReplyForm(true)}
                  className="btn-gold shadow-lg transition-all hover:scale-105"
                >
                  💛 Say Thanks to Everyone
                </button>
              )}

              {showReplyForm && !replySent && (
                <div className="glass rounded-3xl ios-shadow p-6 text-left animate-fade-in">
                  <h3 className="text-lg italic mb-4">
                    Say thanks to everyone
                  </h3>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                    placeholder="Thank you all so much..."
                    rows={4}
                    className="w-full input-warm resize-none mb-4"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReplyForm(false)}
                      className="flex-1 py-2 rounded-full border border-gray-300 text-cocoa text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendReply}
                      disabled={submittingReply || !replyText.trim()}
                      className="flex-1 py-2 rounded-full text-white text-sm font-semibold bg-terracotta disabled:opacity-50"
                    >
                      {submittingReply ? 'Sending...' : 'Send Reply 💛'}
                    </button>
                  </div>
                </div>
              )}

              {replySent && (
                <div className="glass rounded-3xl ios-shadow p-6 animate-scale-in">
                  <div className="text-4xl mb-2">💛</div>
                  <p className="font-semibold text-espresso italic">Your thanks has been sent!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200">
          {contributions.length > 0 && (
            <a
              href={`/p/${slug}/keepsake/print`}
              className="inline-flex items-center gap-2 mb-4 px-5 py-2.5 rounded-full text-sm font-medium text-cocoa border border-cocoa/20 hover:bg-cocoa/5 transition-colors"
            >
              🖨️ Print Keepsake
            </a>
          )}
          <p className="text-sm text-cocoa/60">
            Made with 💛 on <span className="font-semibold text-espresso">SendKindly</span>
          </p>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && page && (
        <QRCodeModal
          slug={slug}
          recipientName={page.recipient_name}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* PDF Toast */}
      {pdfToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="glass rounded-2xl ios-shadow px-6 py-3 text-sm font-medium text-espresso flex items-center gap-2">
            {pdfGenerating && (
              <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            )}
            {pdfToast}
          </div>
        </div>
      )}
    </div>
  );
}
