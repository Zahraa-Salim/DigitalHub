// File: frontend/src/utils/dynamic.tsx
// What this code does:
// 1) Provides shared frontend helpers and API client utilities.
// 2) Centralizes fetch, parsing, and cross-page helper logic.
// 3) Reduces duplicated behavior across pages/components.
// 4) Exports reusable functions consumed by app modules.
import React, { useEffect, useState } from "react";

type Loader<TProps> = () => Promise<{ default: React.ComponentType<TProps> }>;

const dynamic = <TProps extends Record<string, unknown>>(
  loader: Loader<TProps>
) => {
  const DynamicComponent = (props: TProps) => {
    const [Component, setComponent] = useState<React.ComponentType<TProps> | null>(
      null
    );

    useEffect(() => {
      let mounted = true;
      loader().then((mod) => {
        if (mounted) {
          setComponent(() => mod.default);
        }
      });
      return () => {
        mounted = false;
      };
    }, []);

    if (!Component) return null;
    return <Component {...props} />;
  };

  return DynamicComponent;
};

export default dynamic;
