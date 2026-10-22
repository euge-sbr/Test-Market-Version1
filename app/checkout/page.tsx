import CheckoutPage from "@/customers/pages/checkout-page";
import { isStripeConfigured } from "@/shared/payments/stripe";

export const dynamic = "force-dynamic";

export default function CheckoutRoute() {
  return <CheckoutPage cardPaymentsEnabled={isStripeConfigured()} />;
}
