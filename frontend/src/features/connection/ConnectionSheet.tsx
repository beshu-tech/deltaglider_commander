/**
 * ConnectionSheet - Simplified side sheet for environment management
 * Uses local state for sheet open/close instead of global store
 */

import { useState } from "react";
import { SideSheet } from "../../lib/ui/SideSheet";
import { ConnectionPanel } from "./ConnectionPanel";

export function ConnectionSheet() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetWidth, setSheetWidth] = useState(400);

  return (
    <SideSheet
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      title="Environment"
      width={sheetWidth}
      onWidthChange={setSheetWidth}
      minWidth={320}
      maxWidth={768}
    >
      <ConnectionPanel />
    </SideSheet>
  );
}
