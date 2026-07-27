import swaggerJsDoc from "swagger-jsdoc";
import { getBackendUrl } from "../utils/getBackendUrl";

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Blog App Backend API",
      version: "1.0.0",
      description: "Blog App API documentation",
    },

    servers: [
      {
        url: getBackendUrl(),
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  apis: ["./src/**/*.ts"],
};

export const swaggerSpec = swaggerJsDoc(options);
