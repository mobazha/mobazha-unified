'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, Grid } from '@/components/layouts';
import {
  collectionsApi,
  getImageUrl,
  useI18n,
  useUserStore,
  useStorefrontMode,
  getStorefrontPeerID,
} from '@mobazha/core';
import type { Collection } from '@mobazha/core';

export default function CollectionsPage() {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const standalone = useStorefrontMode();
  const peerId = standalone ? getStorefrontPeerID() || profile?.peerID || null : null;

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!peerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const items = await collectionsApi.listPublishedCollections(peerId, 1, 50);
        if (!cancelled) setCollections(items ?? []);
      } catch {
        /* empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peerId]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <Container size="xl" className="py-8">
          <h1 className="text-3xl font-bold mb-2">
            {t('footer.collections', { defaultValue: 'Collections' })}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('collections.browseAll', { defaultValue: 'Browse all collections' })}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p>{t('collections.empty', { defaultValue: 'No collections yet' })}</p>
            </div>
          ) : (
            <Grid cols={3} colsMobile={1} colsTablet={2} gap="lg">
              {collections.map(col => (
                <CollectionCard key={col.id} collection={col} />
              ))}
            </Grid>
          )}
        </Container>
      </div>
      <Footer />
    </>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const { t } = useI18n();
  const imgSrc = collection.image ? getImageUrl(collection.image) : null;
  const productCount = collection.products?.length ?? 0;

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group block border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      {imgSrc ? (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={imgSrc}
            alt={collection.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-muted flex items-center justify-center">
          <span className="text-4xl opacity-30">📦</span>
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-base">{collection.title}</h3>
        {collection.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {collection.description}
          </p>
        )}
        {productCount > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {t('admin.collections.productsCount', { count: productCount })}
          </p>
        )}
      </div>
    </Link>
  );
}
