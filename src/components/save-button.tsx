import { Button } from "@nextui-org/button";

import { SaveIcon } from "./icons";

export function SaveButton() {
  return (
    <Button isIconOnly className="bg-transparent">
      <SaveIcon className="text-default-500" />
    </Button>
  );
}
