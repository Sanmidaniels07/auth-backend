export const verificationTemplate =
  (
    name: string,
    verificationUrl: string
  ) => `
    <h2>
      Hello ${name}
    </h2>

    <p>
      Please verify your email.
    </p>

    <a href="${verificationUrl}">
      Verify Account
    </a>
  `;