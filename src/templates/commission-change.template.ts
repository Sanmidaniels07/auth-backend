import { renderEmailLayout, emailButton, emailNotice } from "./base.template";

export const commissionChangeTemplate = (
  name: string,
  storeName: string,
  categoryName: string,
  oldRate: number,
  newRate: number,
  productsUrl: string
) => {
  const raised = newRate > oldRate;

  return renderEmailLayout({
    preheader: `Commission for ${categoryName} is now ${newRate}%.`,
    eyebrow: "Seller fees",
    heading: `${categoryName} commission ${raised ? "increase" : "update"}`,
    bodyHtml: `
      <p style="margin:0;">
        Hi ${name}, the Nestly commission for <strong style="color:#13131A;">${categoryName}</strong>,
        where <strong style="color:#13131A;">${storeName}</strong> has products, has changed:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0; border-radius:14px; background-color:#FAFAFD; border:1px solid #ECE9F6;">
        <tr>
          <td style="padding:14px 16px; font-size:15px; color:#13131A;">
            <span style="color:#94A3B8; text-decoration:line-through;">${oldRate}%</span>
            &nbsp;&rarr;&nbsp;
            <strong style="color:#6D28D9;">${newRate}%</strong>
          </td>
        </tr>
      </table>
      <p style="margin:0;">
        The new rate applies to orders placed from now on. Orders that were already
        placed keep the rate they were made at. Delivery fees remain yours in full,
        with no commission.
      </p>
      ${emailButton("Review your products", productsUrl)}
      ${emailNotice("Each product's edit page shows exactly what you'll receive at the new rate.")}
    `,
  });
};
