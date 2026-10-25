import { useTranslations } from "next-intl";
import { Input } from "@heroui/input";
import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import DefaultLayout from "@/layouts/default";
import { getProfileName, setProfileName } from "@/util/name";
export default function ProfilePage() {
  const t = useTranslations("Profile");
  const nav = useTranslations("Nav");
  const c = useTranslations("Common");
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setName(getProfileName());
  }, []);
  return (
    <DefaultLayout>
      <section className="profile-panel space-y-5">
        <h1 className="page-title">{nav("Profile")}</h1>
        <Input
          label={t("name")}
          value={name}
          onValueChange={(value) => {
            setName(value);
            setSaved(false);
          }}
        />
        <Button
          isDisabled={!name.trim()}
          onPress={() => {
            setProfileName(name.trim());
            setSaved(true);
          }}
        >
          {c("save")}
        </Button>
        {saved && <p role="status">{t("saved")}</p>}
      </section>
    </DefaultLayout>
  );
}
