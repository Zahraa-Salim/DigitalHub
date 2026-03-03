import ResetPassword from "@/components/inner-pages/reset-password";
import Wrapper from "@/layouts/Wrapper";
import GuestOnly from "@/components/auth/GuestOnly";

export default function Page() {
  return (
    <Wrapper>
      <GuestOnly>
      <ResetPassword />
      </GuestOnly>
    </Wrapper>
  );
}

