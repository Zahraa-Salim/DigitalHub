import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { ShieldAlert } from 'lucide-react';
import type { AdminOverviewData } from '../../lib/api';

type SuperAdminPanelProps = {
  admins: NonNullable<AdminOverviewData['superAdmin']>['admins'];
};

function relative(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return iso;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function SuperAdminPanel({ admins }: SuperAdminPanelProps) {
  return (
    <Card className="border-purple-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-4 bg-purple-50/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-purple-600" />
          <CardTitle className="text-purple-900">
            Super Admin Controls
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 font-medium">Admin Name</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.length === 0 ? (
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500" colSpan={4}>
                    No admin users found.
                  </td>
                </tr>
              ) : admins.map((admin) => (
                <tr key={admin.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {admin.name}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{admin.role}</td>
                  <td className="px-6 py-3">
                    <Badge
                      variant={admin.is_active ? 'green' : 'gray'}
                    >
                      {admin.is_active ? 'active' : 'disabled'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-500">
                    {relative(admin.last_login_at)}
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
