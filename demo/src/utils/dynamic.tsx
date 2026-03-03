import React, { useEffect, useState } from "react";

type Loader<TProps> = () => Promise<{ default: React.ComponentType<TProps> }>;

const dynamic = <TProps extends Record<string, unknown>>(
  loader: Loader<TProps>,
  _options?: { ssr?: boolean }
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
