import { Input } from "@heroui/input";
import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import DefaultLayout from "@/layouts/default";
import { getProfileName, setProfileName } from "@/util/name";
export default function ProfilePage() {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setName(getProfileName());
  }, []);
  return (
    <DefaultLayout>
      <section className="max-w-lg space-y-3">
        <Input
          label="Your Name"
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
          Save
        </Button>
        {saved && <p role="status">저장했습니다.</p>}
      </section>
    </DefaultLayout>
  );
}
