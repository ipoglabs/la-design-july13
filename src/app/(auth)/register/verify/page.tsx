import { VerifyEmailStep } from "./VerifyEmailStep";

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function RegisterVerifyPage({ searchParams }: Props) {
  const { email = "" } = await searchParams;
  return <VerifyEmailStep email={decodeURIComponent(email)} />;
}
