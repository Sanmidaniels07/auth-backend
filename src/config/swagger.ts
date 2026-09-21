import swaggerJsDoc from "swagger-jsdoc";
import { getSwaggerServers } from "../utils/getBackendUrl";

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Social Marketplace App Backend API",
      version: "1.0.0",
      description: "Social Marketplace App API documentation",
    },

    servers: getSwaggerServers(),

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