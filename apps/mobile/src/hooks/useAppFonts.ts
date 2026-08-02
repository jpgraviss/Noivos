import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts as useBebasFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';

export function useAppFonts() {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [bebasLoaded] = useBebasFonts({ BebasNeue_400Regular });
  return interLoaded && bebasLoaded;
}
