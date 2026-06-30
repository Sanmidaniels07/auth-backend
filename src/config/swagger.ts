import swaggerJsDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Blog App Backend API",
      version: "1.0.0",
      description: "Blog App API documentation",
    },

    // servers: [
    //   {
    //     url: "http://localhost:5000",
    //   },
    // ],

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