/**
 * 测试账号配置
 * 用于端到端测试的 Casdoor 账号
 */

export interface TestAccount {
  username: string;
  password: string;
  role: 'buyer' | 'seller' | 'moderator';
  description: string;
}

/**
 * 测试账号配置
 * 这些账号用于 miniapptest.mobazha.org 测试环境
 */
export const TEST_ACCOUNTS = {
  buyer: {
    username: 'buyer',
    password: 'buyer_demo',
    role: 'buyer' as const,
    description: '买家账号 - 用于浏览、购买、评价、发起争议测试',
  },
  seller: {
    username: 'seller',
    password: 'seller_demo',
    role: 'seller' as const,
    description: '卖家账号 - 用于发布商品、管理订单、发货测试',
  },
  moderator: {
    username: 'fengzie_desktop',
    password: 'mod_demo',
    role: 'moderator' as const,
    description: '仲裁员账号 - 用于处理争议、裁决纠纷测试',
  },
} as const;

export type TestRole = keyof typeof TEST_ACCOUNTS;

/**
 * 获取测试账号
 */
export function getTestAccount(role: TestRole): TestAccount {
  return TEST_ACCOUNTS[role];
}

/**
 * 获取所有测试角色
 */
export function getAllTestRoles(): TestRole[] {
  return Object.keys(TEST_ACCOUNTS) as TestRole[];
}
