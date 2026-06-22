export const apiResponse = <T>(
  data: T,
  message: string
) => {
  return {
    success: true,
    message,
    data,
  };
};