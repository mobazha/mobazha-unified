'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input-compat';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Key,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  Users,
  Package,
} from 'lucide-react';

interface EncryptionKey {
  id: string;
  name: string;
  type: 'master' | 'product_group' | 'user_authorized';
  fingerprint: string;
  createdAt: string;
  expiresAt?: string;
  linkedTo?: string; // 关联的产品组或用户
  status: 'active' | 'expired' | 'revoked';
}

// Mock 密钥数据
const mockKeys: EncryptionKey[] = [
  {
    id: 'key1',
    name: 'Listing Master Key',
    type: 'master',
    fingerprint: 'A1B2 C3D4 E5F6 7890',
    createdAt: '2024-01-01T00:00:00Z',
    status: 'active',
  },
  {
    id: 'key2',
    name: 'VIP Products Key',
    type: 'product_group',
    fingerprint: 'B2C3 D4E5 F678 9012',
    createdAt: '2024-01-15T00:00:00Z',
    linkedTo: 'VIP Collection',
    status: 'active',
  },
  {
    id: 'key3',
    name: 'Premium Members Key',
    type: 'product_group',
    fingerprint: 'C3D4 E5F6 7890 1234',
    createdAt: '2024-01-20T00:00:00Z',
    linkedTo: 'Premium Products',
    status: 'active',
  },
  {
    id: 'key4',
    name: 'User: CryptoEnthusiast',
    type: 'user_authorized',
    fingerprint: 'D4E5 F678 9012 3456',
    createdAt: '2024-02-01T00:00:00Z',
    expiresAt: '2025-02-01T00:00:00Z',
    linkedTo: 'CryptoEnthusiast',
    status: 'active',
  },
];

