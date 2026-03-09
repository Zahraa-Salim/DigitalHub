// File: frontend/src/utils/navigation.ts
// What this code does:
// 1) Provides shared frontend helpers and API client utilities.
// 2) Centralizes fetch, parsing, and cross-page helper logic.
// 3) Reduces duplicated behavior across pages/components.
// 4) Exports reusable functions consumed by app modules.
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
