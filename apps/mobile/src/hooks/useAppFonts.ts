import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts as useFrauncesFonts, Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';

// Fraunces replaces Bebas Neue as of 2026-08-05 (see packages/ui/src/tokens.ts
// and PROJECT_MEMORY.md's Origin-direction repaint) — apps/web switched over
// the same day, this brings apps/mobile to font parity. Bebas Neue is no
// longer loaded; nothing in packages/ui references it anymore.
export function useAppFonts() {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [frauncesLoaded] = useFrauncesFonts({ Fraunces_500Medium, Fraunces_600SemiBold });
  return interLoaded && frauncesLoaded;
}
