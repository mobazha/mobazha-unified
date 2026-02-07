'use client';

/**
 * 收款地址设置页面
 */

import { useState, useEffect, useCallback } from 'react';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input-compat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

// 支持的币种
const SUPPORTED_COINS = [
  { code: 'BTC', name: 'Bitcoin', icon: '₿' },
  { code: 'LTC', name: 'Litecoin', icon: 'Ł' },
  { code: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { code: 'BSC', name: 'BNB Chain', icon: '⬡' },
  { code: 'MATIC', name: 'Polygon', icon: '⬢' },
];

// 收款地址类型
interface ReceivingAddress {
  coin: string;
  address: string;
  label?: string;
  isExternal: boolean;
}

// Mock 数据
const mockAddresses: ReceivingAddress[] = [
  {
    coin: 'BTC',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    label: '主收款地址',
    isExternal: true,
  },
  {
    coin: 'ETH',
    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    label: 'MetaMask 钱包',
    isExternal: true,
  },
];

export default function ReceivingAddressesPage() {
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<ReceivingAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 新地址表单
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCoin, setNewCoin] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');

  // 编辑模式
  const [editingCoin, setEditingCoin] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editLabel, setEditLabel] = useState('');

  // 加载地址
  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: 替换为真实 API
      await new Promise(resolve => setTimeout(resolve, 500));
      setAddresses(mockAddresses);
    } catch {
      toast({
        title: '加载失败',
        description: '无法加载收款地址',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // 添加地址
  const handleAddAddress = async () => {
    if (!newCoin || !newAddress) {
      toast({
        title: '请填写完整信息',
        description: '币种和地址是必填项',
        variant: 'destructive',
      });
      return;
    }

    // 检查是否已存在
    if (addresses.some(a => a.coin === newCoin)) {
      toast({
        title: '地址已存在',
        description: `已有 ${newCoin} 的收款地址，请编辑或删除后重新添加`,
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // TODO: 替换为真实 API
      await new Promise(resolve => setTimeout(resolve, 500));

      const newAddressObj: ReceivingAddress = {
        coin: newCoin,
        address: newAddress,
        label: newLabel || undefined,
        isExternal: true,
      };

      setAddresses(prev => [...prev, newAddressObj]);
      setShowAddForm(false);
      setNewCoin('');
      setNewAddress('');
      setNewLabel('');

      toast({
        title: '添加成功',
        description: `已添加 ${newCoin} 收款地址`,
      });
    } catch {
      toast({
        title: '添加失败',
        description: '无法保存收款地址',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 开始编辑
  const startEdit = (addr: ReceivingAddress) => {
    setEditingCoin(addr.coin);
    setEditAddress(addr.address);
    setEditLabel(addr.label || '');
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingCoin || !editAddress) return;

    setIsSaving(true);
    try {
      // TODO: 替换为真实 API
      await new Promise(resolve => setTimeout(resolve, 500));

      setAddresses(prev =>
        prev.map(a =>
          a.coin === editingCoin ? { ...a, address: editAddress, label: editLabel || undefined } : a
        )
      );

      setEditingCoin(null);
      toast({
        title: '保存成功',
        description: '收款地址已更新',
      });
    } catch {
      toast({
        title: '保存失败',
        description: '无法更新收款地址',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 删除地址
  const handleDelete = async (coin: string) => {
    setIsSaving(true);
    try {
      // TODO: 替换为真实 API
      await new Promise(resolve => setTimeout(resolve, 500));

      setAddresses(prev => prev.filter(a => a.coin !== coin));
      toast({
        title: '删除成功',
        description: `已删除 ${coin} 收款地址`,
      });
    } catch {
      toast({
        title: '删除失败',
        description: '无法删除收款地址',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 获取可添加的币种
  const availableCoins = SUPPORTED_COINS.filter(c => !addresses.some(a => a.coin === c.code));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <Container className="py-8">
        <div className="space-y-6">
          {/* 标题 */}
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-bold text-foreground">收款地址</h1>
              <p className="text-muted-foreground mt-1">管理您的外部钱包收款地址</p>
            </div>
            {availableCoins.length > 0 && !showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>添加地址</Button>
            )}
          </div>

          {/* 添加表单 */}
          {showAddForm && (
            <Card className="w-full p-6">
              <h3 className="text-lg font-semibold mb-4">添加收款地址</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">币种 *</label>
                    <Select value={newCoin} onValueChange={setNewCoin}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择币种" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCoins.map(coin => (
                          <SelectItem key={coin.code} value={coin.code}>
                            <span className="mr-2">{coin.icon}</span>
                            {coin.name} ({coin.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">标签</label>
                    <Input
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      placeholder="例如：主钱包"
                    />
                  </div>
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-foreground mb-1">地址 *</label>
                  <Input
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    placeholder="输入收款地址"
                    className="font-mono"
                  />
                </div>
                <div className="flex gap-4 w-full justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCoin('');
                      setNewAddress('');
                      setNewLabel('');
                    }}
                  >
                    取消
                  </Button>
                  <Button onClick={handleAddAddress} disabled={isSaving}>
                    {isSaving ? '保存中...' : '添加'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* 地址列表 */}
          {isLoading ? (
            <div className="w-full py-12 text-center text-muted-foreground">加载中...</div>
          ) : addresses.length === 0 ? (
            <Card className="w-full p-12 text-center">
              <div className="text-muted-foreground/70 text-5xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-foreground mb-2">暂无收款地址</h3>
              <p className="text-muted-foreground mb-4">添加外部钱包地址以接收加密货币支付</p>
              {availableCoins.length > 0 && (
                <Button onClick={() => setShowAddForm(true)}>添加第一个地址</Button>
              )}
            </Card>
          ) : (
            <div className="w-full space-y-4">
              {addresses.map(addr => {
                const coinInfo = SUPPORTED_COINS.find(c => c.code === addr.coin);
                const isEditing = editingCoin === addr.coin;

                return (
                  <Card key={addr.coin} className="w-full p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">
                          {coinInfo?.icon || '💰'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{coinInfo?.name || addr.coin}</span>
                            <span className="text-sm text-muted-foreground">({addr.coin})</span>
                            {addr.isExternal && (
                              <span className="px-2 py-0.5 bg-info/15 text-info text-xs rounded">
                                外部钱包
                              </span>
                            )}
                          </div>
                          {isEditing ? (
                            <div className="mt-2 space-y-2">
                              <Input
                                value={editAddress}
                                onChange={e => setEditAddress(e.target.value)}
                                className="font-mono text-sm"
                                placeholder="收款地址"
                              />
                              <Input
                                value={editLabel}
                                onChange={e => setEditLabel(e.target.value)}
                                placeholder="标签（可选）"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="font-mono text-sm text-muted-foreground mt-1 break-all">
                                {addr.address}
                              </div>
                              {addr.label && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {addr.label}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCoin(null)}
                            >
                              取消
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                              保存
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={() => startEdit(addr)}>
                              编辑
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-error">
                                  删除
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除 {coinInfo?.name}{' '}
                                    的收款地址吗？删除后，该币种的订单将无法接收支付。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(addr.coin)}
                                    className="bg-error hover:bg-error"
                                  >
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 说明 */}
          <Card className="w-full p-4 bg-info/8 border-info/20">
            <h4 className="font-medium text-info mb-2">💡 关于收款地址</h4>
            <ul className="text-sm text-info space-y-1">
              <li>• 收款地址用于接收买家的加密货币支付</li>
              <li>• 您可以使用外部钱包地址（如 MetaMask、Trust Wallet）</li>
              <li>• 请确保地址正确，错误的地址可能导致资金丢失</li>
              <li>• 不同币种需要设置不同的收款地址</li>
            </ul>
          </Card>
        </div>
      </Container>

      <Footer />
      <Toaster />
    </div>
  );
}
