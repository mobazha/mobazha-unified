import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const { uploadImageMock, fileToBase64Mock } = vi.hoisted(() => ({
  uploadImageMock: vi.fn(),
  fileToBase64Mock: vi.fn(),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, string | number>) => {
        if (params) {
          return `${key}:${JSON.stringify(params)}`;
        }
        return key;
      },
    }),
    imagesApi: {
      fileToBase64: fileToBase64Mock,
      uploadImage: uploadImageMock,
    },
  };
});

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dispute-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="confirm-dialog">{children}</div> : null,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

import { DisputeModal, partitionEvidenceFiles } from '@/components/Order/modals/DisputeModal';

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('partitionEvidenceFiles', () => {
  it('accepts valid images within slot limit', () => {
    const files = [makeFile('a.png', 'image/png', 100), makeFile('b.jpg', 'image/jpeg', 200)];
    const result = partitionEvidenceFiles(files, 0);
    expect(result.accepted).toHaveLength(2);
    expect(result.rejectedCount).toBe(0);
  });

  it('rejects non-images and oversized files', () => {
    const files = [
      makeFile('doc.pdf', 'application/pdf', 100),
      makeFile('big.png', 'image/png', 11 * 1024 * 1024),
    ];
    const result = partitionEvidenceFiles(files, 0);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejectedCount).toBe(2);
  });

  it('counts overflow beyond max image count', () => {
    const files = Array.from({ length: 6 }, (_, i) => makeFile(`img-${i}.png`, 'image/png', 100));
    const result = partitionEvidenceFiles(files, 0);
    expect(result.accepted).toHaveLength(5);
    expect(result.rejectedCount).toBe(1);
  });
});

describe('DisputeModal', () => {
  beforeEach(() => {
    uploadImageMock.mockReset();
    fileToBase64Mock.mockReset();
    fileToBase64Mock.mockResolvedValue('base64-data');
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('keeps submit disabled until claim is filled', () => {
    render(<DisputeModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} vendorPeerID="QmVendor" />);

    const submit = screen.getByRole('button', { name: 'order.dispute.submit' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('order.dispute.placeholder'), {
      target: { value: 'test dispute' },
    });
    expect(submit).toBeEnabled();
  });

  it('allows submit when evidence upload failed', async () => {
    uploadImageMock.mockResolvedValue(null);

    render(<DisputeModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} vendorPeerID="QmVendor" />);

    fireEvent.change(screen.getByLabelText('order.dispute.placeholder'), {
      target: { value: 'test dispute' },
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('evidence.png', 'image/png', 128);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadImageMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      const submit = screen.getByRole('button', { name: 'order.dispute.submit' });
      expect(submit).toBeEnabled();
    });

    expect(screen.getByRole('alert')).toHaveTextContent('order.dispute.evidenceUploadFailed');
  });

  it('routes upload with store peer header', async () => {
    uploadImageMock.mockResolvedValue({
      small: 'QmEvidenceCid',
      original: 'QmEvidenceCid',
    });

    render(
      <DisputeModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} vendorPeerID="QmVendorPeer" />
    );

    fireEvent.change(screen.getByLabelText('order.dispute.placeholder'), {
      target: { value: 'test dispute' },
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile('evidence.png', 'image/png', 128)] },
    });

    await waitFor(() => {
      expect(uploadImageMock).toHaveBeenCalledWith(
        expect.objectContaining({ filename: expect.stringMatching(/^evidence_/) }),
        { 'X-Store-PeerID': 'QmVendorPeer' }
      );
    });
  });

  it('shows file rejection message for invalid selections', () => {
    render(<DisputeModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} vendorPeerID="QmVendor" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile('notes.txt', 'text/plain', 64)] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('order.dispute.evidenceFileRejected');
  });

  it('submits only successful evidence hashes', async () => {
    uploadImageMock.mockResolvedValue({
      small: 'QmHash1',
      original: 'QmHash1',
    });
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<DisputeModal isOpen onClose={vi.fn()} onSubmit={onSubmit} vendorPeerID="QmVendor" />);

    fireEvent.change(screen.getByLabelText('order.dispute.placeholder'), {
      target: { value: 'buyer claim' },
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile('evidence.png', 'image/png', 128)] },
    });

    await waitFor(() => {
      expect(screen.getByRole('status', { name: 'order.dispute.evidenceUploaded' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'order.dispute.submit' }));
    fireEvent.click(screen.getByRole('button', { name: 'order.dispute.confirm' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('buyer claim', ['QmHash1']);
    });
  });
});
