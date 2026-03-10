// File: frontend/src/utils/dynamic.tsx
// Purpose: Provides reusable frontend helpers for dynamic.
// It supports routing, state, or browser behavior shared by multiple components.

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

