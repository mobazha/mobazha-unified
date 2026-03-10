'use client';

import { useEffect } from 'react';

/**
 * Sends the document height to the parent window via postMessage
 * so the parent can resize the iframe to fit the content.
 *
 * Parent usage:
 *   window.addEventListener('message', (e) => {
 *     if (e.data?.type === 'mobazha-embed-resize') {
 *       iframe.style.height = e.data.height + 'px';
 *     }
 *   });
 */
export function EmbedResizer() {
  useEffect(() => {
    function sendHeight() {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'mobazha-embed-resize', height }, '*');
    }

    sendHeight();

    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);

    return () => observer.disconnect();
  }, []);

  return null;
}
