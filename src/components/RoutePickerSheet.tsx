import { Map, Navigation } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

function openExternal(url: string) {
  // Use location.href to avoid blank WebView / white screen in PWA
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function openGoogleMaps(destination: string) {
  openExternal(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`);
}

function openWaze(destination: string) {
  openExternal(`https://waze.com/ul?q=${encodeURIComponent(destination)}`);
}

function openAppleMaps(destination: string) {
  openExternal(`https://maps.apple.com/?q=${encodeURIComponent(destination)}`);
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

interface RoutePickerSheetProps {
  open: boolean;
  onClose: () => void;
  destination: string;
}

export function RoutePickerSheet({ open, onClose, destination }: RoutePickerSheetProps) {
  const handleOpen = (fn: (d: string) => void) => {
    fn(destination);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Abrir rota com
          </SheetTitle>
          <SheetDescription>Escolha o aplicativo de navegação</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="h-14 justify-start gap-3 text-base"
            onClick={() => handleOpen(openGoogleMaps)}
          >
            <Map className="h-5 w-5 text-primary" />
            Google Maps
          </Button>

          <Button
            variant="outline"
            className="h-14 justify-start gap-3 text-base"
            onClick={() => handleOpen(openWaze)}
          >
            <Navigation className="h-5 w-5 text-primary" />
            Waze
          </Button>

          {isIOS() && (
            <Button
              variant="outline"
              className="h-14 justify-start gap-3 text-base"
              onClick={() => handleOpen(openAppleMaps)}
            >
              <Map className="h-5 w-5 text-primary" />
              Apple Maps
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
