import { z } from "zod";
import { withApi, ok } from "@/server/api/guard";
import { createTicket } from "@/server/repos/support";
import { enqueue } from "@/server/jobs";
import { verifyTurnstile } from "@/server/turnstile";

const bodySchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().email("Enter a valid email address."),
  subject: z.string().trim().min(2, "Add a short subject.").max(140),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters).").max(4000),
  category: z.enum(["order", "product", "delivery", "account", "other"]).optional(),
  turnstileToken: z.string().optional(),
});

/** POST /api/v1/contact — creates a support ticket + sends an acknowledgement. */
export const POST = withApi(
  { rateLimit: { limit: 5, windowMs: 60 * 60 * 1000, key: "contact" } },
  async ({ request, identity, meta }) => {
    const body = bodySchema.parse(await request.json());

    const bot = await verifyTurnstile(body.turnstileToken, meta.ip ?? undefined);
    if (!bot) {
      return ok({ received: false, message: "Captcha verification failed — please try again." });
    }

    const categoryMap: Record<string, string> = {
      order: "Orders",
      product: "Products",
      delivery: "Delivery",
      account: "Account",
      other: "General",
    };

    const ticketId = await createTicket({
      subject: body.subject,
      category: categoryMap[body.category ?? "other"] ?? "General",
      requesterName: body.name,
      requesterEmail: body.email,
      body: body.message,
      userId: identity?.user.id ?? null,
    });

    await enqueue("email.send", {
      to: body.email,
      subject: `We received your message — ${body.subject}`,
      text: `Hi ${body.name},\n\nThanks for contacting TereaCOD. Our support team will reply within one business day.\n\nYour message:\n"${body.message}"\n\n— TereaCOD Support`,
      replyTo: body.email,
      notifyOps: true,
    });

    return ok({ received: true, ticketId, message: "Your message is with our support team." });
  }
);
