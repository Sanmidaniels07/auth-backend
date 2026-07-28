import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import {
  createAddressService,
  getAddressesService,
  updateAddressService,
  deleteAddressService,
} from "./address.service";

export const createAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const address = await createAddressService(
      req.user.id,
      req.body
    );

    res.status(201).json(
      apiResponse(address, "Address created successfully")
    );
  }
);

export const getAddresses = asyncHandler(
  async (req: Request, res: Response) => {
    const addresses = await getAddressesService(
      req.user.id
    );

    res.status(200).json(
      apiResponse(
        addresses,
        "Addresses fetched successfully"
      )
    );
  }
);

export const updateAddress = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const address = await updateAddressService(
      req.user.id,
      req.params.id,
      req.body
    );

    res.status(200).json(
      apiResponse(address, "Address updated successfully")
    );
  }
);

export const deleteAddress = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await deleteAddressService(req.user.id, req.params.id);

    res.status(200).json(
      apiResponse(null, "Address deleted successfully")
    );
  }
);
