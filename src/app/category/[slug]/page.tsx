// src/app/category/[slug]/page.tsx
type Props = { params: { slug: string } };

export default function CategoryPage({ params }: Props) {
  const { slug } = params;
  const title = slug
    .split("-")
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join(" ");

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-neutral-600">
        Category: <code className="font-mono">{slug}</code>
      </p>
      {/* TODO: 在这里渲染该分类下的商品列表（对接 Strapi） */}
      <div className="rounded-xl border p-6 text-neutral-500">
        Product list goes here…
      </div>
    </main>
  );
}
