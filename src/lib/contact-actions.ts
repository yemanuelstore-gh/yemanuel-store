"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  isNonEmpty,
  isValidEmail,
  isValidFullName,
  isValidGhanaPhone,
} from "@/lib/validation";

export type ContactSubmitState = {
  ok: boolean;
  message: string;
};

const SUBJECTS = [
  "order",
  "delivery",
  "payment",
  "returns",
  "product",
  "other",
];

function subjectLabel(subject: string): string {
  switch (subject) {
    case "order":
      return "Order enquiry";
    case "delivery":
      return "Delivery";
    case "payment":
      return "Payment";
    case "returns":
      return "Returns & refunds";
    case "product":
      return "Product question";
    default:
      return "Something else";
  }
}

/**
 * Submit a contact message from the storefront contact page. Public visitors
 * are allowed to insert (RLS policy), but only as a brand-new enquiry; the
 * message is validated server-side and stored for staff review.
 */
export async function submitContactMessageAction(
  _previousState: ContactSubmitState,
  formData: FormData,
): Promise<ContactSubmitState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "The contact form is not available right now. Please try again later.",
    };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!isValidFullName(fullName)) {
    return { ok: false, message: "Please enter your full name." };
  }
  if (!isValidGhanaPhone(phone)) {
    return {
      ok: false,
      message: "Please enter a valid Ghana phone number (e.g. 024 412 3456).",
    };
  }
  if (email !== "" && !isValidEmail(email)) {
    return { ok: false, message: "Please enter a valid email address (or leave it empty)." };
  }
  if (!SUBJECTS.includes(subject)) {
    return { ok: false, message: "Please choose a subject." };
  }
  if (!isNonEmpty(message)) {
    return { ok: false, message: "Please write a short message." };
  }
  if (message.length < 10 || message.length > 4000) {
    return {
      ok: false,
      message: "Your message should be between 10 and 4000 characters.",
    };
  }
  if (fullName.length > 120 || phone.length > 20 || email.length > 254) {
    return { ok: false, message: "Some of your details are too long. Please shorten them." };
  }

  try {
    const client = await createClient();
    const { error } = await client.from("contact_messages").insert({
      full_name: fullName,
      phone,
      email: email === "" ? null : email,
      subject: subjectLabel(subject),
      message,
    });
    if (error) {
      return {
        ok: false,
        message: "We could not send your message. Please try again.",
      };
    }
  } catch {
    return {
      ok: false,
      message: "We could not send your message. Please try again.",
    };
  }

  return {
    ok: true,
    message:
      "Thank you! Your message has been received. Our team will get back to you shortly.",
  };
}