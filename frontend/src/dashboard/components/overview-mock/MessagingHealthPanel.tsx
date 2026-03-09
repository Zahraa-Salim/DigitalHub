import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Mail, MessageCircle } from 'lucide-react';
import type { AdminOverviewData } from '../../lib/api';

type MessagingHealthPanelProps = {
  messagingHealth: AdminOverviewData['messagingHealth'];
  onViewMessages?: (channel: 'email' | 'whatsapp', status: 'sent' | 'failed') => void;
};

export function MessagingHealthPanel({
  messagingHealth,
  onViewMessages,
}: MessagingHealthPanelProps) {
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
                <th className="px-6 py-3 font-medium text-center">Sent</th>
                <th className="px-6 py-3 font-medium text-center">Failed</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" /> Email
                </td>
                <td className="px-6 py-4 text-center text-green-600 font-medium">
                  {messagingHealth.email.sent}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-700 bg-red-100 rounded-full">
                    {messagingHealth.email.failed}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 h-8 px-2"
                      onClick={() => onViewMessages?.('email', 'sent')}
                    >
                      See Sent
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 h-8 px-2"
                      onClick={() => onViewMessages?.('email', 'failed')}
                    >
                      See Failed
                    </Button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp
                </td>
                <td className="px-6 py-4 text-center text-green-600 font-medium">
                  {messagingHealth.whatsapp.sent}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-700 bg-red-100 rounded-full">
                    {messagingHealth.whatsapp.failed}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 h-8 px-2"
                      onClick={() => onViewMessages?.('whatsapp', 'sent')}
                    >
                      See Sent
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 h-8 px-2"
                      onClick={() => onViewMessages?.('whatsapp', 'failed')}
                    >
                      See Failed
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
