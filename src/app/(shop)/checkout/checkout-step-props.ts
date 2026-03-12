// src/app/(shop)/checkout/checkout-step-props.ts
import type React from "react";
import BagStep from "./_components/BagStep";
import AddressStep from "./_components/AddressStep";
import DeliveryStep from "./_components/DeliveryStep";
import PaymentStep from "./_components/PaymentStep";

type BagStepProps = React.ComponentProps<typeof BagStep>;
type AddressStepProps = React.ComponentProps<typeof AddressStep>;
type DeliveryStepProps = React.ComponentProps<typeof DeliveryStep>;
type PaymentStepProps = React.ComponentProps<typeof PaymentStep>;

export function buildCheckoutBagStepProps(
  params: BagStepProps
): BagStepProps {
  return params;
}

export function buildCheckoutAddressStepProps(
  params: AddressStepProps
): AddressStepProps {
  return params;
}

export function buildCheckoutDeliveryStepProps(
  params: DeliveryStepProps
): DeliveryStepProps {
  return params;
}

export function buildCheckoutPaymentStepProps(
  params: PaymentStepProps
): PaymentStepProps {
  return params;
}