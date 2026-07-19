// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { expect, test } from '@playwright/test';
import * as path from 'path';
import {
  PRECOVER_INIT,
  focusOn,
  loginRecordedContext,
  reveal,
  saveSegment,
  showCard,
  showChapter,
  showEndCard,
} from './demo-film-harness';

const ORDER_ID = process.env.DEMO_ESCROW_ORDER_ID || '';
const OUT_DIR = path.join(__dirname, '..', 'demo-output', 'escrow-dispute-resolution');
const BUYER = { label: 'Buyer · Jordan', accent: '#059669' };
const MODERATOR = { label: 'Moderator · Morgan', accent: '#7c3aed' };

test('Demo 0006: escrow dispute resolution', async ({ browser }) => {
  test.setTimeout(10 * 60 * 1000);
  expect(ORDER_ID, 'DEMO_ESCROW_ORDER_ID is required').toBeTruthy();

  const buyerContext = await loginRecordedContext(browser, OUT_DIR, 'testuser2', 1.05, '/orders');
  const moderatorContext = await loginRecordedContext(
    browser,
    OUT_DIR,
    'testuser3',
    1.05,
    '/cases'
  );

  const evidence = await buyerContext.newPage();
  await evidence.addInitScript(PRECOVER_INIT);
  await evidence.goto(`/orders/${encodeURIComponent(ORDER_ID)}?role=purchase&tab=dispute`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  const disputeSummary = evidence.getByTestId('order-dispute-summary');
  await expect(disputeSummary).toBeVisible({ timeout: 60000 });
  const protectionStatus = evidence.getByTestId('order-protection-status');
  await expect(protectionStatus).toBeVisible({ timeout: 60000 });
  await showCard(
    evidence,
    'A protected order has a real disagreement.',
    'The payment stays in the Safe while evidence and a neutral ruling remain attached to one order.'
  );
  await showChapter(
    evidence,
    1,
    BUYER,
    'Open one evidence-backed case',
    'The claim, item, payment, and uploaded photo remain together.'
  );
  await focusOn(disputeSummary, 4200);
  await showChapter(
    evidence,
    2,
    BUYER,
    'Keep funds protected during review',
    'Neither party can silently rewrite the order or take the full balance.'
  );
  await focusOn(protectionStatus, 3200);
  await saveSegment(evidence, OUT_DIR, 'seg1-buyer-evidence');

  const ruling = await moderatorContext.newPage();
  await ruling.addInitScript(PRECOVER_INIT);
  await ruling.goto(`/orders/${encodeURIComponent(ORDER_ID)}?tab=dispute`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(ruling.getByTestId('dispute-open-ruling')).toBeVisible({ timeout: 60000 });
  await reveal(ruling);
  await showChapter(
    ruling,
    3,
    MODERATOR,
    'Review the same order and evidence',
    'The moderator works from the shared case record—not a separate support ticket.'
  );
  const disputeOverview = ruling.getByText('Dispute Overview', { exact: true });
  await expect(disputeOverview).toBeVisible();
  await focusOn(disputeOverview, 3200);
  await ruling.getByTestId('dispute-open-ruling').click();
  const buyerPercentage = ruling.getByTestId('moderator-ruling-buyer-pct');
  const sellerPercentage = ruling.getByTestId('moderator-ruling-seller-pct');
  await expect(buyerPercentage).toBeVisible();
  const splitPreset = ruling.getByTestId('moderator-ruling-chip-split');
  if (await splitPreset.isVisible().catch(() => false)) await splitPreset.click();
  await buyerPercentage.fill('60');
  await sellerPercentage.fill('40');
  await ruling
    .getByTestId('moderator-ruling-resolution')
    .fill('Evidence supports a partial refund: release 60% to the buyer and 40% to the seller.');
  await showChapter(
    ruling,
    4,
    MODERATOR,
    'Record a 60 / 40 ruling',
    'The allocation and written reasoning become part of the case before settlement.'
  );
  await focusOn(ruling.getByTestId('moderator-ruling-resolution'), 3500);
  await ruling.getByTestId('moderator-ruling-submit').click();
  await expect(ruling.getByTestId('order-dispute-ruling')).toBeVisible({ timeout: 90000 });
  await showChapter(
    ruling,
    5,
    MODERATOR,
    'Publish one auditable decision',
    'Both parties now see the same percentages and reason on the original order.'
  );
  await focusOn(ruling.getByTestId('order-dispute-ruling'), 4200);
  await saveSegment(ruling, OUT_DIR, 'seg2-moderator-ruling');

  const payout = await buyerContext.newPage();
  await payout.addInitScript(PRECOVER_INIT);
  await payout.goto(`/orders/${encodeURIComponent(ORDER_ID)}?role=purchase&tab=dispute`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(payout.getByTestId('order-dispute-ruling')).toBeVisible({ timeout: 90000 });
  await reveal(payout);
  await showChapter(
    payout,
    6,
    BUYER,
    'Verify the ruling before release',
    '60% returns to the buyer; 40% goes to the seller from the same protected balance.'
  );
  await focusOn(payout.getByTestId('order-dispute-ruling'), 4200);
  const acceptPayout = payout.getByTestId('order-action-acceptpayout');
  await expect(acceptPayout).toBeVisible({ timeout: 60000 });
  await acceptPayout.click();
  const payoutDialog = payout.getByTestId('accept-payout-dialog');
  await expect(payoutDialog).toBeVisible();
  await showChapter(
    payout,
    7,
    BUYER,
    'Accept the protected payout',
    'Mobazha submits the authorized dispute release and waits for the real transaction.'
  );
  await focusOn(payoutDialog, 3200);
  await payoutDialog.getByRole('button', { name: /accept payout/i }).click();
  await expect(payoutDialog).toBeHidden({ timeout: 150000 });
  await expect(payout.getByTestId('order-status-card')).toContainText(
    /transaction complete|funds released/i,
    {
      timeout: 90000,
    }
  );
  await showChapter(
    payout,
    8,
    BUYER,
    'Close the case on-chain',
    'The order is resolved only after the Safe payout action completes.'
  );
  await focusOn(payout.getByTestId('order-status-card'), 4200);
  await saveSegment(payout, OUT_DIR, 'seg3-safe-release');

  const payoff = await buyerContext.newPage();
  await payoff.addInitScript(PRECOVER_INIT);
  await payoff.goto(`/orders/${encodeURIComponent(ORDER_ID)}?role=purchase&tab=dispute`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(payoff.getByTestId('order-status-card')).toContainText(
    /transaction complete|funds released/i,
    { timeout: 60000 }
  );
  await expect(payoff.getByTestId('order-dispute-ruling')).toBeVisible();
  await reveal(payoff);
  await showChapter(
    payoff,
    9,
    BUYER,
    'Keep the full resolution trail',
    'Evidence recorded · 60 / 40 ruling · Safe payout released · Case resolved.'
  );
  await focusOn(payoff.getByTestId('order-dispute-ruling'), 5000);
  await showEndCard(
    payoff,
    'Mobazha',
    'Evidence to ruling to payout—on one protected order.\nmobazha.org · recorded on Mobazha test network'
  );
  await saveSegment(payoff, OUT_DIR, 'seg4-resolved-payoff');

  await buyerContext.close();
  await moderatorContext.close();
});
