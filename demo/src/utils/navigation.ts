import {
  useLocation,
  useNavigate,
  useParams as useReactRouterParams,
  useSearchParams as useReactRouterSearchParams,
} from "react-router-dom";

export const usePathname = () => useLocation().pathname;

export const useSearchParams = () => {
  const [params] = useReactRouterSearchParams();
  return params;
};

export const useParams = useReactRouterParams;

export const useRouter = () => {
  const navigate = useNavigate();

  return {
    push: (to: string) => navigate(to),
    replace: (to: string) => navigate(to, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
  };
};
