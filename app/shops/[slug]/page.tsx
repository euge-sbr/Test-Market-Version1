import ShopLandingPage from "@/customers/pages/shop-landing-page";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ShopLandingPage slug={slug} />;
}
