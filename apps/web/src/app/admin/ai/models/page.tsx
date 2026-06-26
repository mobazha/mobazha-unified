'use client';

import { AIConfigSection } from '@/app/admin/settings/integrations/AIConfigSection';

export default function AIModelsPage() {
  return (
    <div data-testid="admin-ai-models">
      <AIConfigSection settingsPageLayout />
    </div>
  );
}
