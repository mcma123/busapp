import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { useStore } from "@/demo/store";

export function ResetDemo({ trigger }: { trigger: React.ReactNode }) {
  const reset = useStore((s) => s.reset);
  const changes = useStore((s) => s.log.length);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><RotateCcw className="size-5 text-teal" /> Reset the demo?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes {changes === 1 ? "1 change" : `${changes} changes`} made in this browser (boardings, payments, pass replacements,
            exceptions and bus substitutions) and restores the original demo records. Other open tabs reset too.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep my changes</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => { reset(); toast.success("Demo reset to original records"); }}
          >
            Reset demo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
