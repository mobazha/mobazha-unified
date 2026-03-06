'use client';

/**
 * ContactSection — PG-201
 *
 * Contact information card with optional fields.
 * Actual contact data comes from the seller's profile (passed via context);
 * this section controls which fields to show.
 */

import type { ContactSectionProps } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { Mail, Phone, Globe, Share2 } from 'lucide-react';

export function ContactSection({
  title,
  showEmail,
  showPhone,
  showWebsite,
  showSocial,
  customMessage,
}: ContactSectionProps) {
  const { t } = useI18n();
  const fields = [
    showEmail && {
      icon: Mail,
      label: t('admin.storeBranding.contactEmail'),
      placeholder: t('admin.storeBranding.contactEmailPlaceholder'),
    },
    showPhone && {
      icon: Phone,
      label: t('admin.storeBranding.contactPhone'),
      placeholder: t('admin.storeBranding.contactPhonePlaceholder'),
    },
    showWebsite && {
      icon: Globe,
      label: t('admin.storeBranding.contactWebsite'),
      placeholder: t('admin.storeBranding.contactWebsitePlaceholder'),
    },
    showSocial && {
      icon: Share2,
      label: t('admin.storeBranding.contactSocial'),
      placeholder: t('admin.storeBranding.contactSocialPlaceholder'),
    },
  ].filter(Boolean) as Array<{ icon: typeof Mail; label: string; placeholder: string }>;

  if (!fields.length && !customMessage) return null;

  return (
    <div className="py-4">
      <h2
        className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6"
        style={{ fontFamily: 'var(--store-font, inherit)' }}
      >
        {title}
      </h2>
      <div
        className="p-4 sm:p-6 border border-border"
        style={{ borderRadius: 'var(--store-radius, 8px)' }}
      >
        {customMessage && (
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{customMessage}</p>
        )}
        {fields.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(field => (
              <div
                key={field.label}
                className="flex items-center gap-3 text-sm min-h-[44px] sm:min-h-0"
              >
                <field.icon
                  className="w-5 h-5 sm:w-4 sm:h-4 shrink-0"
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
