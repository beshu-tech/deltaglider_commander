/**
 * ConnectionSheet - Integrates SideSheet with ConnectionPanel
 * Manages sheet open/close state and width persistence
 */

import { SideSheet } from "../../lib/ui/SideSheet";
import { ConnectionPanel } from "./ConnectionPanel";
import { useConnectionStore } from "../../stores/connectionStore";

export function ConnectionSheet() {
  const sheetOpen = useConnectionStore((state) => state.sheetOpen);
  const sheetWidth = useConnectionStore((state) => state.sheetWidth);
  const setSheetOpen = useConnectionStore((state) => state.setSheetOpen);
  const setSheetWidth = useConnectionStore((state) => state.setSheetWidth);

  return (
    <SideSheet
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      title="Connection"
      width={sheetWidth}
      onWidthChange={setSheetWidth}
      minWidth={320} // 20rem
      maxWidth={768} // 48rem
    >
      <ConnectionPanel />
    </SideSheet>
  );
}
