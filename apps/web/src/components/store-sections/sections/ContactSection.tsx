/**
 * ContactSection — PG-201 (Server Component)
 *
 * Contact information card with optional fields.
 * Actual contact data comes from the seller's profile (passed via context);
 * this section controls which fields to show.
 */

import type { ContactSectionProps } from '@mobazha/core';
import { Mail, Phone, Globe, Share2 } from 'lucide-react';

export function ContactSection({
  title,
  showEmail,
  showPhone,
  showWebsite,
  showSocial,
  customMessage,
}: ContactSectionProps) {
  const fields = [
    showEmail && { icon: Mail, label: 'Email', placeholder: 'Contact via store chat' },
    showPhone && { icon: Phone, label: 'Phone', placeholder: 'Available upon request' },
    showWebsite && { icon: Globe, label: 'Website', placeholder: 'Visit our store page' },
    showSocial && { icon: Share2, label: 'Social', placeholder: 'Follow us for updates' },
  ].filter(Boolean) as Array<{ icon: typeof Mail; label: string; placeholder: string }>;

  if (!fields.length && !customMessage) return null;

  return (
    <div className="py-4">
      <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--store-font, inherit)' }}>
        {title}
      </h2>
      <div
        className="p-6 border border-border"
        style={{ borderRadius: 'var(--store-radius, 8px)' }}
      >
        {customMessage && (
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{customMessage}</p>
        )}
        {fields.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(field => (
              <div key={field.label} className="flex items-center gap-3 text-sm">
                <field.icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--store-primary)' }}
                />
                <div>
                  <div className="font-medium" style={{ fontFamily: 'var(--store-font, inherit)' }}>
                    {field.label}
                  </div>
                  <div className="text-muted-foreground text-xs">{field.placeholder}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
