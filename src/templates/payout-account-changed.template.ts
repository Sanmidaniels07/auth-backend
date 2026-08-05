export const payoutAccountChangedTemplate = (
  name: string,
  storeName: string,
  bankName: string,
  maskedAccountNumber: string
) => `
  <h2>
    Hello ${name}
  </h2>

  <p>
    The payout bank account for your store "${storeName}" was just changed to
    ${bankName} (account ending in ${maskedAccountNumber}). Future payouts will
    go there instead.
  </p>

  <p>
    If this was you, no action is needed. If you didn't make this change,
    please contact support immediately - your account may be compromised.
  </p>
`;
