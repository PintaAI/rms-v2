"use server";

import { connection } from "next/server";
import { cacheLife } from "next/cache";
import { faker } from "@faker-js/faker";

export async function getPriceData() {
  await connection();

  const products = Array.from({ length: 5 }, () => ({
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    price: parseFloat(faker.commerce.price()),
    category: faker.commerce.department(),
    stock: faker.number.int({ min: 0, max: 100 }),
    sku: faker.string.alphanumeric(8).toUpperCase(),
  }));

  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  return {
    data: {
      products,
      summary: {
        totalProducts: products.length,
        totalValue: Math.round(totalValue * 100) / 100,
      },
    },
  };
}

export async function getArticle() {
  'use cache'
  cacheLife({ revalidate: 60 })

  const articles = [
    {
      id: "article-001",
      title: "Understanding Next.js Cache Components",
      body: "Next.js 16 introduces cache components with the 'use cache' directive. This allows you to cache server function results and improve performance. The cache revalidates based on the cacheLife profile you configure.",
    },
  ];

  return {
    data: {
      articles,
      summary: {
        totalArticles: articles.length,
      },
    },
  };
}