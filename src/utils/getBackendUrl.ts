export const getBackendUrl = (): string => {
  return (
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://auth-backend-trpd.onrender.com"
      : `http://localhost:${process.env.PORT || 5000}`)
  );
};
