import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(tabs)/(nutrition)" as any);
  }, []);

  return null;
}
