import { Input } from "@nextui-org/input";
import { useState } from "react";
import { Button } from "@nextui-org/button";

import DefaultLayout from "@/layouts/default";
import { getProfileName, setProfileName } from "@/util/name";

export default function ProfilePage() {
  const [name, setName] = useState(getProfileName());

  return (
    <DefaultLayout>
      <section className="relative w-full h-full gap-4">
        <div className="absolute w-1/4 h-full overflow-auto border-2 p-1">
          <iframe
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            height="315"
            referrerPolicy="strict-origin-when-cross-origin"
            src="https://www.youtube.com/embed/TET1UsSFbUQ?si=-90mH67EQqJ_euNY"
            title="YouTube video player"
            width="560"
          />
        </div>
        <div className="absolute left-1/4 w-3/4 h-full overflow-auto border-2 p-1 whitespace-pre break-words">
          <p>Your Name, Please</p>
          <Input className="w-60 py-1" value={name} onValueChange={setName} />
          <Button
            onClick={() => {
              setProfileName(name);
            }}
          >
            Save
          </Button>
        </div>
      </section>
    </DefaultLayout>
  );
}
