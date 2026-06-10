// src/utils/email.service.ts
import nodemailer from "nodemailer";
import env from "../config/env";
import logger from "./logger";

// ─── Transporter (Brevo SMTP) ─────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false, // Brevo uses STARTTLS on 587
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

// Verify on startup only when credentials are present
if (env.SMTP_USER && env.SMTP_PASS) {
    transporter.verify().then(() => logger.info("Brevo SMTP ready")).catch((e) =>
        logger.warn("Brevo SMTP verify failed:", e.message)
    );
}

// ─── Base layout ─────────────────────────────────────────────────────────────
function layout(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#f4f5f7; font-family:Arial,sans-serif; }
    .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.1); }
    .header { background:#0052CC; padding:28px 32px; }
    .header h1 { color:#fff; margin:0; font-size:22px; letter-spacing:-.3px; }
    .body { padding:32px; color:#172B4D; line-height:1.6; }
    .body h2 { margin-top:0; font-size:18px; }
    .btn { display:inline-block; margin:20px 0; padding:12px 24px; background:#0052CC; color:#fff; text-decoration:none; border-radius:4px; font-weight:bold; }
    .footer { padding:16px 32px; background:#f4f5f7; color:#6B778C; font-size:12px; text-align:center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>${env.APP_NAME}</h1></div>
    <div class="body">${body}</div>
    <div class="footer">&copy; ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.</div>
  </div>
</body>
</html>`;
}

// ─── Core send helper ─────────────────────────────────────────────────────────
async function send(to: string, subject: string, html: string): Promise<void> {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
        logger.warn(`[Email] SMTP not configured — skipping email to ${to}: "${subject}"`);
        return;
    }
    try {
        await transporter.sendMail({ from: `"${env.APP_NAME}" <${env.EMAIL_FROM}>`, to, subject, html });
        logger.info(`[Email] Sent "${subject}" to ${to}`);
    } catch (err: any) {
        logger.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message);
        // Non-fatal — never throw; email failure should never break the API response
    }
}

// ─── Public email functions ───────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
    const html = layout(
        "Welcome!",
        `<h2>Welcome to ${env.APP_NAME}, ${name}! 🎉</h2>
     <p>Your account has been created successfully. You can now create workspaces, boards, and start collaborating with your team.</p>
     <a class="btn" href="${env.APP_URL}">Get Started</a>
     <p>If you didn't create this account, please ignore this email.</p>`
    );
    await send(to, `Welcome to ${env.APP_NAME}!`, html);
}

export async function sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    const html = layout(
        "Password Changed",
        `<h2>Password Changed</h2>
     <p>Hi ${name},</p>
     <p>Your password was successfully changed. If you made this change, no action is needed.</p>
     <p><strong>If you did not make this change</strong>, your account may be compromised. Please contact support immediately.</p>
     <a class="btn" href="${env.APP_URL}">Go to App</a>`
    );
    await send(to, "Your password has been changed", html);
}

export async function sendCardAssignedEmail(
    to: string,
    recipientName: string,
    cardTitle: string,
    boardName: string,
    actorName: string,
    cardUrl: string
): Promise<void> {
    const html = layout(
        "You've been assigned to a card",
        `<h2>You've been assigned to a card</h2>
     <p>Hi ${recipientName},</p>
     <p><strong>${actorName}</strong> assigned you to the card:</p>
     <blockquote style="border-left:4px solid #0052CC;margin:12px 0;padding:8px 16px;background:#f4f5f7;border-radius:4px;">
       <strong>${cardTitle}</strong><br/>
       <span style="color:#6B778C;">Board: ${boardName}</span>
     </blockquote>
     <a class="btn" href="${cardUrl}">View Card</a>`
    );
    await send(to, `You were assigned to "${cardTitle}"`, html);
}

export async function sendBoardInviteEmail(
    to: string,
    recipientName: string,
    inviterName: string,
    boardName: string,
    boardUrl: string
): Promise<void> {
    const html = layout(
        "Board Invitation",
        `<h2>You've been invited to a board</h2>
     <p>Hi ${recipientName},</p>
     <p><strong>${inviterName}</strong> has invited you to collaborate on the board:</p>
     <blockquote style="border-left:4px solid #0052CC;margin:12px 0;padding:8px 16px;background:#f4f5f7;border-radius:4px;">
       <strong>${boardName}</strong>
     </blockquote>
     <a class="btn" href="${boardUrl}">Open Board</a>
     <p style="color:#6B778C;font-size:13px;">If you were not expecting this invitation, you can ignore this email.</p>`
    );
    await send(to, `You've been invited to board "${boardName}"`, html);
}

export async function sendMentionEmail(
    to: string,
    recipientName: string,
    actorName: string,
    cardTitle: string,
    commentPreview: string,
    cardUrl: string
): Promise<void> {
    const html = layout(
        "You were mentioned",
        `<h2>You were mentioned in a comment</h2>
     <p>Hi ${recipientName},</p>
     <p><strong>${actorName}</strong> mentioned you on the card <strong>${cardTitle}</strong>:</p>
     <blockquote style="border-left:4px solid #0052CC;margin:12px 0;padding:8px 16px;background:#f4f5f7;border-radius:4px;">
       ${commentPreview}
     </blockquote>
     <a class="btn" href="${cardUrl}">View Comment</a>`
    );
    await send(to, `${actorName} mentioned you in a comment`, html);
}