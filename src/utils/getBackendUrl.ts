export const getBackendUrl = (): string => {
  return (
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://auth-backend-trpd.onrender.com"
      : `http://localhost:${process.env.PORT || 5000}`)
  );
};

const CUSTOM_DOMAIN = "https://api.nestlyapp.site";
const RENDER_URL = "https://auth-backend-trpd.onrender.com";

export const getSwaggerServers = (): { url: string; description: string }[] => {
  const servers: { url: string; description: string }[] = [];

  if (process.env.NODE_ENV === "production") {
    servers.push({ url: CUSTOM_DOMAIN, description: "Production (custom domain)" });

    
    if (process.env.RENDER_EXTERNAL_URL) {
      servers.push({ url: RENDER_URL, description: "Production (Render URL)" });
    }
  } else {
    servers.push({
      url: `http://localhost:${process.env.PORT || 5000}`,
      description: "Local development",
    });
  }

  return servers;
};