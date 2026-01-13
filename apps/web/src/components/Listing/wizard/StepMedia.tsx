'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Image as ImageIcon, Video } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MediaSection } from '../MediaSection';
import type { StepProps } from './types';

/**
 * 步骤4：媒体（图片和视频）
 */
export function StepMedia({ formData, updateField, onNext, onPrev }: StepProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('listing.wizard.media') || '图片和视频'}
        </h2>
        <p className="text-muted-foreground">
          {t('listing.wizard.mediaDesc') || '上传商品图片和视频（可选）'}
        </p>
      </div>

      {/* 提示信息 */}
      <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="w-4 h-4" />
          <span>{t('listing.wizard.maxImages') || '最多 30 张图片'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Video className="w-4 h-4" />
          <span>{t('listing.wizard.videoSupport') || '支持 YouTube/Vimeo 链接'}</span>
        </div>
      </div>

      {/* 媒体上传组件 */}
      <Card className="p-6">
        <MediaSection
          images={formData.images}
          introVideo={formData.introVideo}
          altIntroVideoLinks={formData.altIntroVideoLinks}
          onImagesChange={images => updateField('images', images)}
          onVideoChange={video => updateField('introVideo', video)}
          onAltVideoLinksChange={links => updateField('altIntroVideoLinks', links)}
        />
      </Card>

      {/* 导航按钮 */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.prev') || '上一步'}
        </Button>
        <Button onClick={onNext}>
          {t('common.next') || '下一步'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

export default StepMedia;
