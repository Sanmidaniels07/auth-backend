import { Request, Response } from "express";
import { OrderStatus, OrderItemStatus } from "@prisma/client";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  IdParams,
  OrderItemIdParams,
} from "../../types/request.types";
import {
  getCustomerOrdersService,
  getCustomerOrderByIdService,
  cancelOrderService,
  getSellerOrdersService,
  getSellerOrderByIdService,
  updateOrderItemStatusService,
  updateOrderTrackingNumberService,
} from "./order.service";

export const getCustomerOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status as
      | OrderStatus
      | undefined;

    const result = await getCustomerOrdersService(
      req.user.id,
      page,
      limit,
      status
    );

    res.status(200).json(
      apiResponse(result, "Orders fetched successfully")
    );
  }
);

export const getCustomerOrderById = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const order = await getCustomerOrderByIdService(
      req.user.id,
      req.params.id
    );

    res.status(200).json(
      apiResponse(order, "Order fetched successfully")
    );
  }
);

export const cancelOrder = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const order = await cancelOrderService(
      req.user.id,
      req.params.id
    );

    res.status(200).json(
      apiResponse(order, "Order cancelled successfully")
    );
  }
);

export const getSellerOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status as
      | OrderItemStatus
      | undefined;

    const result = await getSellerOrdersService(
      req.user.id,
      page,
      limit,
      status
    );

    res.status(200).json(
      apiResponse(
        result,
        "Seller orders fetched successfully"
      )
    );
  }
);

export const getSellerOrderById = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const order = await getSellerOrderByIdService(
      req.user.id,
      req.params.id
    );

    res.status(200).json(
      apiResponse(order, "Order fetched successfully")
    );
  }
);

export const updateOrderTrackingNumber = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const order = await updateOrderTrackingNumberService(
      req.user.id,
      req.params.id,
      req.body.trackingNumber
    );

    res.status(200).json(
      apiResponse(
        order,
        "Tracking number updated successfully"
      )
    );
  }
);

export const updateOrderItemStatus = asyncHandler(
  async (
    req: Request<OrderItemIdParams>,
    res: Response
  ) => {
    const order = await updateOrderItemStatusService(
      req.user.id,
      req.params.orderItemId,
      req.body.status
    );

    res.status(200).json(
      apiResponse(
        order,
        "Order item status updated successfully"
      )
    );
  }
);
