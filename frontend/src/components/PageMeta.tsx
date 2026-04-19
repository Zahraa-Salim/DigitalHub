import { Helmet } from "react-helmet-async";

const SITE_NAME = "The Digital Hub";
const BASE_URL = "https://thedigitalhub.tech";
const DEFAULT_OG_IMAGE = `${BASE_URL}/favicon.png`;

type PageMetaProps = {
  title?: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
};

export function PageMeta({ title, description, canonicalPath, ogImage }: PageMetaProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonical = canonicalPath ? `${BASE_URL}${canonicalPath}` : undefined;
  const image = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {canonical && <link rel="canonical" href={canonical} />}
    </Helmet>
  );
}
