import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import { updateUserRoleService } from "./admin.service";

export const updateUserRole = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const user = await updateUserRoleService(
      req.user.id,
      req.params.id,
      req.body.role
    );

    res.status(200).json(
      apiResponse(user, "User role updated successfully")
    );
  }
);
