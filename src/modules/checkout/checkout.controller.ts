import { Request, Response } from "express";

import { confirmContributionService, isContributionReference } from "../group-gift/group-gift.service";
import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { ReferenceParams } from "../../types/request.types";
import { verifyPaystackWebhookSignature } from "../../utils/paystack";
import {
  initiateCheckoutService,
  checkoutWithSavedCardService,
  verifyCheckoutService,
  confirmPaymentByReferenceService,
  guestCartQuoteService,
  guestCheckoutService,
} from "./checkout.service";
import { handleTransferWebhookService } from "../payout/held-payout.service";

export const initiateCheckout = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await initiateCheckoutService(
      req.user.id,
      req.body.addressId,
      req.body.shippingSelections,
      req.body.couponCode,
      req.body.sellerNotes,
      req.body.deliveryPhone,
      req.body.source
    );

    res.status(201).json(
      apiResponse(result, "Checkout initiated successfully")
    );
  }
);

export const checkoutWithSavedCard = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await checkoutWithSavedCardService(
      req.user.id,
      req.body.addressId,
      req.body.savedCardId,
      req.body.shippingSelections,
      req.body.couponCode,
      req.body.sellerNotes,
      req.body.deliveryPhone,
      req.body.source
    );

    res.status(200).json(
      apiResponse(order, "Payment successful")
    );
  }
);

export const verifyCheckout = asyncHandler(
  async (req: Request<ReferenceParams>, res: Response) => {
    const order = await verifyCheckoutService(
      req.user.id,
      req.params.reference
    );

    res.status(200).json(
      apiResponse(order, "Payment verified successfully")
    );
  }
);

export const paystackWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const signature = req.headers[
      "x-paystack-signature"
    ] as string | undefined;

    if (
      !req.rawBody ||
      !verifyPaystackWebhookSignature(
        req.rawBody,
        signature
      )
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid signature",
      });
      return;
    }

    const event = req.body;

    // A chip-in contribution (group-gift/) is its own payment, not an order.
    if (event.event === "charge.success" && isContributionReference(String(event.data?.reference ?? ""))) {
      await confirmContributionService(event.data.reference).catch((error) => {
        console.error("Webhook contribution confirmation failed:", error);
      });
    } else if (event.event === "charge.success") {
      await confirmPaymentByReferenceService(
        event.data.reference
      ).catch((error) => {
        console.error(
          "Webhook payment confirmation failed:",
          error
        );
      });
    }

    // Automatic seller payouts (hold-then-pay) landing, failing or bouncing back.
    if (typeof event.event === "string" && event.event.startsWith("transfer.")) {
      await handleTransferWebhookService(event.event, event.data).catch((error) => {
        console.error("Webhook transfer update failed:", error);
      });
    }

    res.status(200).json({ received: true });
  }
);

// Guest checkout - no login.
export const guestCartQuote = asyncHandler(async (req: Request, res: Response) => {
  const quote = await guestCartQuoteService(req.body.items);
  res.status(200).json(apiResponse(quote, "Cart fetched"));
});

export const guestCheckout = asyncHandler(async (req: Request, res: Response) => {
  const result = await guestCheckoutService(req.body);
  res.status(201).json(apiResponse(result, "Checkout started"));
});
