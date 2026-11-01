import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";
import { ProfileView } from "./profile-view";
import { requireAccountSession } from "../gate";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Profile",
  description: "Update your TereaCOD profile details — display name and delivery contact, stored on your account.",
};

export default async function ProfilePage() {
  await requireAccountSession("/account/profile");
  return (
    <AccountPage
      title="Profile"
      eyebrow="Member area"
      lead="Update your display name and phone number. Email changes go through support."
    >
      <ProfileView />
    </AccountPage>
  );
}
