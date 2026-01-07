'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Input } from '@/components/ui/input-compat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { toast } from '@/components/ui/use-toast';

interface DisputeCase {
  caseId: string;
  orderId: string;
  state: 'OPEN' | 'PENDING' | 'RESOLVED' | 'EXPIRED' | 'DECIDED';
  timestamp: string;
  total: number;
  coin: string;
  title: string;
  thumbnail: string;
  buyer: {
    peerID: string;
    name: string;
    avatar?: string;
  };
  seller: {
    peerID: string;
    name: string;
    avatar?: string;
  };
  claim: string;
  sellerResponse?: string;
  evidence: Array<{
    id: string;
    type: 'image' | 'text' | 'document';
    content: string;
    submittedBy: 'buyer' | 'seller';
    timestamp: string;
  }>;
  messages: Array<{
    id: string;
    sender: 'buyer' | 'seller' | 'moderator';
    senderName: string;
    content: string;
    timestamp: string;
  }>;
  buyerOpened: boolean;
}

// Mock case data
const mockCase: DisputeCase = {
  caseId: 'CASE-001',
  orderId: 'ORD-2024-0001',
  state: 'OPEN',
  timestamp: new Date(Date.now() - 86400000).toISOString(),
  total: 189.99,
  coin: 'USDT',
  title: 'Vintage Film Camera - Collector Edition',
  thumbnail: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop',
  buyer: {
    peerID: 'QmBuyer001',
    name: 'John Buyer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=buyer1',
  },
  seller: {
    peerID: 'QmVendor789',
    name: 'Retro Finds',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=retro',
  },
  claim:
    'Item not as described. The camera arrived with significant scratches on the body and lens that were not shown or mentioned in the listing photos. The seller claimed it was in "excellent condition" but it appears heavily used.',
  sellerResponse:
    'The camera was packed carefully and was in excellent condition when shipped. The scratches may have occurred during transit. I have photos of the camera before shipping.',
  evidence: [
    {
      id: 'ev1',
      type: 'image',
      content: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop',
      submittedBy: 'buyer',
      timestamp: new Date(Date.now() - 82800000).toISOString(),
    },
    {
      id: 'ev2',
      type: 'text',
      content:
        'Attached photo shows the scratches on arrival. The box was not damaged, so this damage existed before shipping.',
      submittedBy: 'buyer',
      timestamp: new Date(Date.now() - 82700000).toISOString(),
    },
    {
      id: 'ev3',
      type: 'image',
      content: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop',
      submittedBy: 'seller',
      timestamp: new Date(Date.now() - 72000000).toISOString(),
    },
    {
      id: 'ev4',
      type: 'text',
      content:
        'Photo of camera before shipping - no scratches visible. I always take photos before packaging.',
      submittedBy: 'seller',
      timestamp: new Date(Date.now() - 71900000).toISOString(),
    },
  ],
  messages: [
    {
      id: 'msg1',
      sender: 'buyer',
      senderName: 'John Buyer',
      content: 'I opened this dispute because the camera is damaged.',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'msg2',
      sender: 'seller',
      senderName: 'Retro Finds',
      content: 'I am sorry to hear that. Can you provide photos of the damage and the packaging?',
      timestamp: new Date(Date.now() - 82800000).toISOString(),
    },
    {
      id: 'msg3',
      sender: 'buyer',
      senderName: 'John Buyer',
      content: 'Photos uploaded. The box was fine, camera was not.',
      timestamp: new Date(Date.now() - 82600000).toISOString(),
    },
  ],
  buyerOpened: true,
};

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  // orderId is available from params
  void orderId;

  const [caseData, setCaseData] = useState<DisputeCase>(mockCase);
  const [isLoading, setIsLoading] = useState(false);
  const [buyerPercentage, setBuyerPercentage] = useState(50);
  const [vendorPercentage, setVendorPercentage] = useState(50);
  const [resolution, setResolution] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePercentageChange = useCallback((type: 'buyer' | 'vendor', value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    if (type === 'buyer') {
      setBuyerPercentage(clampedValue);
      setVendorPercentage(100 - clampedValue);
    } else {
      setVendorPercentage(clampedValue);
      setBuyerPercentage(100 - clampedValue);
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;

    setCaseData(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: `msg-${Date.now()}`,
          sender: 'moderator',
          senderName: 'Moderator',
          content: newMessage,
          timestamp: new Date().toISOString(),
        },
      ],
    }));
    setNewMessage('');
    toast({ title: 'Message sent', description: 'Your message has been sent to both parties.' });
  }, [newMessage]);

  const handleResolveDispute = useCallback(async () => {
    if (!resolution.trim()) {
      toast({
        title: 'Resolution required',
        description: 'Please provide a resolution explanation.',
        variant: 'destructive',
      });
      return;
    }

    setShowConfirmDialog(false);
    setIsLoading(true);

    try {
      // TODO: Call API to resolve dispute
      await new Promise(resolve => setTimeout(resolve, 1500));

      setCaseData(prev => ({
        ...prev,
        state: 'DECIDED',
      }));

      toast({
        title: 'Dispute Resolved',
        description: `Funds distributed: ${buyerPercentage}% to buyer, ${vendorPercentage}% to seller.`,
      });

      // Redirect after short delay
      setTimeout(() => router.push('/moderator/cases'), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resolve dispute: ' + (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [resolution, buyerPercentage, vendorPercentage, router]);

  const quickDecisions = [
    { label: 'Full Refund to Buyer', buyer: 100, vendor: 0 },
    { label: 'Full Payment to Seller', buyer: 0, vendor: 100 },
    { label: 'Split 50/50', buyer: 50, vendor: 50 },
    { label: 'Split 75/25 (Buyer)', buyer: 75, vendor: 25 },
    { label: 'Split 25/75 (Seller)', buyer: 25, vendor: 75 },
  ];

  const isResolved = ['RESOLVED', 'DECIDED', 'EXPIRED'].includes(caseData.state);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container size="xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Cases
          </button>

          {/* Case Header */}
          <Card className="mb-6">
            <HStack justify="between" align="start" className="flex-wrap gap-4 mb-6">
              <div>
                <HStack gap="md" align="center" className="mb-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Case #{caseData.caseId}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
                      caseData.state === 'OPEN'
                        ? 'bg-red-500'
                        : caseData.state === 'PENDING'
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                    }`}
                  >
                    {caseData.state}
                  </span>
                </HStack>
                <p className="text-slate-500">
                  Order: {caseData.orderId} • Opened {formatDate(caseData.timestamp)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {caseData.total} {caseData.coin}
                </p>
                <p className="text-sm text-slate-500">Amount in escrow</p>
              </div>
            </HStack>

            {/* Product Info */}
            <HStack
              gap="lg"
              align="start"
              className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              <img
                src={caseData.thumbnail}
                alt={caseData.title}
                className="w-24 h-24 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  {caseData.title}
                </h3>
                <HStack gap="md" className="text-sm text-slate-500">
                  <span>Opened by: {caseData.buyerOpened ? 'Buyer' : 'Seller'}</span>
                </HStack>
              </div>
            </HStack>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Buyer Claim */}
              <Card>
                <HStack gap="md" align="start" className="mb-4">
                  <Avatar src={caseData.buyer.avatar} name={caseData.buyer.name} size="md" />
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {caseData.buyer.name}
                      <span className="ml-2 text-sm font-normal text-red-500">
                        (Buyer - Opened Dispute)
                      </span>
                    </h3>
                    <p className="text-sm text-slate-500">{caseData.buyer.peerID}</p>
                  </div>
                </HStack>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
                  <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Claim</h4>
                  <p className="text-slate-700 dark:text-slate-300">{caseData.claim}</p>
                </div>
              </Card>

              {/* Seller Response */}
              <Card>
                <HStack gap="md" align="start" className="mb-4">
                  <Avatar src={caseData.seller.avatar} name={caseData.seller.name} size="md" />
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {caseData.seller.name}
                      <span className="ml-2 text-sm font-normal text-blue-500">(Seller)</span>
                    </h3>
                    <p className="text-sm text-slate-500">{caseData.seller.peerID}</p>
                  </div>
                </HStack>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
                  <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Response</h4>
                  <p className="text-slate-700 dark:text-slate-300">
                    {caseData.sellerResponse || 'No response yet'}
                  </p>
                </div>
              </Card>

              {/* Evidence */}
              <Card>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Evidence Submitted
                </h2>
                <VStack gap="md">
                  {caseData.evidence.map(ev => (
                    <div
                      key={ev.id}
                      className={`p-4 rounded-lg ${
                        ev.submittedBy === 'buyer'
                          ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-300'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-300'
                      }`}
                    >
                      <HStack justify="between" className="mb-2">
                        <span
                          className={`text-sm font-medium ${
                            ev.submittedBy === 'buyer' ? 'text-red-600' : 'text-blue-600'
                          }`}
                        >
                          From {ev.submittedBy === 'buyer' ? 'Buyer' : 'Seller'}
                        </span>
                        <span className="text-xs text-slate-500">{formatDate(ev.timestamp)}</span>
                      </HStack>
                      {ev.type === 'image' ? (
                        <img
                          src={ev.content}
                          alt="Evidence"
                          className="w-full max-w-sm rounded-lg"
                        />
                      ) : (
                        <p className="text-slate-700 dark:text-slate-300">{ev.content}</p>
                      )}
                    </div>
                  ))}
                </VStack>
              </Card>

              {/* Messages */}
              <Card>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Discussion
                </h2>
                <VStack gap="md" className="mb-4 max-h-64 overflow-y-auto">
                  {caseData.messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.sender === 'moderator'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : msg.sender === 'buyer'
                            ? 'bg-red-50 dark:bg-red-900/10'
                            : 'bg-blue-50 dark:bg-blue-900/10'
                      }`}
                    >
                      <HStack justify="between" className="mb-1">
                        <span
                          className={`text-sm font-medium ${
                            msg.sender === 'moderator'
                              ? 'text-emerald-600'
                              : msg.sender === 'buyer'
                                ? 'text-red-600'
                                : 'text-blue-600'
                          }`}
                        >
                          {msg.senderName}
                          {msg.sender === 'moderator' && ' (Moderator)'}
                        </span>
                        <span className="text-xs text-slate-500">{formatDate(msg.timestamp)}</span>
                      </HStack>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{msg.content}</p>
                    </div>
                  ))}
                </VStack>

                {!isResolved && (
                  <HStack gap="sm">
                    <Input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Send a message to both parties..."
                      className="flex-1"
                      onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage}>Send</Button>
                  </HStack>
                )}
              </Card>
            </div>

            {/* Sidebar - Resolution Panel */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  {isResolved ? 'Case Resolution' : 'Make Decision'}
                </h2>

                {isResolved ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      This case has been resolved.
                    </p>
                  </div>
                ) : (
                  <VStack gap="lg">
                    {/* Quick Decisions */}
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                        Quick Decisions
                      </label>
                      <VStack gap="sm">
                        {quickDecisions.map((decision, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setBuyerPercentage(decision.buyer);
                              setVendorPercentage(decision.vendor);
                            }}
                            className={`w-full p-2 text-sm rounded-lg border transition-colors text-left ${
                              buyerPercentage === decision.buyer &&
                              vendorPercentage === decision.vendor
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                            }`}
                          >
                            {decision.label}
                          </button>
                        ))}
                      </VStack>
                    </div>

                    {/* Custom Split */}
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                        Custom Split
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-slate-500">Buyer %</label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={buyerPercentage}
                            onChange={e =>
                              handlePercentageChange('buyer', parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Seller %</label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={vendorPercentage}
                            onChange={e =>
                              handlePercentageChange('vendor', parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div className="mt-3 h-4 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex">
                        <div
                          className="bg-red-500 transition-all"
                          style={{ width: `${buyerPercentage}%` }}
                        />
                        <div
                          className="bg-blue-500 transition-all"
                          style={{ width: `${vendorPercentage}%` }}
                        />
                      </div>
                      <HStack justify="between" className="mt-1 text-xs text-slate-500">
                        <span>
                          Buyer: {((caseData.total * buyerPercentage) / 100).toFixed(2)}{' '}
                          {caseData.coin}
                        </span>
                        <span>
                          Seller: {((caseData.total * vendorPercentage) / 100).toFixed(2)}{' '}
                          {caseData.coin}
                        </span>
                      </HStack>
                    </div>

                    {/* Resolution Explanation */}
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                        Resolution Explanation *
                      </label>
                      <textarea
                        value={resolution}
                        onChange={e => setResolution(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        placeholder="Explain your decision..."
                      />
                    </div>

                    {/* Submit */}
                    <Button
                      className="w-full"
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Resolve Dispute'}
                    </Button>
                  </VStack>
                )}
              </Card>
            </div>
          </div>
        </Container>
      </main>

      <Footer />

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Resolution</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                You are about to resolve this dispute with the following distribution:
              </p>
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4">
                <p className="text-slate-900 dark:text-white">
                  <strong>Buyer:</strong> {buyerPercentage}% (
                  {((caseData.total * buyerPercentage) / 100).toFixed(2)} {caseData.coin})
                </p>
                <p className="text-slate-900 dark:text-white">
                  <strong>Seller:</strong> {vendorPercentage}% (
                  {((caseData.total * vendorPercentage) / 100).toFixed(2)} {caseData.coin})
                </p>
              </div>
              <p className="text-sm text-slate-500">
                This action cannot be undone. The funds will be released according to this decision.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolveDispute}>Confirm Resolution</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
