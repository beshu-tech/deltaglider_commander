/**
 * ConnectionSheet - Simplified side sheet for connection management
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
      title="Connection"
      width={sheetWidth}
      onWidthChange={setSheetWidth}
      minWidth={320}
      maxWidth={768}
    >
      <ConnectionPanel />
    </SideSheet>
  );
}
