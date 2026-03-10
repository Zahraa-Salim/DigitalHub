// File: frontend/src/dashboard/components/overview-mock/MessagingHealthPanel.tsx
// Purpose: Renders the mock overview messaging health panel panel for the dashboard.
// It exists to prototype overview layouts and states without live data wiring.

import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Mail, MessageCircle } from 'lucide-react';
import type { AdminOverviewData } from '../../lib/api';

type MessagingHealthPanelProps = {
  messagingHealth: AdminOverviewData['messagingHealth'];
  onOpenMessages?: (channel: 'all' | 'email' | 'whatsapp', status: 'draft' | 'sent' | 'failed') => void;
  onRetryFailed?: (channel: 'all' | 'email' | 'whatsapp') => void;
  retryingChannel?: 'all' | 'email' | 'whatsapp' | null;
};

export function MessagingHealthPanel({
  messagingHealth,
  onOpenMessages,
  onRetryFailed,
  retryingChannel = null,
}: MessagingHealthPanelProps) {
  const totalDraft = messagingHealth.email.draft + messagingHealth.whatsapp.draft;
  const totalSent = messagingHealth.email.sent + messagingHealth.whatsapp.sent;
  const totalFailed = messagingHealth.email.failed + messagingHealth.whatsapp.failed;

  const rows: Array<{
    key: 'email' | 'whatsapp' | 'all';
    label: string;
    icon?: ReactNode;
    draft: number;
    sent: number;
    failed: number;
  }> = [
    {
      key: 'email',
      label: 'Email',
      icon: <Mail className="w-4 h-4 text-gray-400" />,
      draft: messagingHealth.email.draft,
      sent: messagingHealth.email.sent,
      failed: messagingHealth.email.failed,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <MessageCircle className="w-4 h-4 text-green-500" />,
      draft: messagingHealth.whatsapp.draft,
      sent: messagingHealth.whatsapp.sent,
      failed: messagingHealth.whatsapp.failed,
    },
    {
      key: 'all',
      label: 'All Channels',
      draft: totalDraft,
      sent: totalSent,
      failed: totalFailed,
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle>Messaging Delivery Health</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 font-medium">Channel</th>
                <th className="px-6 py-3 font-medium text-center">Draft</th>
                <th className="px-6 py-3 font-medium text-center">Sent</th>
                <th className="px-6 py-3 font-medium text-center">Failed</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr className="hover:bg-gray-50" key={row.key}>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <span className="inline-flex items-center gap-2">
                      {row.icon}
                      {row.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      className="bg-transparent border-0 p-0 font-medium text-slate-600 hover:underline"
                      onClick={() => onOpenMessages?.(row.key, 'draft')}
                    >
                      {row.draft}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      className="bg-transparent border-0 p-0 font-medium text-green-600 hover:underline"
                      onClick={() => onOpenMessages?.(row.key, 'sent')}
                    >
                      {row.sent}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center border-0 px-2 py-1 text-xs font-bold leading-none text-red-700 bg-red-100 rounded-full hover:bg-red-200"
                      onClick={() => onOpenMessages?.(row.key, 'failed')}
                    >
                      {row.failed}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 h-8 px-2"
                      isLoading={retryingChannel === row.key}
                      disabled={row.failed <= 0}
                      onClick={() => onRetryFailed?.(row.key)}
                    >
                      Resend Failed
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

