export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Mobazha</h1>
        <p className="text-xl text-gray-600 mb-8">Decentralized Marketplace</p>
        <div className="flex gap-4 justify-center">
          <a
            href="/market"
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            浏览市场
          </a>
          <a
            href="/docs/migrations/status.md"
            className="px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary-50 transition-colors"
          >
            迁移状态
          </a>
        </div>
        <p className="mt-8 text-sm text-gray-500">🚧 项目迁移中...</p>
      </div>
    </main>
  );
}
