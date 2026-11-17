const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(bodyHtml: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;padding:32px">
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:20px;font-weight:600">Topic Board</p>
${bodyHtml}
</div>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#525252;text-align:center">${footer}</p>
</body></html>`;
}

const button = (url: string, label: string) =>
  `<a href="${escape(url)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escape(label)}</a>`;

export function loginEmail(url: string) {
  return {
    subject: "Your Topic Board sign-in link",
    text: `Use this link to sign in to Topic Board:\n\n${url}\n\nIt works once and expires in an hour. If you didn't ask for it, you can ignore this email.`,
    html: layout(
      `<p style="margin:0 0 20px;font-size:16px;line-height:1.5">Click the button to sign in. The link works once and expires in an hour.</p>${button(url, "Sign in to Topic Board")}
<p style="margin:24px 0 0;font-size:13px;color:#525252;line-height:1.5">Or paste this into your browser:<br><span style="word-break:break-all">${escape(url)}</span></p>`,
      "If you didn't ask for this, you can ignore this email.",
    ),
  };
}

export function inviteEmail(opts: { inviterName: string; loginUrl: string }) {
  return {
    subject: `${opts.inviterName} invited you to Topic Board`,
    text: `${opts.inviterName} invited you to Topic Board, a small board for sharing tasks and progress.\n\nSign in with this email address at:\n${opts.loginUrl}`,
    html: layout(
      `<p style="margin:0 0 20px;font-size:16px;line-height:1.5"><strong>${escape(opts.inviterName)}</strong> invited you to Topic Board, a small board for sharing tasks and progress. Sign in with this email address; no password needed.</p>${button(opts.loginUrl, "Go to Topic Board")}`,
      "You received this because someone added your email to their Topic Board.",
    ),
  };
}

export function progressEmail(opts: {
  authorName: string;
  topicTitle: string;
  excerpt: string;
  topicUrl: string;
  settingsUrl: string;
}) {
  return {
    subject: `${opts.authorName} added progress to “${opts.topicTitle}”`,
    text: `${opts.authorName} added progress to your topic “${opts.topicTitle}”:\n\n${opts.excerpt}\n\nRead it: ${opts.topicUrl}\n\nTurn these emails off: ${opts.settingsUrl}`,
    html: layout(
      `<p style="margin:0 0 12px;font-size:16px;line-height:1.5"><strong>${escape(opts.authorName)}</strong> added progress to your topic <strong>${escape(opts.topicTitle)}</strong>:</p>
<blockquote style="margin:0 0 24px;padding:12px 16px;border-left:3px solid #0a0a0a;background:#fafafa;font-size:15px;line-height:1.6;white-space:pre-line">${escape(opts.excerpt)}</blockquote>${button(opts.topicUrl, "Read the update")}`,
      `<a href="${escape(opts.settingsUrl)}" style="color:#525252">Turn off these emails</a>`,
    ),
  };
}