export default function KeyManagementPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState(mockKeys);
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [autoEncrypt, setAutoEncrypt] = useState(true);
  const [showRevokeDialog, setShowRevokeDialog] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const masterKey = 'test-only-key';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(masterKey);
    toast({
      title: '已复制',
      description: '主密钥已复制到剪贴板',
    });
  };

  const handleExportKeys = () => {
    toast({
      title: '导出密钥',
      description: '密钥备份文件已下载',
    });
  };

  const handleImportKeys = () => {
    toast({
      title: '导入密钥',
      description: '请选择密钥备份文件',
    });
  };

  const handleRevokeKey = (keyId: string) => {
    setKeys(prev =>
      prev.map(key => (key.id === keyId ? { ...key, status: 'revoked' as const } : key))
    );
    setShowRevokeDialog(null);
    toast({
      title: '密钥已撤销',
      description: '该密钥已被撤销，相关用户将无法访问加密内容',
      variant: 'destructive',
    });
  };

  const handleRegenerateMasterKey = () => {
    setShowRegenerateDialog(false);
    toast({
      title: '主密钥已重新生成',
      description: '请务必备份新密钥，旧密钥将不再有效',
    });
  };

  const getKeyTypeLabel = (type: EncryptionKey['type']) => {
    switch (type) {
      case 'master':
        return { label: '主密钥', icon: Shield, color: 'bg-warning/15 text-warning' };
      case 'product_group':
        return { label: '产品组密钥', icon: Package, color: 'bg-primary/15 text-primary' };
      case 'user_authorized':
        return { label: '用户授权密钥', icon: Users, color: 'bg-info/15 text-info' };
    }
  };

  const getStatusBadge = (status: EncryptionKey['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-primary/10 text-primary">活跃</Badge>;
      case 'expired':
        return <Badge variant="secondary">已过期</Badge>;
      case 'revoked':
        return <Badge variant="destructive">已撤销</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/settings" className="p-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">密钥管理</h1>
            <p className="text-muted-foreground">管理端到端加密密钥</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 加密设置 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">加密设置</CardTitle>
                  <CardDescription>控制商品信息的端到端加密</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">启用商品加密</h4>
                  <p className="text-sm text-muted-foreground">对商品信息进行端到端加密</p>
                </div>
                <Switch checked={encryptionEnabled} onCheckedChange={setEncryptionEnabled} />
              </div>

              {encryptionEnabled && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">自动加密新商品</h4>
                    <p className="text-sm text-muted-foreground">新创建的商品自动启用加密</p>
                  </div>
                  <Switch checked={autoEncrypt} onCheckedChange={setAutoEncrypt} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 主密钥 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-warning" />
                  <div>
                    <CardTitle className="text-lg">主密钥 (Listing Master Key)</CardTitle>
                    <CardDescription>用于加密所有商品信息的主密钥</CardDescription>
                  </div>
                </div>
                <Badge className="bg-warning/15 text-warning">主要</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground mb-2 block">主密钥</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showMasterKey ? 'text' : 'password'}
                    value={masterKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowMasterKey(!showMasterKey)}
                  >
                    {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleCopyKey}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleExportKeys}>
                  <Download className="w-4 h-4 mr-2" />
                  导出备份
                </Button>
                <Button variant="outline" size="sm" onClick={handleImportKeys}>
                  <Upload className="w-4 h-4 mr-2" />
                  导入密钥
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-warning hover:text-warning"
                  onClick={() => setShowRegenerateDialog(true)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新生成
                </Button>
              </div>

              <div className="p-3 bg-warning/8 border border-warning/20 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                  <p className="text-sm text-warning">
                    请务必备份您的主密钥。如果丢失，您将无法解密已加密的商品信息。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 派生密钥列表 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-info" />
                  <div>
                    <CardTitle className="text-lg">派生密钥</CardTitle>
                    <CardDescription>产品组和用户授权密钥</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Key className="w-4 h-4 mr-2" />
                  创建密钥
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {keys
                  .filter(key => key.type !== 'master')
                  .map(key => {
                    const typeInfo = getKeyTypeLabel(key.type);
                    const TypeIcon = typeInfo.icon;

                    return (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.color}`}
                          >
                            <TypeIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{key.name}</h4>
                              {getStatusBadge(key.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              指纹: {key.fingerprint}
                              {key.linkedTo && ` • 关联: ${key.linkedTo}`}
                            </p>
                            <p className="text-xs text-muted-foreground/70">
                              创建于 {new Date(key.createdAt).toLocaleDateString()}
                              {key.expiresAt &&
                                ` • 过期时间: ${new Date(key.expiresAt).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            详情
                          </Button>
                          {key.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-error hover:text-error"
                              onClick={() => setShowRevokeDialog(key.id)}
                            >
                              撤销
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {keys.filter(key => key.type !== 'master').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无派生密钥</p>
                  <p className="text-sm">创建产品组或授权用户时会自动生成密钥</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 密钥层级说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">密钥层级结构</CardTitle>
              <CardDescription>了解不同类型密钥的作用和关系</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-warning/8 rounded-lg">
                  <Shield className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-warning">Listing Master Key (LMK)</h4>
                    <p className="text-sm text-warning">
                      主密钥，用于派生所有其他密钥。只有店主持有，丢失将无法恢复。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-primary/8 rounded-lg">
                  <Package className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-primary">Product Group Key (PGK)</h4>
                    <p className="text-sm text-primary">
                      产品组密钥，由 LMK 派生。用于加密特定产品组的内容，可分发给用户组。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-info/8 rounded-lg">
                  <Users className="w-6 h-6 text-info flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-info">User Authorized Key (UAK)</h4>
                    <p className="text-sm text-info">
                      用户授权密钥，由 PGK 派生。授权特定用户访问加密内容，可设置过期时间。
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 撤销密钥确认对话框 */}
      <AlertDialog open={!!showRevokeDialog} onOpenChange={() => setShowRevokeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤销密钥</AlertDialogTitle>
            <AlertDialogDescription>
              确定要撤销此密钥吗？撤销后，使用此密钥的用户将无法访问相关加密内容。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showRevokeDialog && handleRevokeKey(showRevokeDialog)}
              className="bg-error hover:bg-error"
            >
              撤销密钥
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重新生成主密钥确认对话框 */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重新生成主密钥</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-error font-medium">警告：此操作不可逆！</span>
              <br />
              <br />
              重新生成主密钥后：
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>所有现有的派生密钥将失效</li>
                <li>所有授权用户将失去访问权限</li>
                <li>您需要重新授权所有用户</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerateMasterKey}
              className="bg-warning hover:bg-warning"
            >
              确认重新生成
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
