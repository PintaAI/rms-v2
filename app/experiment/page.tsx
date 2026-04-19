import { Suspense } from "react";
import { getPriceData, getArticle } from "./actions";

async function PriceData() {
  const priceResult = await getPriceData();

  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-lg font-medium mb-2">Price Data</h2>
      <div className="mt-2 space-y-2">
        {priceResult.data.products.map((product: any) => (
          <div key={product.id} className="p-2 bg-gray-50 rounded text-sm">
            <p className="font-medium">{product.name}</p>
            <p className="text-gray-600">
              ${product.price} | Stock: {product.stock} | SKU: {product.sku}
            </p>
          </div>
        ))}
      </div>
      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
        {JSON.stringify(priceResult.data.summary, null, 2)}
      </pre>
    </div>
  );
}

async function ArticleData() {
  const articleResult = await getArticle();

  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-lg font-medium mb-2">Article Data (cached)</h2>
      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
        <p className="font-medium">{articleResult.data.articles[0].title}</p>
        <p className="text-gray-600">{articleResult.data.articles[0].body}</p>
      </div>
      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
        {JSON.stringify(articleResult.data.summary, null, 2)}
      </pre>
    </div>
  );
}

export default async function ExperimentPage() {
  const articleResult = await getArticle();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      <h1 className="text-2xl font-semibold">this is experiment page</h1>

      <div className="grid grid-cols-2 gap-8 w-full max-w-6xl">
        <Suspense
          fallback={
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-medium mb-2">Price Data</h2>
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          }
        >
          <PriceData />
        </Suspense>

        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2">Article Data (cached)</h2>
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
            <p className="font-medium">{articleResult.data.articles[0].title}</p>
            <p className="text-gray-600">{articleResult.data.articles[0].body}</p>
          </div>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify(articleResult.data.summary, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}