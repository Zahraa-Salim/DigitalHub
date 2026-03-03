import Login from "@/components/inner-pages/login";
import Wrapper from "@/layouts/Wrapper";
import GuestOnly from "@/components/auth/GuestOnly";


const index = () => {
  return (
    <Wrapper>
      <GuestOnly>
        <Login />
      </GuestOnly>
    </Wrapper>
  );
};

export default index;

