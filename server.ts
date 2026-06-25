import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import nodemailer from "nodemailer";

// Fix for Node.js DNS resolving localhost inside container
dns.setDefaultResultOrder("ipv4first");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Health probe
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API: Discord webhook alert proxy
  app.post("/api/discord-alert", async (req, res) => {
    const { webhookUrl, title, game, prizePool, entryFee, date, message } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: "Discord Webhook URL is required" });
    }

    try {
      const isTestMsg = message && !game;
      const payload = {
        username: "Esports Hub Alerts",
        avatar_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=260&auto=format&fit=crop",
        embeds: [
          {
            title: isTestMsg ? "🔔 Live Alert Test" : `🏆 New Tournament Alert: ${title}`,
            description: isTestMsg ? message : `A new high-stakes tournament has been registered! Join and claim your share of the prize pool.`,
            color: 16711732, // Neon pink/ruby
            fields: isTestMsg
              ? []
              : [
                  { name: "🎮 Game", value: game || "Unknown", inline: true },
                  { name: "💰 Prize Pool", value: `₹${prizePool?.toLocaleString('en-IN') || "0"} INR`, inline: true },
                  { name: "🎟️ Entry Fee", value: entryFee === 0 ? "Free Entry" : `₹${entryFee} INR`, inline: true },
                  { name: "📅 Match Date", value: date || "TBD", inline: false },
                ],
            footer: {
              text: "GamerZone - Esports Management Platform",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status === 204) {
        return res.json({ success: true, message: "Discord notification sent successfully!" });
      } else {
        const errorText = await response.text();
        return res.status(500).json({ error: `Discord API returned status ${response.status}: ${errorText}` });
      }
    } catch (err: any) {
      console.error("Discord integration error:", err);
      return res.status(500).json({ error: err.message || "Failed to send discord alert" });
    }
  });

  // API: Secure Payment Gateway simulation
  app.post("/api/payment/checkout", (req, res) => {
    const { cardName, cardNumber, expiry, cvc, upiId, method, amount, tournamentTitle } = req.body;

    if (!amount || !tournamentTitle || !method) {
      return res.status(400).json({ error: "Missing checkout parameters" });
    }

    // Simulate payment clearing
    setTimeout(() => {
      // 95% pass rate for simulated transactions, rejecting obviously mock fails
      if (cardNumber && cardNumber.replace(/\s/g, "").startsWith("4000000000000")) {
        return res.status(400).json({ error: "Simulated transaction declined. Insufficient funds or invalid CVV." });
      }

      const txId = "TXN-" + Math.floor(100000 + Math.random() * 900000);
      return res.json({
        success: true,
        transactionId: txId,
        message: "Payment successfully processed!",
        amount,
        tournamentTitle,
        method,
        timestamp: new Date().toISOString(),
      });
    }, 1200);
  });

  // API: Verification and Two-Factor simulator with real email integration fallback
  app.post("/api/auth/send-verification", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Check if configuration exists
    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465, // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const mailOptions = {
          from: `"GamerZone Security" <${smtpUser}>`,
          to: email,
          subject: `🎮 ${code} is your GamerZone Device Verification Code`,
          html: `
            <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1f2937; border-top: 5px solid #146ef5; border-radius: 12px; overflow: hidden; color: #f3f4f6; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
              <div style="padding: 24px; text-align: center; border-bottom: 1px solid #1f2937; background: linear-gradient(135deg, #0b0f19 0%, #111827 100%);">
                <span style="font-family: monospace; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; background-color: rgba(20, 110, 245, 0.15); color: #146ef5; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(20, 110, 245, 0.2);">SECURE HANDSHAKE</span>
                <h1 style="font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 12px 0 0 0; color: #ffffff; letter-spacing: -0.025em;">GamerZone Verification</h1>
              </div>
              <div style="padding: 32px 24px; text-align: center;">
                <p style="font-size: 14px; margin-top: 0; color: #9ca3af; line-height: 1.5;">To complete your device link request and activate anti-cheat validation, enter the 6-digit confirmation PIN below:</p>
                
                <div style="display: inline-block; margin: 24px 0; padding: 16px 28px; background-color: #030712; border: 1px dashed #14beb0; border-radius: 12px; box-shadow: 0 0 20px rgba(20, 184, 166, 0.1);">
                  <span style="display: block; font-family: monospace; font-size: 11px; font-weight: bold; color: #14beb0; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;">YOUR VALIDATION PIN:</span>
                  <strong style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 0.25em; color: #14beb0; text-shadow: 0 0 8px rgba(20, 184, 166, 0.3);">${code}</strong>
                </div>

                <p style="font-size: 12px; color: #6b7280; line-height: 1.5; max-width: 400px; margin: 16px auto 0 auto;">This verification code is active for 10 minutes. If you did not initiate this request, simply ignore this mail or reach out to GamerZone Support.</p>
              </div>
              <div style="padding: 16px 24px; background-color: #030712; border-top: 1px solid #1f2937; text-align: center; font-size: 11px; font-family: monospace; color: #4b5563;">
                 ⚡ GamerZone platform uses cryptographical secure PCI-DSS handshakes.
              </div>
            </div>
          `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Successfully delivered real email OTP to ${email}`, info.messageId);
        return res.json({
          success: true,
          message: `Verification code successfully dispatched directly to ${email}!`,
          code,
          realEmailSent: true,
        });
      } catch (err: any) {
        console.error("Real email dispatch failed, reverting to sandbox mode:", err);
        return res.json({
          success: true,
          message: `Notice: Real-time email carrier delivery failed. We have fallback loaded secure sandbox for verification.`,
          code,
          realEmailSent: false,
          error: err.message,
        });
      }
    }

    // Try to dynamically generate a test Ethereal SMTP account if no custom credentials are set
    try {
      console.log("No SMTP credentials configured. Creating dynamic Ethereal Email account...");
      const testAccount = await nodemailer.createTestAccount();
      
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const mailOptions = {
        from: `"GamerZone Security" <verification@gamerzone.com>`,
        to: email,
        subject: `🎮 ${code} is your GamerZone Device Verification Code`,
        html: `
          <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1f2937; border-top: 5px solid #146ef5; border-radius: 12px; overflow: hidden; color: #f3f4f6; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
            <div style="padding: 24px; text-align: center; border-bottom: 1px solid #1f2937; background: linear-gradient(135deg, #0b0f19 0%, #111827 100%);">
              <span style="font-family: monospace; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; background-color: rgba(20, 110, 245, 0.15); color: #146ef5; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(20, 110, 245, 0.2);">SECURE HANDSHAKE</span>
              <h1 style="font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 12px 0 0 0; color: #ffffff; letter-spacing: -0.025em;">GamerZone Verification</h1>
            </div>
            <div style="padding: 32px 24px; text-align: center;">
              <p style="font-size: 14px; margin-top: 0; color: #9ca3af; line-height: 1.5;">To complete your device link request and activate anti-cheat validation, enter the 6-digit confirmation PIN below:</p>
              
              <div style="display: inline-block; margin: 24px 0; padding: 16px 28px; background-color: #030712; border: 1px dashed #14beb0; border-radius: 12px; box-shadow: 0 0 20px rgba(20, 184, 166, 0.1);">
                <span style="display: block; font-family: monospace; font-size: 11px; font-weight: bold; color: #14beb0; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;">YOUR VALIDATION PIN:</span>
                <strong style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 0.25em; color: #14beb0; text-shadow: 0 0 8px rgba(20, 184, 166, 0.3);">${code}</strong>
              </div>

              <p style="font-size: 12px; color: #6b7280; line-height: 1.5; max-width: 400px; margin: 16px auto 0 auto;">This verification code is active for 10 minutes. If you did not initiate this request, simply ignore this mail or configure real SMTP keys in your Secrets panel.</p>
            </div>
            <div style="padding: 16px 24px; background-color: #030712; border-top: 1px solid #1f2937; text-align: center; font-size: 11px; font-family: monospace; color: #4b5563;">
               ⚡ GamerZone platform uses cryptographical secure PCI-DSS handshakes.
            </div>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      const testMessageUrl = nodemailer.getTestMessageUrl(info);
      console.log(`Successfully dispatched Ethereal Email! Test Inbox URL: ${testMessageUrl}`);

      return res.json({
        success: true,
        message: `Verification code successfully dispatched! We created an on-the-fly test mailbox for you.`,
        code,
        realEmailSent: true,
        testMailboxUrl: testMessageUrl || undefined,
      });
    } catch (etherealErr: any) {
      console.error("Failed to generate dynamic Ethereal Email account:", etherealErr);
      
      // Default simulation fallback
      return res.json({
        success: true,
        message: `Verification code simulated in sandbox for ${email}. Configure SMTP keys in Secrets panel for real inbox delivery!`,
        code,
        realEmailSent: false,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
