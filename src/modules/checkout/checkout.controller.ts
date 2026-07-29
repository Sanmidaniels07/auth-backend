import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { ReferenceParams } from "../../types/request.types";
import { verifyPaystackWebhookSignature } from "../../utils/paystack";
import {
  initiateCheckoutService,
  checkoutWithSavedCardService,
  verifyCheckoutService,
  confirmPaymentByReferenceService,
} from "./checkout.service";

export const initiateCheckout = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await initiateCheckoutService(
      req.user.id,
      req.body.addressId,
      req.body.shippingSelections,
      req.body.couponCode
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
      req.body.couponCode
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

    if (event.event === "charge.success") {
      await confirmPaymentByReferenceService(
        event.data.reference
      ).catch((error) => {
        console.error(
          "Webhook payment confirmation failed:",
          error
        );
      });
    }

    res.status(200).json({ received: true });
  }
);
