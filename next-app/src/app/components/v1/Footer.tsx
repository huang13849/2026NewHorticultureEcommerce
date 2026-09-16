export default function Footer() {
  return (
    <footer className="mt-12 border-t border-stone-200/70 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-xs font-black">品</span>
          <div>
            <div className="font-semibold text-stone-900">北京鲜花 · 价格跟着花走</div>
            <div className="text-[11px] text-stone-400 mt-0.5">实时价格 · 当日鲜花 · 即时送达</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-stone-500">
          <a href="/about"   className="hover:text-stone-900">关于我们</a>
          <a href="/help"    className="hover:text-stone-900">帮助中心</a>
          <a href="/contact" className="hover:text-stone-900">联系我们</a>
          <a href="/v1"      className="hover:text-stone-900">返回 V1 老版</a>
        </div>
        <div className="text-[11px] text-stone-400">© 北京鲜花 · 京ICP备XXXXXXXX号</div>
      </div>
    </footer>
  );
}
