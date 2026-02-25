'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { copyToClipboard } from '@/lib/clipboard';

interface QRCodeModalProps {
  slug: string;
  recipientName: string;
  onClose: () => void;
}

export default function QRCodeModal({ slug, recipientName, onClose }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${slug}`;

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleDownload = () => {
    const canvasEl = canvasRef.current?.querySelector('canvas');
    if (!canvasEl) return;

    const dataUrl = canvasEl.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `sendkindly-qr-${slug}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative glass rounded-3xl ios-shadow max-w-sm w-full p-8 animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-cocoa/40 hover:text-cocoa hover:bg-cocoa/10 transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-1">📱 QR CODE</p>
          <h2 className="text-xl italic">Share with a scan</h2>
          <p className="text-sm text-cocoa/60 mt-1">
            For {recipientName}&apos;s celebration
          </p>
        </div>

        {/* QR Code — SVG for display */}
        <div className="flex justify-center mb-4">
          <div className="bg-white rounded-2xl p-4 ios-shadow">
            <QRCodeSVG
              value={url}
              size={200}
              fgColor="#B76E4C"
              bgColor="#FFFFFF"
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Hidden canvas for PNG download */}
        <div ref={canvasRef} className="hidden">
          <QRCodeCanvas
            value={url}
            size={600}
            fgColor="#B76E4C"
            bgColor="#FFFFFF"
            level="M"
            includeMargin={true}
          />
        </div>

        {/* URL display */}
        <p className="text-center text-xs text-cocoa/50 mb-6 break-all px-2">
          {url}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleDownload}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            📥 Download QR
          </button>
          <button
            onClick={handleCopyLink}
            className={`w-full py-3 rounded-full text-sm font-semibold border-2 transition-all ${
              copied
                ? 'border-green-500 text-green-600'
                : 'border-gold text-gold hover:opacity-90'
            }`}
          >
            {copied ? '✅ Copied!' : '🔗 Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
