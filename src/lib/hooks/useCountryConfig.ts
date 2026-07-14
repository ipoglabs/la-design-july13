import { useCountryStore } from "@/store/countryStore";
import { COUNTRY_CONFIGS } from "@/config";
import type { CountryConfig, CountryCode } from "@/config";

export function useCountryConfig(): {
  countryConfig: CountryConfig;
  countryCode: CountryCode;
  config: CountryConfig;
} {
  const country = useCountryStore((s) => s.country);

  const countryCode =
    ((country?.code ?? "sg").toLowerCase() as CountryCode);

  const countryConfig =
    COUNTRY_CONFIGS[countryCode] ?? COUNTRY_CONFIGS.sg;

  return {
    countryConfig,
    countryCode,
    config: countryConfig,
  };
}